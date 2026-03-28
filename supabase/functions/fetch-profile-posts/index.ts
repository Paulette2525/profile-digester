import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getLinkedInAccountId(dsn: string, apiKey: string): Promise<string> {
  const res = await fetch(`https://${dsn}/api/v1/accounts`, {
    headers: { "X-API-KEY": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
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
    if (!UNIPILE_API_KEY || !UNIPILE_DSN) throw new Error("Unipile not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { profile_id, max_pages = 2 } = await req.json();
    if (!profile_id) {
      return new Response(JSON.stringify({ error: "Missing profile_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("tracked_profiles").select("*").eq("id", profile_id).single();
    if (profileErr || !profile) throw new Error("Profile not found");

    const accountId = await getLinkedInAccountId(UNIPILE_DSN, UNIPILE_API_KEY);

    const urlParts = profile.linkedin_url.replace(/\/$/, "").split("/");
    let providerId = profile.unipile_account_id || urlParts[urlParts.length - 1];

    if (!profile.unipile_account_id) {
      try {
        const userRes = await fetch(
          `https://${UNIPILE_DSN}/api/v1/users/${encodeURIComponent(providerId)}?account_id=${encodeURIComponent(accountId)}`,
          { headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" }, signal: AbortSignal.timeout(15000) }
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
      let url = `https://${UNIPILE_DSN}/api/v1/users/${encodeURIComponent(providerId)}/posts?account_id=${encodeURIComponent(accountId)}&limit=50`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

      const postsRes = await fetch(url, {
        headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
        signal: AbortSignal.timeout(25000),
      });

      if (!postsRes.ok) {
        console.error(`Posts fetch failed: ${postsRes.status}`);
        break;
      }

      const postsData = await postsRes.json();
      const items = postsData.items || postsData.data || [];
      if (items.length === 0) break;

      // Build batch for upsert
      const batch = items.map((post: any) => {
        const postId = post.id || post.post_id || post.social_id;
        const { media_urls, media_type } = extractMedia(post);
        return {
          profile_id: profile.id,
          user_id: profile.user_id,
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
      }).filter((p: any) => p.unipile_post_id && p.unipile_post_id !== "undefined");

      if (batch.length > 0) {
        const { error: upsertErr } = await supabase
          .from("linkedin_posts")
          .upsert(batch, { onConflict: "unipile_post_id,profile_id" });
        if (upsertErr) console.error("Upsert error:", upsertErr);
      }

      totalPosts += batch.length;
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
