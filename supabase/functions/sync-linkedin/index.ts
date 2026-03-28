import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getLinkedInAccountId(dsn: string, apiKey: string): Promise<string> {
  const res = await fetch(`https://${dsn}/api/v1/accounts`, {
    headers: { "X-API-KEY": apiKey, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to list accounts: ${res.status}`);
  const data = await res.json();
  const items = data.items || [];
  const linkedin = items.find((a: any) => a.type === "LINKEDIN");
  if (!linkedin) throw new Error("No LinkedIn account connected in Unipile");
  return linkedin.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    if (!UNIPILE_API_KEY || !UNIPILE_DSN) {
      throw new Error("UNIPILE_API_KEY or UNIPILE_DSN not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const accountId = await getLinkedInAccountId(UNIPILE_DSN, UNIPILE_API_KEY);

    // Get all tracked profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("tracked_profiles")
      .select("*");

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No profiles to sync" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const profile of profiles) {
      try {
        // Extract LinkedIn identifier from URL
        const urlParts = profile.linkedin_url.replace(/\/$/, "").split("/");
        const identifier = urlParts[urlParts.length - 1];

        // First, try to get the user's profile to get their provider_id
        const profileRes = await fetch(
          `https://${UNIPILE_DSN}/api/v1/users/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(accountId)}`,
          {
            headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
          }
        );

        let providerId = identifier;
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          providerId = profileData.provider_id || profileData.id || identifier;

          // Update profile info if available
          if (profileData.name || profileData.first_name) {
            await supabase
              .from("tracked_profiles")
              .update({
                name: profileData.name || `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || profile.name,
                avatar_url: profileData.profile_picture_url || profileData.avatar_url || profile.avatar_url,
                headline: profileData.headline || profile.headline,
                unipile_account_id: providerId,
              })
              .eq("id", profile.id);
          }
        }

        // Fetch posts from Unipile using the user's provider_id
        const postsResponse = await fetch(
          `https://${UNIPILE_DSN}/api/v1/posts?account_id=${encodeURIComponent(accountId)}&author_id=${encodeURIComponent(providerId)}&limit=20`,
          {
            headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
          }
        );

        if (!postsResponse.ok) {
          const errText = await postsResponse.text();
          console.error(`Failed to fetch posts for ${profile.name}: ${postsResponse.status} - ${errText}`);
          results.push({ profile: profile.name, status: "error", error: `${postsResponse.status}` });
          continue;
        }

        const postsData = await postsResponse.json();
        const items = postsData.items || postsData.data || [];

        for (const post of items) {
          const postId = post.id || post.post_id;

          // Check if post exists
          const { data: existing } = await supabase
            .from("linkedin_posts")
            .select("id")
            .eq("unipile_post_id", String(postId))
            .eq("profile_id", profile.id)
            .maybeSingle();

          const postData = {
            profile_id: profile.id,
            unipile_post_id: String(postId),
            content: post.text || post.content || "",
            post_url: post.url || post.share_url || null,
            likes_count: post.likes_count || post.reactions_count || 0,
            comments_count: post.comments_count || 0,
            shares_count: post.shares_count || post.reposts_count || 0,
            posted_at: post.created_at || post.date || null,
          };

          let savedPostId: string;

          if (existing) {
            await supabase
              .from("linkedin_posts")
              .update(postData)
              .eq("id", existing.id);
            savedPostId = existing.id;
          } else {
            const { data: inserted } = await supabase
              .from("linkedin_posts")
              .insert(postData)
              .select("id")
              .single();
            savedPostId = inserted?.id || "";
          }

          // Fetch comments for this post
          if (savedPostId) {
            try {
              const commentsRes = await fetch(
                `https://${UNIPILE_DSN}/api/v1/posts/${postId}/comments?account_id=${encodeURIComponent(accountId)}&limit=50`,
                { headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" } }
              );
              if (commentsRes.ok) {
                const commentsData = await commentsRes.json();
                for (const comment of (commentsData.items || [])) {
                  await supabase.from("post_interactions").insert({
                    post_id: savedPostId,
                    interaction_type: "comment",
                    author_name: comment.author?.name || comment.name || "Inconnu",
                    author_avatar_url: comment.author?.profile_picture_url || null,
                    author_linkedin_url: comment.author?.public_profile_url || null,
                    comment_text: comment.text || comment.content || "",
                  });
                }
              }
            } catch (e) {
              console.error("Error fetching comments:", e);
            }
          }
        }

        results.push({ profile: profile.name, status: "ok", postsCount: items.length });
      } catch (e) {
        console.error(`Error syncing ${profile.name}:`, e);
        results.push({ profile: profile.name, status: "error", error: String(e) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
