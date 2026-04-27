import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    const authHeader = req.headers.get("authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Not authenticated");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) throw new Error("Invalid token");

    const { data: memory } = await supabase.from("user_memory").select("*").eq("user_id", user.id).maybeSingle();
    const { data: analyses } = await supabase.from("virality_analyses").select("analysis_json").eq("user_id", user.id).eq("status", "done").order("created_at", { ascending: false }).limit(3);
    const { data: publishedPosts } = await supabase.from("suggested_posts").select("content, topic, virality_score, post_performance").eq("user_id", user.id).eq("status", "published").order("created_at", { ascending: false }).limit(20);
    const { data: ideas } = await supabase.from("content_ideas").select("idea_text").eq("user_id", user.id).eq("used", false).limit(10);

    const topPosts = (publishedPosts || [])
      .filter((p: any) => p.post_performance)
      .sort((a: any, b: any) => {
        const s = (x: any) => (x.post_performance?.likes || 0) * 2 + (x.post_performance?.comments || 0) * 3 + (x.post_performance?.shares || 0) * 5;
        return s(b) - s(a);
      }).slice(0, 10);

    const prompt = `Tu es un stratège LinkedIn de renommée mondiale. Génère 3 VARIANTES de stratégie de contenu personnalisées.

## PROFIL UTILISATEUR
${memory ? `
- Nom: ${memory.full_name || "Non renseigné"}
- Profession: ${memory.profession || "Non renseigné"}
- Industrie: ${memory.industry || "Non renseigné"}
- Audience cible: ${memory.target_audience || "Non renseigné"}
- Objectifs LinkedIn: ${memory.linkedin_goals || "Non renseigné"}
- Ton de voix: ${memory.tone_of_voice || "Non renseigné"}
- Piliers de contenu: ${(memory.content_pillars || []).join(", ") || "Non renseigné"}
- Réalisations: ${memory.achievements || "Non renseigné"}
- Différenciateurs: ${memory.differentiators || "Non renseigné"}
- Points de douleur audience: ${memory.audience_pain_points || "Non renseigné"}
- Fréquence de publication: ${memory.posting_frequency || "Non renseigné"}
- Ambitions: ${memory.ambitions || "Non renseigné"}
` : "Aucune mémoire renseignée."}

## ANALYSES DE VIRALITÉ
${analyses?.length ? analyses.map((a: any, i: number) => `Analyse ${i + 1}: ${JSON.stringify(a.analysis_json).substring(0, 400)}`).join("\n") : "Aucune analyse."}

## TOP POSTS
${topPosts.length ? topPosts.map((p: any, i: number) => `Post ${i + 1}: "${(p.content || "").substring(0, 150)}..." | L:${p.post_performance?.likes || 0} C:${p.post_performance?.comments || 0}`).join("\n") : "Aucun post publié."}

## IDÉES
${ideas?.length ? ideas.map((i: any) => `- ${i.idea_text}`).join("\n") : "Aucune idée."}

Génère exactement 3 variantes de stratégie :
1. **Agressive** : 5-7 posts/semaine, focus viralité maximale, storytelling + contenu provocateur/opinion
2. **Équilibrée** : 3-5 posts/semaine, mix storytelling/tuto/news/viral/social proof
3. **Autoritaire** : 2-3 posts/semaine, thought leadership, contenu expert profond

Chaque variante doit inclure des types de contenu diversifiés : Storytelling, Viral (hooks forts), Tuto/How-to, News/Actualités, Social Proof (résultats, témoignages).`;

    const aiBody = JSON.stringify({
        model: "anthropic/claude-sonnet-4.5",
        messages: [
          { role: "system", content: "Tu génères des stratégies de contenu LinkedIn en JSON structuré." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_strategies",
            description: "Create 3 LinkedIn content strategy variants",
            parameters: {
              type: "object",
              properties: {
                variants: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      variant_name: { type: "string" },
                      variant_emoji: { type: "string" },
                      frequency: { type: "string" },
                      summary: { type: "string" },
                      positioning: { type: "string" },
                      content_pillars: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            percentage: { type: "number" },
                            description: { type: "string" },
                            content_type: { type: "string" }
                          },
                          required: ["name", "percentage", "description", "content_type"]
                        }
                      },
                      weekly_calendar: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            day: { type: "string" },
                            type: { type: "string" },
                            suggestion: { type: "string" }
                          },
                          required: ["day", "type", "suggestion"]
                        }
                      },
                      winning_formats: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            format: { type: "string" },
                            recommendation: { type: "string" }
                          },
                          required: ["format", "recommendation"]
                        }
                      },
                      themes_to_explore: { type: "array", items: { type: "string" } },
                      recycling_opportunities: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            original_post_excerpt: { type: "string" },
                            new_angle: { type: "string" },
                            why: { type: "string" }
                          },
                          required: ["original_post_excerpt", "new_angle", "why"]
                        }
                      }
                    },
                    required: ["variant_name", "variant_emoji", "frequency", "summary", "positioning", "content_pillars", "weekly_calendar", "winning_formats", "themes_to_explore", "recycling_opportunities"]
                  }
                }
              },
              required: ["variants"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "create_strategies" } },
      });

    // Retry up to 2 times on 502/503
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: aiBody,
      });
      if (response.status !== 502 && response.status !== 503) break;
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }

    if (!response!.ok) {
      if (response!.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response!.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response!.status}`);
    }

    const aiData = await response!.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let strategyData;
    if (toolCall?.function?.arguments) {
      strategyData = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      throw new Error("No strategy generated");
    }

    // Upsert strategy with all variants
    const { data: existing } = await supabase.from("content_strategy").select("id").eq("user_id", user.id).maybeSingle();
    const strategyJson = { variants: strategyData.variants, selected_variant: null };

    if (existing) {
      await supabase.from("content_strategy").update({ strategy_json: strategyJson, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("content_strategy").insert({ user_id: user.id, strategy_json: strategyJson });
    }

    return new Response(JSON.stringify({ success: true, strategy: strategyJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate strategy error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
