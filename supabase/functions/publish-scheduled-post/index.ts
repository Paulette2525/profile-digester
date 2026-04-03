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

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const TOLERANCE_MS = 6 * 60 * 1000; // 6 minutes
const DELAY_BETWEEN_POSTS_MS = 60 * 1000; // 60 seconds between posts

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    if (!UNIPILE_API_KEY || !UNIPILE_DSN) throw new Error("Unipile not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let singlePostId: string | null = null;
    try {
      const body = await req.json();
      singlePostId = body?.post_id || null;
    } catch { /* no body = cron call */ }

    let postsToPublish;
    if (singlePostId) {
      // Manual publish: no time restriction
      const { data } = await supabase
        .from("suggested_posts")
        .select("*")
        .eq("id", singlePostId)
        .in("status", ["draft", "scheduled"])
        .single();
      postsToPublish = data ? [data] : [];
    } else {
      // Cron mode: only posts within the tolerance window
      const now = new Date();
      const windowStart = new Date(now.getTime() - TOLERANCE_MS).toISOString();
      const windowEnd = now.toISOString();

      const { data } = await supabase
        .from("suggested_posts")
        .select("*")
        .eq("status", "scheduled")
        .gte("scheduled_at", windowStart)
        .lte("scheduled_at", windowEnd);
      postsToPublish = data || [];
    }

    if (postsToPublish.length === 0) {
      return new Response(JSON.stringify({ message: "No posts to publish" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = await getLinkedInAccountId(UNIPILE_DSN, UNIPILE_API_KEY);
    const results = [];

    for (let i = 0; i < postsToPublish.length; i++) {
      const post = postsToPublish[i];

      // Space out posts if more than one (except first)
      if (i > 0 && !singlePostId) {
        console.log(`Waiting ${DELAY_BETWEEN_POSTS_MS / 1000}s before next post...`);
        await sleep(DELAY_BETWEEN_POSTS_MS);
      }

      try {
        const formData = new FormData();
        formData.append("account_id", accountId);
        formData.append("text", post.content);

        let imageAttached = false;
        if (post.image_url && post.image_url.startsWith("http")) {
          try {
            const imgRes = await fetch(post.image_url);
            if (imgRes.ok) {
              const contentType = imgRes.headers.get("content-type") || "image/png";
              const mimeBase = contentType.split(";")[0].trim();
              const ext = MIME_EXT[mimeBase] || "png";
              const imgBlob = await imgRes.blob();
              const file = new File([imgBlob], `visual.${ext}`, { type: mimeBase });
              formData.append("attachments", file);
              imageAttached = true;
              console.log(`Image attached (${mimeBase}) for post: ${post.id}`);
            }
          } catch (imgErr) {
            console.error("Failed to attach image, publishing without it:", imgErr);
          }
        }

        const publishRes = await fetch(`https://${UNIPILE_DSN}/api/v1/posts`, {
          method: "POST",
          headers: {
            "X-API-KEY": UNIPILE_API_KEY,
            Accept: "application/json",
          },
          body: formData,
        });

        if (!publishRes.ok) {
          const errText = await publishRes.text();
          console.error(`Publish failed for ${post.id}: ${publishRes.status} - ${errText}`);

          // If image caused the error, retry without image
          if (imageAttached && publishRes.status === 400) {
            console.log(`Retrying post ${post.id} without image...`);
            const retryForm = new FormData();
            retryForm.append("account_id", accountId);
            retryForm.append("text", post.content);
            const retryRes = await fetch(`https://${UNIPILE_DSN}/api/v1/posts`, {
              method: "POST",
              headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
              body: retryForm,
            });
            if (!retryRes.ok) {
              const retryErr = await retryRes.text();
              results.push({ id: post.id, success: false, error: `Retry failed: ${retryErr}` });
              continue;
            }
            const retryData = await retryRes.json();
            await supabase.from("suggested_posts").update({
              status: "published",
              published_at: new Date().toISOString(),
              unipile_post_id: retryData.id || null,
            }).eq("id", post.id);
            results.push({ id: post.id, success: true, linkedin_post_id: retryData.id, note: "published without image" });
            continue;
          }

          results.push({ id: post.id, success: false, error: `${publishRes.status}: ${errText}` });
          continue;
        }

        const publishData = await publishRes.json();
        await supabase.from("suggested_posts").update({
          status: "published",
          published_at: new Date().toISOString(),
          unipile_post_id: publishData.id || null,
        }).eq("id", post.id);

        results.push({ id: post.id, success: true, linkedin_post_id: publishData.id });
      } catch (e) {
        console.error(`Error publishing ${post.id}:`, e);
        results.push({ id: post.id, success: false, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Publish error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
