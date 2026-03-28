import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const prompt = `Tu es un expert copywriter LinkedIn. En te basant sur l'analyse de viralité suivante, génère ${count} publications LinkedIn ORIGINALES et UNIQUES.

ANALYSE DE VIRALITÉ:
${JSON.stringify(factors, null, 2)}

${topic ? `THÈME SOUHAITÉ: ${topic}` : "Propose des thèmes variés et pertinents."}

RÈGLES IMPORTANTES:
- Chaque post doit être UNIQUE et ne PAS copier les exemples analysés
- Utilise les facteurs de viralité identifiés (hooks, structure, CTA, mots-clés)
- Longueur optimale selon l'analyse
- Inclure des emojis de manière naturelle
- Chaque post doit avoir un hook d'accroche puissant sur la première ligne
- Varier les structures (storytelling, liste, question, provocation, témoignage)
- Inclure un CTA clair à la fin
- Écrire en français

Pour chaque post, fournis: le contenu complet, un topic/thème, et un score de viralité estimé (1-100).`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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

    // Save to DB
    const toInsert = generatedPosts.map(p => ({
      content: p.content,
      topic: p.topic,
      virality_score: Math.min(100, Math.max(0, Math.round(p.virality_score))),
      source_analysis_id: analysis_id,
      status: "draft",
    }));

    const { data: saved, error: sErr } = await supabase
      .from("suggested_posts")
      .insert(toInsert)
      .select("*");
    if (sErr) throw sErr;

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
