import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODEL = "google/gemini-3.1-flash-image-preview";

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

// === RANDOM VARIATION POOLS (for edit mode on viral/storytelling) ===
const environments = [
  "a sunlit Parisian café terrace with wrought-iron chairs and espresso cups",
  "a sleek modern rooftop overlooking a city skyline at dusk",
  "a lush zen garden with stone pathways and bamboo water features",
  "a creative studio filled with art canvases, warm Edison bulbs, and exposed brick",
  "a grand old library with leather-bound books and oak reading tables",
  "a beachside boardwalk at sunrise with golden sand and gentle waves",
  "a contemporary co-working space with floor-to-ceiling windows and plants",
  "a mountain lodge with panoramic views of snow-capped peaks",
  "a vibrant street market with colorful stalls and warm ambient light",
  "a minimalist Scandinavian apartment with white walls and natural wood",
];

const lightings = [
  "golden hour sunlight streaming from the left, creating warm rim lighting and long soft shadows",
  "dramatic blue hour twilight with deep indigo skies and city lights reflecting",
  "soft overcast diffused light creating even, gentle illumination without harsh shadows",
  "high-contrast studio lighting with a single key light creating sculptural shadows",
  "rainy day with moody atmospheric light filtering through rain-streaked windows",
  "early morning dawn with pink and orange tones breaking through mist",
  "candlelit warm glow with intimate, low-key lighting and soft bokeh highlights",
  "bright midday Mediterranean sun with vivid colors and crisp shadows",
];

const outfits = [
  "wearing an elegant tailored navy suit with a crisp white shirt, no tie",
  "dressed in casual chic: premium black turtleneck and well-fitted jeans",
  "sporting a sophisticated earth-toned blazer over a simple crew-neck tee",
  "in relaxed weekend style: linen shirt rolled at the sleeves, natural tones",
  "wearing a sleek all-black ensemble with a leather jacket and minimalist accessories",
  "dressed in smart-casual: oxford button-down, chinos, and clean white sneakers",
  "in creative professional attire: patterned shirt, dark vest, confident accessories",
  "wearing a warm knit sweater in rich burgundy, comfortable and approachable",
];

