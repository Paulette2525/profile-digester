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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");
    const userId = user.id;

    const { profile_ids } = await req.json().catch(() => ({}));

    let profilesQuery = supabase.from("tracked_profiles").select("id, name, last_analyzed_at").eq("user_id", userId);
    if (profile_ids && profile_ids.length > 0) {
      profilesQuery = profilesQuery.in("id", profile_ids);
    }
    const { data: profiles, error: pErr } = await profilesQuery;
    if (pErr) throw pErr;
    if (!profiles || profiles.length === 0) throw new Error("No profiles found");

    const { data: analysis, error: aErr } = await supabase
      .from("virality_analyses")
      .insert({ status: "pending", analysis_json: {}, user_id: userId })
      .select("id")
      .single();
    if (aErr) throw aErr;

    const { data: memory } = await supabase.from("user_memory").select("*").eq("user_id", userId).limit(1).maybeSingle();

    const allTopPosts: any[] = [];
    for (const profile of profiles) {
      // Incremental: only fetch posts since last_analyzed_at, or top 10 if first time
      let postsQuery = supabase
        .from("linkedin_posts")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("user_id", userId);

      if (profile.last_analyzed_at) {
        // Get new posts since last analysis + top 3 all-time for context
        const { data: newPosts } = await postsQuery
          .gt("posted_at", profile.last_analyzed_at)
          .order("likes_count", { ascending: false })
          .limit(15);

        const { data: topAllTime } = await supabase
          .from("linkedin_posts")
          .select("*")
          .eq("profile_id", profile.id)
          .eq("user_id", userId)
          .order("likes_count", { ascending: false })
          .limit(3);

        const combined = [...(newPosts || [])];
        // Add top all-time if not already in new posts
        for (const tp of (topAllTime || [])) {
          if (!combined.find(p => p.id === tp.id)) combined.push(tp);
        }

        if (combined.length > 0) {
          allTopPosts.push(...combined.map(p => ({
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
      } else {
        // First analysis: top 10 by engagement
        const { data: posts } = await postsQuery
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
    }

    if (allTopPosts.length === 0) {
      await supabase.from("virality_analyses").update({ status: "error", analysis_json: { error: "No posts to analyze" } }).eq("id", analysis.id);
      return new Response(JSON.stringify({ error: "Aucune publication à analyser" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    allTopPosts.sort((a, b) => b.engagement_total - a.engagement_total);
    const topPosts = allTopPosts.slice(0, 30);

    let memoryContext = "";
    if (memory) {
      const m = memory as any;
      memoryContext = `\n\nCONTEXTE DE L'UTILISATEUR:
- Profession: ${m.profession || "Non renseigné"}
- Industrie: ${m.industry || "Non renseigné"}
- Audience cible: ${m.target_audience || "Non renseigné"}
- Ton de voix préféré: ${m.tone_of_voice || "Non renseigné"}
- Domaines d'expertise: ${m.expertise_areas || "Non renseigné"}`;
    }

    const prompt = `Tu es un expert en marketing LinkedIn et en viralité de contenu.

Analyse ces ${topPosts.length} publications LinkedIn et identifie les facteurs de viralité.${memoryContext}

PUBLICATIONS:
${topPosts.map((p, i) => `
--- Publication ${i + 1} (${p.profile_name}) ---
Contenu: ${p.content}
Likes: ${p.likes}, Commentaires: ${p.comments}, Partages: ${p.shares}, Impressions: ${p.impressions}
Type de média: ${p.media_type}
Date: ${p.posted_at}
Score engagement: ${p.engagement_total}
`).join("\n")}

Réponds avec un JSON structuré.`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4.5",
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
        await supabase.from("virality_analyses").update({ status: "error", analysis_json: { error: "Rate limit" } }).eq("id", analysis.id);
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      analysisResult = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Could not parse", raw: content };
    }

    analysisResult.analyzed_posts_count = topPosts.length;
    analysisResult.profiles_analyzed = profiles.map(p => p.name);

    await supabase.from("virality_analyses").update({ status: "done", analysis_json: analysisResult }).eq("id", analysis.id);

    // Update last_analyzed_at on all processed profiles
    for (const profile of profiles) {
      await supabase.from("tracked_profiles").update({ last_analyzed_at: new Date().toISOString() }).eq("id", profile.id);
    }

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
