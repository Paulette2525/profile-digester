import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const imagePrompt = `Professional visual for a LinkedIn post. Theme: "${post.topic || 'professional content'}". Content: "${contentPreview}". Style: Clean, modern, professional infographic design for LinkedIn feed. Bold typography, modern blue/turquoise colors, minimalist design. Square format. Do NOT include long text, prefer visual metaphors. Any visible text must be in FRENCH.`;

    console.log("Generating image with Lovable AI for post:", post_id);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt,
          },
        ],
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

    // Extract base64 image from message.images array (Lovable AI format)
    let imageBase64: string | null = null;
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const imgUrl = message.images[0]?.image_url?.url;
      if (imgUrl?.startsWith("data:image/")) {
        imageBase64 = imgUrl.split(",")[1];
      }
    }

    if (!imageBase64) {
      console.error("AI response structure:", JSON.stringify(aiData).substring(0, 1000));
      throw new Error("No image data in AI response");
    }

    // Upload to Supabase storage
    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const fileName = `visuals/${post_id}-${Date.now()}.png`;

    const { error: uploadErr } = await supabase.storage
      .from("user-photos")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    const { data: urlData } = supabase.storage.from("user-photos").getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    console.log("Image generated and uploaded:", imageUrl.substring(0, 80));

    // Update post with image URL
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
