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

function inferPostType(post: any): string {
  const type = post.post_type;
  if (type) return type;
  const text = `${post.topic || ""} ${(post.content || "").substring(0, 500)}`.toLowerCase();
  if (/histoire|parcours|vécu|témoignage|raconte|souvenir|leçon de vie/i.test(text)) return "storytelling";
  if (/astuce|étape|comment|tuto|guide|méthode|framework/i.test(text)) return "tutorial";
  if (/actualité|étude|rapport|tendance|chiffre|statistique|news|annonce/i.test(text)) return "news";
  if (/viral|buzz|incroyable|choquant|surprenant/i.test(text)) return "viral";
  return "personal_branding";
}

function buildImagePrompt(post: any): string {
  const contentPreview = (post.content || "").substring(0, 200);
  const topic = post.topic || "professional";
  const postType = inferPostType(post);

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

function buildEditPrompt(post: any): string {
  const topic = post.topic || "professional";
  const contentPreview = (post.content || "").substring(0, 150);
  const postType = inferPostType(post);

  if (postType === "viral") {
    return `Transform this photo into a powerful, emotionally impactful editorial shot. Add dramatic cinematic lighting, strong depth of field, and professional color grading. Keep the person natural and authentic. Do not add any text or typography. Context: "${topic}" — "${contentPreview}"`;
  }
  if (postType === "storytelling") {
    return `Enhance this photo with warm golden hour atmosphere, soft documentary-style lighting. Make it feel like an authentic candid life moment. Keep the person natural and genuine. Do not add any text or typography. Context: "${topic}" — "${contentPreview}"`;
  }
  return `Enhance this photo with professional editorial lighting and cinematic atmosphere. Keep it natural and authentic. Do not add any text. Context: "${topic}"`;
}

function extractBase64Image(aiData: any): string | null {
  const message = aiData.choices?.[0]?.message;
  if (!message) return null;

  if (message.images && Array.isArray(message.images)) {
    for (const img of message.images) {
      const url = img?.image_url?.url;
      if (url?.startsWith("data:image/")) return url.split(",")[1];
    }
  }

  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part?.type === "image_url" && part?.image_url?.url?.startsWith("data:image/")) {
        return part.image_url.url.split(",")[1];
      }
      if (part?.inline_data?.data) return part.inline_data.data;
    }
  }

  if (typeof message.content === "string") {
    const match = message.content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
    if (match) return match[1];
  }

  return null;
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

    const postType = inferPostType(post);
    const userId = post.user_id;

    // Try to find a user photo for edit-image mode (viral/storytelling)
    let userPhotoUrl: string | null = null;
    if (userId && (postType === "viral" || postType === "storytelling")) {
      const { data: userPhotos } = await supabase
        .from("user_photos")
        .select("image_url")
        .eq("user_id", userId)
        .eq("photo_category", postType)
        .order("created_at", { ascending: false })
        .limit(10);

      if (userPhotos && userPhotos.length > 0) {
        // Pick a random photo from the user's collection
        userPhotoUrl = userPhotos[Math.floor(Math.random() * userPhotos.length)].image_url;
      }
    }

    // Also check general photos if no category-specific ones found
    if (!userPhotoUrl && userId && (postType === "viral" || postType === "storytelling")) {
      const { data: generalPhotos } = await supabase
        .from("user_photos")
        .select("image_url")
        .eq("user_id", userId)
        .is("photo_category", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (generalPhotos && generalPhotos.length > 0) {
        userPhotoUrl = generalPhotos[Math.floor(Math.random() * generalPhotos.length)].image_url;
      }
    }

    let imageBase64: string | null = null;

    // Mode 1: Edit-image using user's photo as base
    if (userPhotoUrl) {
      console.log("Using edit-image mode with user photo for post:", post_id);
      const editPrompt = buildEditPrompt(post);

      try {
        const editResponse = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: editPrompt },
                { type: "image_url", image_url: { url: userPhotoUrl } },
              ],
            }],
            modalities: ["image", "text"],
          }),
        });

        if (editResponse.ok) {
          const editData = await editResponse.json();
          imageBase64 = extractBase64Image(editData);
          if (imageBase64) {
            console.log("Edit-image succeeded, using user photo variant");
          }
        }
      } catch (editErr) {
        console.warn("Edit-image failed, falling back to generation:", editErr);
      }
    }

    // Mode 2: Generate from scratch (fallback)
    if (!imageBase64) {
      const imagePrompt = buildImagePrompt(post);
      console.log("Generating image from scratch for post:", post_id, "type:", postType || "unknown");

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
      imageBase64 = extractBase64Image(aiData);
    }

    if (!imageBase64) {
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
