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

function parseDate(raw: any): string | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractMedia(post: any): { media_urls: any[]; media_type: string } {
  const urls: any[] = [];

  // Check various Unipile media fields
  if (post.images && Array.isArray(post.images)) {
    for (const img of post.images) {
      urls.push({ type: "image", url: typeof img === "string" ? img : img.url || img.src });
    }
  }
  if (post.media && Array.isArray(post.media)) {
    for (const m of post.media) {
      const type = m.type || (m.video_url ? "video" : "image");
      urls.push({ type, url: m.url || m.video_url || m.src || m.image_url });
    }
  }
  if (post.attachments && Array.isArray(post.attachments)) {
    for (const a of post.attachments) {
      const type = a.type || "article";
      urls.push({ type, url: a.url || a.link || a.image_url, title: a.title });
    }
  }
  // Single image/video fields
  if (post.image_url && urls.length === 0) {
    urls.push({ type: "image", url: post.image_url });
  }
  if (post.video_url) {
    urls.push({ type: "video", url: post.video_url });
  }

  const filtered = urls.filter(u => u.url);
  const hasVideo = filtered.some(u => u.type === "video");
  const hasImage = filtered.some(u => u.type === "image");
  const media_type = hasVideo ? "video" : hasImage ? "image" : filtered.length > 0 ? "article" : "none";

  return { media_urls: filtered, media_type };
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

    const { data: profile, error: profileErr } = await supabase
      .from("tracked_profiles")
      .select("*")
      .eq("id", profile_id)
      .single();
    if (profileErr || !profile) throw new Error("Profile not found");

    const accountId = await getLinkedInAccountId(UNIPILE_DSN, UNIPILE_API_KEY);

    const urlParts = profile.linkedin_url.replace(/\/$/, "").split("/");
    let providerId = profile.unipile_account_id || urlParts[urlParts.length - 1];

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
        } else {
          await userRes.text();
        }
      } catch (_) { /* keep existing providerId */ }
    }

    let totalPosts = 0;
    let cursor: string | null = null;

    for (let page = 0; page < max_pages; page++) {
      let url = `https://${UNIPILE_DSN}/api/v1/users/${encodeURIComponent(providerId)}/posts?account_id=${encodeURIComponent(accountId)}&limit=100`;
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
        const { media_urls, media_type } = extractMedia(post);

        const postData = {
          profile_id: profile.id,
          unipile_post_id: String(postId),
          content: post.text || post.content || "",
          post_url: post.url || post.share_url || null,
          likes_count: post.likes_count || post.reactions_count || post.num_likes || 0,
          comments_count: post.comments_count || post.num_comments || 0,
          shares_count: post.shares_count || post.reposts_count || post.num_shares || 0,
          posted_at: parseDate(post.created_at || post.date),
          media_urls,
          media_type,
        };

        const { data: existing } = await supabase
          .from("linkedin_posts")
          .select("id")
          .eq("unipile_post_id", String(postId))
          .eq("profile_id", profile.id)
          .maybeSingle();

        let savedPostId: string;
        if (existing) {
          const { error: updateErr } = await supabase.from("linkedin_posts").update(postData).eq("id", existing.id);
          if (updateErr) console.error("Update error:", updateErr);
          savedPostId = existing.id;
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from("linkedin_posts").insert(postData).select("id").single();
          if (insertErr) console.error("Insert error:", insertErr);
          savedPostId = inserted?.id || "";
        }

        // Fetch comments with deduplication
        if (savedPostId) {
          try {
            const commentsRes = await fetch(
              `https://${UNIPILE_DSN}/api/v1/posts/${postId}/comments?account_id=${encodeURIComponent(accountId)}&limit=50`,
              { headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" } }
            );
            if (commentsRes.ok) {
              const commentsData = await commentsRes.json();
              for (const comment of (commentsData.items || [])) {
                const commentId = comment.id || comment.comment_id;
                const commentData = {
                  post_id: savedPostId,
                  interaction_type: "comment",
                  author_name: comment.author?.name || comment.name || "Inconnu",
                  author_avatar_url: comment.author?.profile_picture_url || comment.author?.avatar_url || null,
                  author_linkedin_url: comment.author?.public_profile_url || comment.author?.profile_url || null,
                  comment_text: comment.text || comment.content || "",
                  unipile_comment_id: commentId ? String(commentId) : null,
                };

                if (commentId) {
                  // Upsert by checking existing
                  const { data: existingComment } = await supabase
                    .from("post_interactions")
                    .select("id")
                    .eq("post_id", savedPostId)
                    .eq("unipile_comment_id", String(commentId))
                    .maybeSingle();

                  if (existingComment) {
                    await supabase.from("post_interactions").update(commentData).eq("id", existingComment.id);
                  } else {
                    await supabase.from("post_interactions").insert(commentData);
                  }
                } else {
                  await supabase.from("post_interactions").insert(commentData);
                }
              }
            } else {
              await commentsRes.text();
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
