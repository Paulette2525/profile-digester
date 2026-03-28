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

    const authHeader = req.headers.get("authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user from JWT
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Not authenticated");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) throw new Error("Invalid token");

    // Fetch user memory
    const { data: memory } = await supabase
      .from("user_memory")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch virality analyses
    const { data: analyses } = await supabase
      .from("virality_analyses")
      .select("analysis_json")
      .eq("user_id", user.id)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch top performing published posts
    const { data: publishedPosts } = await supabase
      .from("suggested_posts")
      .select("content, topic, virality_score, post_performance")
      .eq("user_id", user.id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(20);

    // Sort by engagement to find top performers
    const topPosts = (publishedPosts || [])
      .filter((p: any) => p.post_performance)
      .sort((a: any, b: any) => {
        const scoreA = (a.post_performance?.likes || 0) * 2 + (a.post_performance?.comments || 0) * 3 + (a.post_performance?.shares || 0) * 5;
        const scoreB = (b.post_performance?.likes || 0) * 2 + (b.post_performance?.comments || 0) * 3 + (b.post_performance?.shares || 0) * 5;
        return scoreB - scoreA;
      })
      .slice(0, 10);

    // Fetch content ideas
    const { data: ideas } = await supabase
      .from("content_ideas")
      .select("idea_text")
      .eq("user_id", user.id)
      .eq("used", false)
      .limit(10);

    const prompt = `Tu es un stratège LinkedIn de renommée mondiale. Analyse les données suivantes et génère une stratégie de contenu ultra-personnalisée pour dominer LinkedIn.

## PROFIL UTILISATEUR
${memory ? `
- Nom: ${memory.full_name || "Non renseigné"}
- Profession: ${memory.profession || "Non renseigné"}
- Industrie: ${memory.industry || "Non renseigné"}
- Audience cible: ${memory.target_audience || "Non renseigné"}
- Objectifs LinkedIn: ${memory.linkedin_goals || "Non renseigné"}
- Ton de voix: ${memory.tone_of_voice || "Non renseigné"}
- Piliers de contenu: ${(memory.content_pillars || []).join(", ") || "Non renseigné"}
- Thèmes: ${(memory.content_themes || []).join(", ") || "Non renseigné"}
- Réalisations: ${memory.achievements || "Non renseigné"}
- Méthodologie unique: ${memory.unique_methodology || "Non renseigné"}
- Résultats clés: ${memory.key_results || "Non renseigné"}
- Différenciateurs: ${memory.differentiators || "Non renseigné"}
- Points de douleur audience: ${memory.audience_pain_points || "Non renseigné"}
- Style CTA: ${memory.call_to_action_style || "Non renseigné"}
- Fréquence de publication: ${memory.posting_frequency || "Non renseigné"}
- Formats préférés: ${memory.preferred_formats || "Non renseigné"}
- Ambitions: ${memory.ambitions || "Non renseigné"}
- Objectif abonnés: ${memory.target_followers || "Non renseigné"}
- Objectif connexions: ${memory.target_connections || "Non renseigné"}
- Objectif taux engagement: ${memory.target_engagement_rate || "Non renseigné"}%
- Timeline objectifs: ${memory.goal_timeline || "Non renseigné"}
` : "Aucune mémoire renseignée."}

## ANALYSES DE VIRALITÉ (patterns identifiés)
${analyses && analyses.length > 0 ? analyses.map((a: any, i: number) => `Analyse ${i + 1}: ${JSON.stringify(a.analysis_json).substring(0, 500)}`).join("\n") : "Aucune analyse disponible."}

## TOP POSTS PERFORMANTS
${topPosts.length > 0 ? topPosts.map((p: any, i: number) => `Post ${i + 1}: "${(p.content || "").substring(0, 200)}..." | Likes: ${p.post_performance?.likes || 0}, Comments: ${p.post_performance?.comments || 0}, Shares: ${p.post_performance?.shares || 0}`).join("\n") : "Aucun post publié avec performances."}

## IDÉES DE CONTENU EN ATTENTE
${ideas && ideas.length > 0 ? ideas.map((i: any) => `- ${i.idea_text}`).join("\n") : "Aucune idée en attente."}

Génère une stratégie complète en JSON avec cette structure exacte. Sois très précis et actionnable. Adapte tout au profil et aux données réelles.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu génères des stratégies de contenu LinkedIn en JSON. Réponds UNIQUEMENT avec du JSON valide, sans markdown." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_strategy",
            description: "Create a LinkedIn content strategy",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "Vision stratégique globale en 2-3 phrases" },
                positioning: { type: "string", description: "Positionnement recommandé sur LinkedIn" },
                content_pillars: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      percentage: { type: "number" },
                      description: { type: "string" }
                    },
                    required: ["name", "percentage", "description"]
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
                      avg_engagement: { type: "number" },
                      recommendation: { type: "string" }
                    },
                    required: ["format", "recommendation"]
                  }
                },
                themes_to_explore: {
                  type: "array",
                  items: { type: "string" }
                },
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
              required: ["summary", "positioning", "content_pillars", "weekly_calendar", "winning_formats", "themes_to_explore", "recycling_opportunities"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "create_strategy" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let strategy;
    if (toolCall?.function?.arguments) {
      strategy = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      throw new Error("No strategy generated");
    }

    // Upsert strategy
    const { data: existing } = await supabase
      .from("content_strategy")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("content_strategy")
        .update({ strategy_json: strategy, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("content_strategy")
        .insert({ user_id: user.id, strategy_json: strategy });
    }

    return new Response(JSON.stringify({ success: true, strategy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate strategy error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
