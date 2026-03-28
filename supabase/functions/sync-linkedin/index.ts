import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
        // Fetch posts from Unipile API for this profile
        const accountId = profile.unipile_account_id || profile.linkedin_url;
        
        const postsResponse = await fetch(
          `https://${UNIPILE_DSN}/api/v1/posts?account_id=${encodeURIComponent(accountId)}&limit=20`,
          {
            headers: {
              "X-API-KEY": UNIPILE_API_KEY,
              Accept: "application/json",
            },
          }
        );

        if (!postsResponse.ok) {
          console.error(`Failed to fetch posts for ${profile.name}: ${postsResponse.status}`);
          results.push({ profile: profile.name, status: "error", error: postsResponse.statusText });
          continue;
        }

        const postsData = await postsResponse.json();
        const items = postsData.items || postsData.data || [];

        for (const post of items) {
          const postId = post.id || post.post_id;
          
          // Upsert the post
          const { data: upsertedPost, error: postError } = await supabase
            .from("linkedin_posts")
            .upsert(
              {
                profile_id: profile.id,
                unipile_post_id: postId,
                content: post.text || post.content || "",
                post_url: post.url || post.share_url || null,
                likes_count: post.likes_count || post.reactions_count || 0,
                comments_count: post.comments_count || 0,
                shares_count: post.shares_count || post.reposts_count || 0,
                posted_at: post.created_at || post.date || null,
              },
              { onConflict: "unipile_post_id", ignoreDuplicates: false }
            )
            .select()
            .single();

          if (postError) {
            console.error(`Error upserting post: ${postError.message}`);
            continue;
          }

          // Try to fetch reactions/comments for this post
          if (upsertedPost) {
            try {
              const reactionsResponse = await fetch(
                `https://${UNIPILE_DSN}/api/v1/posts/${postId}/reactions?limit=50`,
                {
                  headers: {
                    "X-API-KEY": UNIPILE_API_KEY,
                    Accept: "application/json",
                  },
                }
              );

              if (reactionsResponse.ok) {
                const reactionsData = await reactionsResponse.json();
                const reactions = reactionsData.items || reactionsData.data || [];

                for (const reaction of reactions) {
                  await supabase.from("post_interactions").upsert({
                    post_id: upsertedPost.id,
                    interaction_type: "like",
                    author_name: reaction.author?.name || reaction.name || "Inconnu",
                    author_avatar_url: reaction.author?.avatar_url || null,
                    author_linkedin_url: reaction.author?.url || null,
                  });
                }
              }
            } catch (e) {
              console.error("Error fetching reactions:", e);
            }

            try {
              const commentsResponse = await fetch(
                `https://${UNIPILE_DSN}/api/v1/posts/${postId}/comments?limit=50`,
                {
                  headers: {
                    "X-API-KEY": UNIPILE_API_KEY,
                    Accept: "application/json",
                  },
                }
              );

              if (commentsResponse.ok) {
                const commentsData = await commentsResponse.json();
                const comments = commentsData.items || commentsData.data || [];

                for (const comment of comments) {
                  await supabase.from("post_interactions").upsert({
                    post_id: upsertedPost.id,
                    interaction_type: "comment",
                    author_name: comment.author?.name || comment.name || "Inconnu",
                    author_avatar_url: comment.author?.avatar_url || null,
                    author_linkedin_url: comment.author?.url || null,
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
