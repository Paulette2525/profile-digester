import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, options);
    if (res.ok || (res.status !== 502 && res.status !== 503)) return res;
    if (i < retries) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  return fetch(url, options);
}

function buildImagePrompt(post: any): string {
  const contentPreview = (post.content || "").substring(0, 200);
  const topic = post.topic || "professional";
  const postType = post.post_type || "";

  const baseStyle = "Photorealistic, editorial photography style, natural lighting, high resolution, shot on professional camera, no text overlays, no typography, no watermarks, no logos";

  if (postType === "news_analysis" || postType === "news") {
    return `${baseStyle}. Professional editorial magazine-style photograph related to: "${topic}". Context: "${contentPreview}". Style: clean corporate environment, modern office or tech setting, professional atmosphere, warm natural light.`;
  }
  if (postType === "tutorial") {
    return `${baseStyle}. Realistic workspace photograph showing a professional environment related to: "${topic}". Context: "${contentPreview}". Style: clean desk setup, modern workspace, laptop or tools in frame, depth of field, warm ambient lighting.`;
  }
  if (postType === "viral") {
    return `${baseStyle}. Emotionally powerful photojournalism-style photograph related to: "${topic}". Context: "${contentPreview}". Style: dramatic lighting, candid moment, strong visual impact, human emotion, cinematic composition.`;
  }
  if (postType === "storytelling") {
    return `${baseStyle}. Atmospheric lifestyle photograph capturing a moment of personal journey related to: "${topic}". Context: "${contentPreview}". Style: warm golden hour lighting, authentic candid moment, depth and mood, documentary style.`;
  }

  return `${baseStyle}. Professional photograph related to: "${topic}". Context: "${contentPreview}". Clean composition, modern setting, professional atmosphere.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    const imagePrompt = buildImagePrompt(post);
    console.log("Generating image for post:", post_id, "type:", (post as any).post_type || "unknown");

    const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, réessayez plus tard" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      throw new Error(`AI gateway error: ${response.status} - ${errText}`);
    }

    const aiData = await response.json();
    const message = aiData.choices?.[0]?.message;

    console.log("AI response keys:", JSON.stringify({
      hasImages: !!message?.images,
      imagesLength: message?.images?.length,
      contentType: typeof message?.content,
      contentIsArray: Array.isArray(message?.content),
    }));

    let imageBase64: string | null = null;

    if (!imageBase64 && message?.images && Array.isArray(message.images)) {
      for (const img of message.images) {
        const url = img?.image_url?.url;
        if (url?.startsWith("data:image/")) {
          imageBase64 = url.split(",")[1];
          console.log("Found image via message.images");
          break;
        }
      }
    }

    if (!imageBase64 && Array.isArray(message?.content)) {
      for (const part of message.content) {
        if (part?.type === "image_url" && part?.image_url?.url?.startsWith("data:image/")) {
          imageBase64 = part.image_url.url.split(",")[1];
          break;
        }
        if (part?.inline_data?.data) {
          imageBase64 = part.inline_data.data;
          break;
        }
      }
    }

    if (!imageBase64 && typeof message?.content === "string") {
      const match = message.content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
      if (match) imageBase64 = match[1];
    }

    if (!imageBase64) {
      console.error("No image found. Full response (truncated):", JSON.stringify(aiData).substring(0, 2000));
      throw new Error("No image data in AI response");
    }

    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const fileName = `visuals/${post_id}-${Date.now()}.png`;

    const { error: uploadErr } = await supabase.storage
      .from("user-photos")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    const { data: urlData } = supabase.storage.from("user-photos").getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    await supabase
      .from("suggested_posts")
      .update({ image_url: imageUrl })
      .eq("id", post_id);

    console.log("Visual generated:", imageUrl.substring(0, 80));

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
