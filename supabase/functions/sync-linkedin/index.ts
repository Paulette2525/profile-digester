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
  const relMatch = String(raw).match(/^(\d+)(m|h|d|w|mo|yr)$/);
  if (relMatch) {
    const [, num, unit] = relMatch;
    const n = parseInt(num);
    const now = new Date();
    switch (unit) {
      case "m": now.setMinutes(now.getMinutes() - n); break;
      case "h": now.setHours(now.getHours() - n); break;
      case "d": now.setDate(now.getDate() - n); break;
      case "w": now.setDate(now.getDate() - n * 7); break;
      case "mo": now.setMonth(now.getMonth() - n); break;
      case "yr": now.setFullYear(now.getFullYear() - n); break;
    }
    return now.toISOString();
  }
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getNum(val: any): number {
  const n = typeof val === "number" ? val : parseInt(val);
  return isNaN(n) ? 0 : n;
}

function extractMedia(post: any): { media_urls: any[]; media_type: string } {
  const urls: any[] = [];
  if (post.attachments && Array.isArray(post.attachments)) {
    for (const a of post.attachments) {
      const rawType = a.type || "";
      const type = rawType === "img" ? "image" : rawType === "video" ? "video" : rawType || "article";
      urls.push({ type, url: a.url || a.link || a.image_url, title: a.title, id: a.id });
    }
  }
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
  if (post.image_url && urls.length === 0) urls.push({ type: "image", url: post.image_url });
  if (post.video_url) urls.push({ type: "video", url: post.video_url });

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
    if (!UNIPILE_API_KEY || !UNIPILE_DSN) throw new Error("UNIPILE_API_KEY or UNIPILE_DSN not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const accountId = await getLinkedInAccountId(UNIPILE_DSN, UNIPILE_API_KEY);

    const { data: profiles, error: profilesError } = await supabase.from("tracked_profiles").select("*");
    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const profile of profiles) {
      try {
        const urlParts = profile.linkedin_url.replace(/\/$/, "").split("/");
        const identifier = urlParts[urlParts.length - 1];

        const profileRes = await fetch(
          `https://${UNIPILE_DSN}/api/v1/users/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(accountId)}`,
          { headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" } }
        );

        let providerId = identifier;
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          providerId = profileData.provider_id || profileData.id || identifier;
          if (profileData.name || profileData.first_name) {
            await supabase.from("tracked_profiles").update({
              name: profileData.name || `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || profile.name,
              avatar_url: profileData.profile_picture_url || profileData.avatar_url || profile.avatar_url,
              headline: profileData.headline || profile.headline,
              unipile_account_id: providerId,
            }).eq("id", profile.id);
          }
        } else {
          await profileRes.text();
        }

        const postsResponse = await fetch(
          `https://${UNIPILE_DSN}/api/v1/users/${encodeURIComponent(providerId)}/posts?account_id=${encodeURIComponent(accountId)}&limit=20`,
          { headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" } }
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
          const postId = post.id || post.post_id || post.social_id;
          const { media_urls, media_type } = extractMedia(post);

          const postData = {
            profile_id: profile.id,
            unipile_post_id: String(postId),
            content: post.text || post.content || "",
            post_url: post.share_url || post.url || null,
            likes_count: getNum(post.reaction_counter ?? post.likes_count ?? post.reactions_count ?? post.num_likes),
            comments_count: getNum(post.comment_counter ?? post.comments_count ?? post.num_comments),
            shares_count: getNum(post.repost_counter ?? post.shares_count ?? post.reposts_count ?? post.num_shares),
            impressions_count: getNum(post.impressions_counter ?? post.views_count ?? post.impressions),
            posted_at: parseDate(post.date || post.created_at),
            media_urls,
            media_type,
          };

          const { data: existing } = await supabase
            .from("linkedin_posts").select("id")
            .eq("unipile_post_id", String(postId))
            .eq("profile_id", profile.id)
            .maybeSingle();

          let savedPostId: string;
          if (existing) {
            await supabase.from("linkedin_posts").update(postData).eq("id", existing.id);
            savedPostId = existing.id;
          } else {
            const { data: inserted } = await supabase.from("linkedin_posts").insert(postData).select("id").single();
            savedPostId = inserted?.id || "";
          }

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
                    const { data: existingComment } = await supabase
                      .from("post_interactions").select("id")
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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
