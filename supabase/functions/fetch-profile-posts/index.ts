import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getLinkedInAccountId(dsn: string, apiKey: string): Promise<string> {
  const res = await fetch(`https://${dsn}/api/v1/accounts`, {
    headers: { "X-API-KEY": apiKey, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to list accounts: ${res.status}`);
  const data = await res.json();
  const linkedin = (data.items || []).find((a: any) => a.type === "LINKEDIN");
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
    if (!UNIPILE_API_KEY || !UNIPILE_DSN) throw new Error("Unipile not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { profile_id, max_pages = 5 } = await req.json();
    if (!profile_id) {
      return new Response(JSON.stringify({ error: "Missing profile_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profile
    const { data: profile, error: profileErr } = await supabase
      .from("tracked_profiles")
      .select("*")
      .eq("id", profile_id)
      .single();
    if (profileErr || !profile) throw new Error("Profile not found");

    const accountId = await getLinkedInAccountId(UNIPILE_DSN, UNIPILE_API_KEY);

    // Resolve provider ID
    const urlParts = profile.linkedin_url.replace(/\/$/, "").split("/");
    let providerId = profile.unipile_account_id || urlParts[urlParts.length - 1];

    // Try to resolve via Unipile user lookup
    if (!profile.unipile_account_id) {
      try {
        const userRes = await fetch(
          `https://${UNIPILE_DSN}/api/v1/users/${encodeURIComponent(providerId)}?account_id=${encodeURIComponent(accountId)}`,
          { headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" } }
        );
        if (userRes.ok) {
          const userData = await userRes.json();
          providerId = userData.provider_id || userData.id || providerId;
          await supabase.from("tracked_profiles").update({ unipile_account_id: providerId }).eq("id", profile.id);
        }
      } catch (_) { /* keep existing providerId */ }
    }

    let totalPosts = 0;
    let cursor: string | null = null;

    for (let page = 0; page < max_pages; page++) {
      let url = `https://${UNIPILE_DSN}/api/v1/posts?account_id=${encodeURIComponent(accountId)}&author_id=${encodeURIComponent(providerId)}&limit=100`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

      const postsRes = await fetch(url, {
        headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
      });

      if (!postsRes.ok) {
        console.error(`Posts fetch failed: ${postsRes.status} ${await postsRes.text()}`);
        break;
      }

      const postsData = await postsRes.json();
      const items = postsData.items || postsData.data || [];
      if (items.length === 0) break;

      for (const post of items) {
        const postId = post.id || post.post_id;
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

        const { data: existing } = await supabase
          .from("linkedin_posts")
          .select("id")
          .eq("unipile_post_id", String(postId))
          .eq("profile_id", profile.id)
          .maybeSingle();

        let savedPostId: string;
        if (existing) {
          await supabase.from("linkedin_posts").update(postData).eq("id", existing.id);
          savedPostId = existing.id;
        } else {
          const { data: inserted } = await supabase
            .from("linkedin_posts").insert(postData).select("id").single();
          savedPostId = inserted?.id || "";
        }

        // Fetch comments
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
          } catch (e) { console.error("Comments error:", e); }
        }

        totalPosts++;
      }

      cursor = postsData.cursor || postsData.next_cursor || null;
      if (!cursor) break;
    }

    return new Response(JSON.stringify({ success: true, total_posts: totalPosts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch profile posts error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
