import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { analysis_id, count = 5, topic } = await req.json();
    if (!analysis_id) throw new Error("Missing analysis_id");

    const { data: analysis, error: aErr } = await supabase
      .from("virality_analyses")
      .select("*")
      .eq("id", analysis_id)
      .single();
    if (aErr || !analysis) throw new Error("Analysis not found");
    if (analysis.status !== "done") throw new Error("Analysis not complete");

    const factors = analysis.analysis_json;

    // Fetch user memory for personalization
    const { data: memory } = await supabase.from("user_memory").select("*").limit(1).maybeSingle();
    const { data: photos } = await supabase.from("user_photos").select("*");
    const { data: ideas } = await supabase.from("content_ideas").select("*").eq("used", false).limit(count);

    let memoryContext = "";
    if (memory) {
      memoryContext = `\n\nINFORMATIONS SUR L'AUTEUR:
- Nom: ${memory.full_name || "Non renseigné"}
- Profession: ${memory.profession || "Non renseigné"}
- Entreprise: ${memory.company || "Non renseigné"}
- Industrie: ${memory.industry || "Non renseigné"}
- Audience cible: ${memory.target_audience || "Non renseigné"}
- Offres/Services: ${memory.offers_description || "Non renseigné"}
- Ambitions: ${memory.ambitions || "Non renseigné"}
- Valeurs: ${(memory as any).values || "Non renseigné"}
- Ton de voix: ${memory.tone_of_voice || "Non renseigné"}
- Thèmes de contenu: ${(memory.content_themes as string[])?.join(", ") || "Non renseigné"}
- Types de contenu: ${(memory.content_types as string[])?.join(", ") || "Non renseigné"}
- Histoire personnelle: ${memory.personal_story || "Non renseigné"}
- Domaines d'expertise: ${memory.expertise_areas || "Non renseigné"}
- Formats préférés: ${memory.preferred_formats || "Non renseigné"}
- Notes additionnelles: ${memory.additional_notes || "Non renseigné"}

IMPORTANT: Utilise ces informations pour rendre chaque post authentique et personnel. Le ton doit correspondre à celui de l'auteur.`;
    }

    let ideasContext = "";
    if (ideas && ideas.length > 0) {
      ideasContext = `\n\nIDÉES DE PUBLICATIONS À INTÉGRER:\n${ideas.map((i: any, idx: number) => `${idx + 1}. ${i.idea_text}`).join("\n")}
\nEssaie d'intégrer ces idées dans les posts générés quand c'est pertinent.`;
    }

    let photosContext = "";
    if (photos && photos.length > 0) {
      photosContext = `\n\nL'auteur dispose de ${photos.length} photo(s) personnelles. Pour certains posts, suggère l'utilisation d'une photo personnelle en mettant "use_personal_photo": true dans la réponse.`;
    }

    const prompt = `Tu es un expert copywriter LinkedIn. En te basant sur l'analyse de viralité suivante, génère ${count} publications LinkedIn ORIGINALES et UNIQUES.

ANALYSE DE VIRALITÉ:
${JSON.stringify(factors, null, 2)}

${topic ? `THÈME SOUHAITÉ: ${topic}` : "Propose des thèmes variés et pertinents."}${memoryContext}${ideasContext}${photosContext}

RÈGLES IMPORTANTES:
- Chaque post doit être UNIQUE et ne PAS copier les exemples analysés
- Utilise les facteurs de viralité identifiés (hooks, structure, CTA, mots-clés)
- Longueur optimale selon l'analyse
- Inclure des emojis de manière naturelle
- Chaque post doit avoir un hook d'accroche puissant sur la première ligne
- Varier les structures (storytelling, liste, question, provocation, témoignage)
- Inclure un CTA clair à la fin
- Écrire en français
${memory ? "- Les posts doivent refléter la personnalité, l'expertise et le ton de l'auteur" : ""}

Pour chaque post, fournis: le contenu complet, un topic/thème, un score de viralité estimé (1-100)${photos && photos.length > 0 ? ", et use_personal_photo (boolean)" : ""}.`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4",
        messages: [
          { role: "system", content: "Tu es un copywriter LinkedIn expert. Génère des posts viraux en JSON." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_posts",
            description: "Generate LinkedIn posts",
            parameters: {
              type: "object",
              properties: {
                posts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      content: { type: "string" },
                      topic: { type: "string" },
                      virality_score: { type: "number" },
                      use_personal_photo: { type: "boolean" },
                    },
                    required: ["content", "topic", "virality_score"],
                  },
                },
              },
              required: ["posts"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_posts" } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit, réessayez plus tard" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Crédits AI épuisés" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiRes.json();
    let generatedPosts: any[];

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      generatedPosts = parsed.posts || [];
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { posts: [] };
      generatedPosts = parsed.posts || [];
    }

    // Pick a random personal photo for posts that suggest it
    const photoUrls = photos?.map((p: any) => p.image_url) || [];

    const toInsert = generatedPosts.map(p => {
      const usePhoto = p.use_personal_photo && photoUrls.length > 0;
      return {
        content: p.content,
        topic: p.topic,
        virality_score: Math.min(100, Math.max(0, Math.round(p.virality_score))),
        source_analysis_id: analysis_id,
        status: "draft",
        image_url: usePhoto ? photoUrls[Math.floor(Math.random() * photoUrls.length)] : null,
      };
    });

    const { data: saved, error: sErr } = await supabase
      .from("suggested_posts")
      .insert(toInsert)
      .select("*");
    if (sErr) throw sErr;

    // Mark used ideas
    if (ideas && ideas.length > 0) {
      const ideaIds = ideas.map((i: any) => i.id);
      await supabase.from("content_ideas").update({ used: true }).in("id", ideaIds);
    }

    return new Response(JSON.stringify({ success: true, posts: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate posts error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
