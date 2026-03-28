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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    if (!UNIPILE_API_KEY || !UNIPILE_DSN) throw new Error("Unipile not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for optional single post_id in body
    let singlePostId: string | null = null;
    try {
      const body = await req.json();
      singlePostId = body?.post_id || null;
    } catch { /* no body = cron call */ }

    let postsToPublish;
    if (singlePostId) {
      const { data } = await supabase
        .from("suggested_posts")
        .select("*")
        .eq("id", singlePostId)
        .in("status", ["draft", "scheduled"])
        .single();
      postsToPublish = data ? [data] : [];
    } else {
      // Cron: get all scheduled posts where scheduled_at <= now
      const { data } = await supabase
        .from("suggested_posts")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_at", new Date().toISOString());
      postsToPublish = data || [];
    }

    if (postsToPublish.length === 0) {
      return new Response(JSON.stringify({ message: "No posts to publish" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = await getLinkedInAccountId(UNIPILE_DSN, UNIPILE_API_KEY);
    const results = [];

    for (const post of postsToPublish) {
      try {
        // Publish via Unipile (requires multipart/form-data)
        const formData = new FormData();
        formData.append("account_id", accountId);
        formData.append("text", post.content);

        // Attach image if available
        if (post.image_url && post.image_url.startsWith("http")) {
          try {
            const imgRes = await fetch(post.image_url);
            if (imgRes.ok) {
              const imgBlob = await imgRes.blob();
              formData.append("media", imgBlob, "visual.png");
              console.log("Image attached to post:", post.id);
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
          results.push({ id: post.id, success: false, error: `${publishRes.status}: ${errText}` });
          continue;
        }

        const publishData = await publishRes.json();

        await supabase.from("suggested_posts").update({
          status: "published",
          published_at: new Date().toISOString(),
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
