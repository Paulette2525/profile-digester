import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KIE_API_BASE = "https://api.kie.ai/api/v1/jobs";

async function pollTaskResult(taskId: string, apiKey: string, maxAttempts = 30): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${KIE_API_BASE}/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Task poll failed: ${res.status}`);
    const data = await res.json();
    const state = data.data?.state;

    if (state === "success") {
      const resultJson = typeof data.data.resultJson === "string"
        ? JSON.parse(data.data.resultJson)
        : data.data.resultJson;
      const urls = resultJson?.resultUrls || resultJson?.result_urls || [];
      if (urls.length > 0) return urls[0];
      throw new Error("No result URL in completed task");
    }

    if (state === "fail") {
      throw new Error(`Task failed: ${data.data?.failMsg || "Unknown error"}`);
    }

    // Wait 3 seconds before next poll
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error("Task timed out after polling");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY");
    if (!KIE_AI_API_KEY) throw new Error("KIE_AI_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { post_id } = await req.json();
    if (!post_id) throw new Error("Missing post_id");

    const { data: post, error: postErr } = await supabase
      .from("suggested_posts")
      .select("*")
      .eq("id", post_id)
      .single();
    if (postErr || !post) throw new Error("Post not found");

    const contentPreview = post.content.substring(0, 300);
    const imagePrompt = `Professional LinkedIn post visual. Topic: "${post.topic || 'professional content'}". Content: "${contentPreview}". Style: Clean, modern, professional infographic suitable for LinkedIn feed. Bold typography, modern blue/teal colors, minimal design. Square format. Do NOT include long text, focus on visual metaphors.`;

    console.log("Creating Kie AI task for post:", post_id);

    // Step 1: Create the task
    const createRes = await fetch(`${KIE_API_BASE}/createTask`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KIE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nano-banana-2",
        input: {
          prompt: imagePrompt,
          aspect_ratio: "1:1",
          resolution: "1K",
          output_format: "png",
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      if (createRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit Kie AI, réessayez plus tard" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Kie AI createTask error: ${createRes.status} - ${errText}`);
    }

    const createData = await createRes.json();
    const taskId = createData.data?.taskId || createData.taskId;
    if (!taskId) throw new Error("No taskId returned from Kie AI");

    console.log("Kie AI task created:", taskId, "- polling for result...");

    // Step 2: Poll for result
    const imageUrl = await pollTaskResult(taskId, KIE_AI_API_KEY);

    console.log("Image generated successfully:", imageUrl.substring(0, 80));

    // Step 3: Store the image URL
    await supabase
      .from("suggested_posts")
      .update({ image_url: imageUrl })
      .eq("id", post_id);

    return new Response(JSON.stringify({ success: true, image_url: imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate visual error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
