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

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { analysis_id, count = 5, topic } = await req.json();
    if (!analysis_id) throw new Error("Missing analysis_id");

    const { data: analysis, error: aErr } = await supabase.from("virality_analyses").select("*").eq("id", analysis_id).single();
    if (aErr || !analysis) throw new Error("Analysis not found");
    if (analysis.status !== "done") throw new Error("Analysis not complete");

    const factors = analysis.analysis_json;

    const { data: memory } = await supabase.from("user_memory").select("*").limit(1).maybeSingle();
    const { data: photos } = await supabase.from("user_photos").select("*");
    const { data: ideas } = await supabase.from("content_ideas").select("*").eq("used", false).limit(count);

    let memoryContext = "";
    if (memory) {
      const m = memory as any;
      memoryContext = `\n\nINFORMATIONS SUR L'AUTEUR:
- Nom: ${m.full_name || "Non renseigné"}
- Profession: ${m.profession || "Non renseigné"}
- Entreprise: ${m.company || "Non renseigné"}
- Industrie: ${m.industry || "Non renseigné"}
- Audience cible: ${m.target_audience || "Non renseigné"}
- Problèmes de l'audience: ${m.audience_pain_points || "Non renseigné"}
- Offres/Services: ${m.offers_description || "Non renseigné"}
- Ambitions: ${m.ambitions || "Non renseigné"}
- Valeurs: ${m.values || "Non renseigné"}
- Ton de voix: ${m.tone_of_voice || "Non renseigné"}
- Thèmes: ${(m.content_themes as string[])?.join(", ") || "Non renseigné"}
- Piliers de contenu: ${(m.content_pillars as string[])?.join(", ") || "Non renseigné"}
- Mots-clés de marque: ${(m.brand_keywords as string[])?.join(", ") || "Non renseigné"}
- Types de contenu: ${(m.content_types as string[])?.join(", ") || "Non renseigné"}
- Histoire personnelle: ${m.personal_story || "Non renseigné"}
- Domaines d'expertise: ${m.expertise_areas || "Non renseigné"}
- Réalisations majeures: ${m.achievements || "Non renseigné"}
- Résultats marquants: ${m.key_results || "Non renseigné"}
- Méthodologie unique: ${m.unique_methodology || "Non renseigné"}
- Ce qui le différencie: ${m.differentiators || "Non renseigné"}
- Style de CTA: ${m.call_to_action_style || "Non renseigné"}
- Formats préférés: ${m.preferred_formats || "Non renseigné"}
- Concurrents/Leaders: ${m.competitors || "Non renseigné"}
- Objectifs LinkedIn: ${m.linkedin_goals || "Non renseigné"}
- Objectif abonnés: ${m.target_followers || "Non défini"}
- Objectif engagement: ${m.target_engagement_rate ? m.target_engagement_rate + "%" : "Non défini"}
- Horizon: ${m.goal_timeline || "Non défini"}
- Notes: ${m.additional_notes || "Non renseigné"}

IMPORTANT: Utilise ces informations pour créer des posts qui positionnent l'auteur comme LEADER dans son domaine. Les posts doivent refléter son expertise, ses réalisations et ses résultats concrets. Le ton doit correspondre exactement à celui de l'auteur. Chaque post doit contribuer à atteindre ses objectifs LinkedIn.`;
    }

    let ideasContext = "";
    if (ideas && ideas.length > 0) {
      ideasContext = `\n\nIDÉES DE PUBLICATIONS À INTÉGRER:\n${ideas.map((i: any, idx: number) => `${idx + 1}. ${i.idea_text}${i.image_url ? " [IMAGE ASSOCIÉE]" : ""}`).join("\n")}
\nIntègre ces idées dans les posts générés. Si une idée a une [IMAGE ASSOCIÉE], le post correspondant doit utiliser cette image.`;
    }

    let photosContext = "";
    if (photos && photos.length > 0) {
      photosContext = `\n\nL'auteur dispose de ${photos.length} photo(s) personnelles. Pour certains posts, suggère l'utilisation d'une photo personnelle en mettant "use_personal_photo": true.`;
    }

    const prompt = `Tu es un expert copywriter LinkedIn spécialisé dans le personal branding et la viralité. En te basant sur l'analyse de viralité suivante, génère ${count} publications LinkedIn ORIGINALES, UNIQUES et conçues pour MAXIMISER la viralité et positionner l'auteur comme un LEADER.

ANALYSE DE VIRALITÉ:
${JSON.stringify(factors, null, 2)}

${topic ? `THÈME SOUHAITÉ: ${topic}` : "Propose des thèmes variés et stratégiques."}${memoryContext}${ideasContext}${photosContext}

RÈGLES IMPORTANTES:
- Chaque post doit être UNIQUE et ne PAS copier les exemples analysés
- Utilise les facteurs de viralité identifiés (hooks, structure, CTA, mots-clés)
- Longueur optimale selon l'analyse
- Inclure des emojis de manière naturelle
- Chaque post doit avoir un hook d'accroche puissant sur la première ligne
- Varier les structures (storytelling, liste, question, provocation, témoignage)
- Inclure un CTA clair à la fin
- Écrire en français
${memory ? "- Les posts doivent refléter la personnalité, l'expertise, les réalisations et le ton de l'auteur\n- Intégrer ses résultats concrets et sa méthodologie unique pour renforcer sa crédibilité\n- Utiliser ses mots-clés de marque naturellement" : ""}

Pour chaque post: contenu complet, topic/thème, score de viralité estimé (1-100)${photos && photos.length > 0 ? ", use_personal_photo (boolean)" : ""}.`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4",
        messages: [
          { role: "system", content: "Tu es un copywriter LinkedIn expert en personal branding. Génère des posts viraux en JSON." },
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

    const photoUrls = photos?.map((p: any) => p.image_url) || [];
    const ideaImages = (ideas || []).filter((i: any) => i.image_url).map((i: any) => i.image_url);

    const toInsert = generatedPosts.map((p, idx) => {
      const usePhoto = p.use_personal_photo && photoUrls.length > 0;
      const ideaImage = ideaImages[idx] || null;
      return {
        content: p.content,
        topic: p.topic,
        virality_score: Math.min(100, Math.max(0, Math.round(p.virality_score))),
        source_analysis_id: analysis_id,
        status: "draft",
        image_url: ideaImage || (usePhoto ? photoUrls[Math.floor(Math.random() * photoUrls.length)] : null),
      };
    });

    const { data: saved, error: sErr } = await supabase.from("suggested_posts").insert(toInsert).select("*");
    if (sErr) throw sErr;

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
