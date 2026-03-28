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

    const { profile_ids } = await req.json().catch(() => ({}));

    let profilesQuery = supabase.from("tracked_profiles").select("id, name");
    if (profile_ids && profile_ids.length > 0) {
      profilesQuery = profilesQuery.in("id", profile_ids);
    }
    const { data: profiles, error: pErr } = await profilesQuery;
    if (pErr) throw pErr;
    if (!profiles || profiles.length === 0) throw new Error("No profiles found");

    const { data: analysis, error: aErr } = await supabase
      .from("virality_analyses")
      .insert({ status: "pending", analysis_json: {} })
      .select("id")
      .single();
    if (aErr) throw aErr;

    // Fetch user memory for context
    const { data: memory } = await supabase.from("user_memory").select("*").limit(1).maybeSingle();

    const allTopPosts: any[] = [];
    for (const profile of profiles) {
      const { data: posts } = await supabase
        .from("linkedin_posts")
        .select("*")
        .eq("profile_id", profile.id)
        .order("likes_count", { ascending: false })
        .limit(10);

      if (posts) {
        allTopPosts.push(...posts.map(p => ({
          profile_name: profile.name,
          content: (p.content || "").substring(0, 2000),
          likes: p.likes_count,
          comments: p.comments_count,
          shares: p.shares_count,
          impressions: p.impressions_count || 0,
          media_type: p.media_type,
          posted_at: p.posted_at,
          engagement_total: p.likes_count + p.comments_count * 3 + p.shares_count * 5,
        })));
      }
    }

    allTopPosts.sort((a, b) => b.engagement_total - a.engagement_total);
    const topPosts = allTopPosts.slice(0, 30);

    let memoryContext = "";
    if (memory) {
      memoryContext = `\n\nCONTEXTE DE L'UTILISATEUR:
- Profession: ${memory.profession || "Non renseigné"}
- Industrie: ${memory.industry || "Non renseigné"}
- Audience cible: ${memory.target_audience || "Non renseigné"}
- Thèmes de contenu souhaités: ${(memory.content_themes as string[])?.join(", ") || "Non renseigné"}
- Ton de voix préféré: ${memory.tone_of_voice || "Non renseigné"}
- Domaines d'expertise: ${memory.expertise_areas || "Non renseigné"}

Tiens compte de ce contexte pour orienter l'analyse vers des recommandations pertinentes pour cet utilisateur.`;
    }

    const prompt = `Tu es un expert en marketing LinkedIn et en viralité de contenu.

Analyse ces ${topPosts.length} publications LinkedIn les plus performantes et identifie les facteurs de viralité.${memoryContext}

PUBLICATIONS:
${topPosts.map((p, i) => `
--- Publication ${i + 1} (${p.profile_name}) ---
Contenu: ${p.content}
Likes: ${p.likes}, Commentaires: ${p.comments}, Partages: ${p.shares}, Impressions: ${p.impressions}
Type de média: ${p.media_type}
Date: ${p.posted_at}
Score engagement: ${p.engagement_total}
`).join("\n")}

Réponds avec un JSON structuré contenant:
1. "factors": tableau de facteurs de viralité, chacun avec: "name" (nom du facteur), "score" (1-100), "description" (explication), "examples" (2-3 extraits de posts illustrant ce facteur)
2. "content_patterns": patterns de contenu récurrents dans les posts viraux (hooks d'accroche, structure, CTA, longueur optimale)
3. "media_insights": impact du type de média sur l'engagement
4. "timing_insights": observations sur le timing des publications
5. "top_keywords": mots-clés et expressions les plus efficaces
6. "summary": résumé global des facteurs de viralité en 3-4 phrases`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4",
        messages: [
          { role: "system", content: "Tu es un analyste expert en viralité LinkedIn. Réponds toujours en JSON valide." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "virality_analysis",
            description: "Structured virality analysis results",
            parameters: {
              type: "object",
              properties: {
                factors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      score: { type: "number" },
                      description: { type: "string" },
                      examples: { type: "array", items: { type: "string" } },
                    },
                    required: ["name", "score", "description", "examples"],
                  },
                },
                content_patterns: {
                  type: "object",
                  properties: {
                    hooks: { type: "array", items: { type: "string" } },
                    structure: { type: "string" },
                    cta_patterns: { type: "array", items: { type: "string" } },
                    optimal_length: { type: "string" },
                  },
                  required: ["hooks", "structure", "cta_patterns", "optimal_length"],
                },
                media_insights: { type: "string" },
                timing_insights: { type: "string" },
                top_keywords: { type: "array", items: { type: "string" } },
                summary: { type: "string" },
              },
              required: ["factors", "content_patterns", "media_insights", "timing_insights", "top_keywords", "summary"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "virality_analysis" } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) {
        await supabase.from("virality_analyses").update({ status: "error", analysis_json: { error: "Rate limit exceeded" } }).eq("id", analysis.id);
        return new Response(JSON.stringify({ error: "Rate limit exceeded, réessayez plus tard" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        await supabase.from("virality_analyses").update({ status: "error", analysis_json: { error: "Credits exhausted" } }).eq("id", analysis.id);
        return new Response(JSON.stringify({ error: "Crédits AI épuisés" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiRes.json();
    let analysisResult: any;

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      analysisResult = JSON.parse(toolCall.function.arguments);
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Could not parse AI response", raw: content };
    }

    analysisResult.analyzed_posts_count = topPosts.length;
    analysisResult.profiles_analyzed = profiles.map(p => p.name);

    await supabase.from("virality_analyses").update({
      status: "done",
      analysis_json: analysisResult,
    }).eq("id", analysis.id);

    return new Response(JSON.stringify({ success: true, analysis_id: analysis.id, analysis: analysisResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analyze virality error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