const moods = [
  "looking confidently at the camera with a genuine, warm smile",
  "captured mid-gesture while speaking passionately, eyes lit up with conviction",
  "gazing thoughtfully into the distance, contemplating a big decision",
  "laughing naturally, caught in an authentic moment of joy",
  "leaning forward with focused intensity, deeply engaged in conversation",
  "standing tall with arms crossed, exuding quiet authority and calm confidence",
  "walking purposefully through the scene, mid-stride, dynamic energy",
  "sitting relaxed with one hand on chin, intellectual curiosity radiating",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildImagePrompt(post: any): string {
  const contentPreview = (post.content || "").substring(0, 500);
  const topic = post.topic || "professional development";
  const postType = inferPostType(post);

  const photoRules = `STRICT RULES: Absolutely NO text, NO typography, NO watermarks, NO logos, NO captions, NO overlays anywhere in the image. Pure photography only. The image must look like it was shot by a professional photographer with 10+ years of experience using a full-frame camera.`;

  const infographicRules = `STRICT RULES: NO photographs of real humans, NO realistic faces, NO photographic portraits. You MAY and SHOULD include: brand logos, company names, key figures/numbers, text labels, data visualizations, icons, diagrams. The visual must be a clean, professional INFOGRAPHIC or ILLUSTRATION — NOT a photograph.`;

  if (postType === "tutorial") {
    return `Create a clean, modern infographic-style visual that illustrates this tutorial topic: "${topic}".

Post content for full context: "${contentPreview}"

DESIGN DIRECTION: Create a Dribbble-quality flat illustration that visually explains the tutorial step-by-step. Use:
- Flat design icons and symbols directly related to the specific topic
- Numbered steps with arrows showing the workflow/process
- If the tutorial mentions a specific tool (Notion, ChatGPT, Canva, etc.), include its LOGO prominently
- Key figures, percentages, or metrics mentioned in the content as bold typography
- Visual hierarchy with a clear focal point
- Clean white or soft gradient background (#f8f9fa to #e9ecef)
- Bold accent colors: electric blue (#2563eb), coral (#f97316), or emerald (#10b981)
- Subtle grid or dot pattern in the background for depth

STYLE: Think Infographic + Editorial Design hybrid. Like a premium slide from a tech company keynote. Flat vectors, rounded corners, soft shadows, modern sans-serif typography for labels. NO 3D renders, NO stock photo style.

${infographicRules}`;
  }

  if (postType === "news" || postType === "news_analysis") {
    return `Create a professional news-style infographic visual for this headline: "${topic}".

Post content for full context: "${contentPreview}"

DESIGN DIRECTION: Create a Bloomberg/TechCrunch-style editorial graphic that tells the news story visually:
- Feature the company/brand LOGO prominently (e.g., OpenAI logo for OpenAI news, Google logo for Google news)
- Show KEY FIGURES in bold, large typography (funding amounts, percentages, user numbers)
- Use contextual ICONS: rocket for launches, chart for growth, shield for security, globe for expansion
- Data visualization elements: mini bar charts, trend arrows, comparison blocks
- Dark or deep gradient background (#0f172a to #1e293b) with vibrant accent colors (#3b82f6, #22d3ee, #a78bfa)
- News-style layout: headline zone at top, visual data in center, context icons around
- Subtle tech-grid or circuit-board pattern in background

STYLE: Think Bloomberg Terminal meets Apple Keynote slide. Premium, authoritative, data-rich. Bold sans-serif typography (like Inter or SF Pro). Clean geometric shapes. NO photographs, NO realistic scenes.

${infographicRules}`;
  }

  if (postType === "viral") {
    return `Create an emotionally striking, award-winning photojournalism-style photograph that captures the essence of: "${topic}".

Post content for context: "${contentPreview}"

SCENE DIRECTION: This must be a visually arresting image that stops people mid-scroll. Capture a powerful human moment — determination, breakthrough, vulnerability, or triumph — directly connected to the specific topic. The image should evoke immediate emotional response. Show a real, authentic scene that feels unposed and raw.

PHOTOGRAPHY SPECS: Shot on Leica Q3, 28mm f/1.7, available light only — dramatic chiaroscuro effect. Cinematic color grading with rich blacks and lifted shadows. Slightly desaturated with one warm highlight color. Documentary-style composition — slightly off-center, dynamic angles, sense of movement. Grain reminiscent of ISO 3200. The kind of image that wins World Press Photo awards.

${photoRules}`;
  }

  if (postType === "storytelling") {
    return `Create a deeply atmospheric, cinematic photograph that captures a pivotal life moment related to: "${topic}".

Post content for context: "${contentPreview}"

SCENE DIRECTION: Visualize the specific story being told. If it's about a career pivot, show a contemplative moment at a crossroads. If about failure and resilience, show someone rising from adversity. The scene must feel intimate, personal, and directly connected to the narrative. Think National Geographic meets LinkedIn — authentic humanity in a professional context.

PHOTOGRAPHY SPECS: Shot on Fujifilm GFX 100S, 80mm f/1.7, golden hour natural light creating long warm shadows and rim lighting on the subject. Film-like color science with rich warm tones, slight fade in shadows. Shallow depth of field with dreamy bokeh. Composition feels candid and unscripted — as if capturing a decisive moment. Nostalgic yet modern aesthetic.

${photoRules}`;
  }

  // personal_branding fallback — infographic style
  return `Create a polished professional infographic visual related to: "${topic}".

Post content for context: "${contentPreview}"

DESIGN DIRECTION: Create a clean, modern visual that illustrates the topic with icons, symbols, and text labels. Use brand colors, professional layout, and data visualization elements if applicable. Style: premium LinkedIn carousel slide aesthetic.

${infographicRules}`;
}

function buildEditPrompt(post: any): string {
  const topic = post.topic || "professional";
  const contentPreview = (post.content || "").substring(0, 400);
  const postType = inferPostType(post);

  // Randomize environment, lighting, outfit, mood for EVERY call
  const env = pick(environments);
  const light = pick(lightings);
  const outfit = pick(outfits);
  const mood = pick(moods);

  const baseEditRules = `CRITICAL: Keep the person's face and body completely natural and recognizable — do NOT alter facial features or body proportions. Do NOT add any text, typography, watermarks, or logos. The result must look like a real photograph, not AI-generated.`;

  if (postType === "viral") {
    return `Transform this photo into a powerful, emotionally impactful editorial shot. Place the person in ${env}. They should be ${mood}, ${outfit}. Apply ${light}. The mood should feel raw, authentic and intensely connected to "${topic}". Cinematic color grading with slightly desaturated tones and one warm accent. Context: "${contentPreview}". ${baseEditRules}`;
  }

  if (postType === "storytelling") {
    return `Transform this photo into an atmospheric, cinematic shot that tells a story. Place the person in ${env}. They should be ${mood}, ${outfit}. Apply ${light}. The scene should feel intimate and deeply personal — like capturing a decisive life moment related to "${topic}". Film-like color science with rich tones and a gentle fade in the shadows. Context: "${contentPreview}". ${baseEditRules}`;
  }

  // Fallback (shouldn't be called for other types, but just in case)
  return `Enhance this photo with professional editorial lighting and cinematic color grading. Place the person in ${env}, ${outfit}, ${mood}. Apply ${light}. The mood should match "${topic}". Context: "${contentPreview}". ${baseEditRules}`;
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

    // ONLY search user photos for viral and storytelling types
    let userPhotoUrl: string | null = null;
    const usePersonalPhoto = postType === "viral" || postType === "storytelling";

    if (usePersonalPhoto && userId) {
      // First try category-specific photos
      const { data: userPhotos } = await supabase
        .from("user_photos")
        .select("image_url")
        .eq("user_id", userId)
        .eq("photo_category", postType)
        .order("created_at", { ascending: false })
        .limit(10);

      if (userPhotos && userPhotos.length > 0) {
        userPhotoUrl = userPhotos[Math.floor(Math.random() * userPhotos.length)].image_url;
      }

      // Fallback: general photos (no category)
      if (!userPhotoUrl) {
        const { data: generalPhotos } = await supabase
          .from("user_photos")
          .select("image_url")
          .eq("user_id", userId)
          .is("photo_category", null)
          .order("created_at", { ascending: false })
          .limit(10);

        if (generalPhotos && generalPhotos.length > 0) {
          userPhotoUrl = generalPhotos[Math.floor(Math.random() * generalPhotos.length)].image_url;
        }
      }
    }

    let imageBase64: string | null = null;

    // Mode 1: Edit-image using user's photo — ONLY for viral/storytelling
    if (userPhotoUrl) {
      console.log("Using edit-image mode with user photo for post:", post_id, "type:", postType);
      const editPrompt = buildEditPrompt(post);

      try {
        const editResponse = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: AI_MODEL,
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
            console.log("Edit-image succeeded for type:", postType);
          }
        }
      } catch (editErr) {
        console.warn("Edit-image failed, falling back to generation:", editErr);
      }
    }

    // Mode 2: Generate from scratch (for tutorial, news, personal_branding, or fallback)
    if (!imageBase64) {
      const imagePrompt = buildImagePrompt(post);
      console.log("Generating image from scratch for post:", post_id, "type:", postType);

      const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
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
