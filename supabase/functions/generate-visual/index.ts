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

    const contentPreview = post.content.substring(0, 300);
    const imagePrompt = `Create a professional LinkedIn visual. Theme: "${post.topic || 'professional'}". Context: "${contentPreview}". Style: Clean, modern infographic, bold typography, blue/turquoise palette, minimalist. Square format. Prefer visual metaphors over text. Any text must be in FRENCH.`;

    console.log("Generating image for post:", post_id);

    const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
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

    // Log response structure for debugging
    console.log("AI response keys:", JSON.stringify({
      hasImages: !!message?.images,
      imagesLength: message?.images?.length,
      contentType: typeof message?.content,
      contentIsArray: Array.isArray(message?.content),
    }));

    let imageBase64: string | null = null;

    // Method 1: message.images array (Lovable AI standard format)
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

    // Method 2: message.content as array of parts (multimodal response)
    if (!imageBase64 && Array.isArray(message?.content)) {
      for (const part of message.content) {
        if (part?.type === "image_url" && part?.image_url?.url?.startsWith("data:image/")) {
          imageBase64 = part.image_url.url.split(",")[1];
          console.log("Found image via content parts (image_url)");
          break;
        }
        if (part?.inline_data?.data) {
          imageBase64 = part.inline_data.data;
          console.log("Found image via content parts (inline_data)");
          break;
        }
      }
    }

    // Method 3: message.content as string containing data URI
    if (!imageBase64 && typeof message?.content === "string") {
      const match = message.content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
      if (match) {
        imageBase64 = match[1];
        console.log("Found image via content string data URI");
      }
    }

    if (!imageBase64) {
      console.error("No image found. Full response (truncated):", JSON.stringify(aiData).substring(0, 2000));
      throw new Error("No image data in AI response");
    }

    // Upload to storage
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
