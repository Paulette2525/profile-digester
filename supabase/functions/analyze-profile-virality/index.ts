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

    const { profile_id } = await req.json();
    if (!profile_id) throw new Error("profile_id required");

    const { data: profile, error: pErr } = await supabase
      .from("tracked_profiles")
      .select("*")
      .eq("id", profile_id)
      .single();
    if (pErr) throw pErr;

    // Get top 5 posts by engagement
    const { data: posts } = await supabase
      .from("linkedin_posts")
      .select("*")
      .eq("profile_id", profile_id)
      .order("likes_count", { ascending: false })
      .limit(5);

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ error: "Aucune publication à analyser" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const postsText = posts.map((p, i) => 
      `Post ${i + 1}: "${(p.content || "").substring(0, 500)}" | Likes: ${p.likes_count}, Comments: ${p.comments_count}, Shares: ${p.shares_count}, Media: ${p.media_type}`
    ).join("\n\n");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4.5",
        messages: [
          { role: "system", content: "Tu analyses les publications LinkedIn d'un créateur pour identifier ses patterns de viralité. Réponds en JSON structuré." },
          { role: "user", content: `Analyse les top publications de ${profile.name} (${profile.headline || ""}):\n\n${postsText}\n\nIdentifie les patterns de viralité uniques à ce profil.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "profile_analysis",
            description: "Analyse de viralité d'un profil LinkedIn",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "Résumé en 2-3 phrases de ce qui fait la viralité de ce profil" },
                top_hooks: { type: "array", items: { type: "string" }, description: "Les 3 meilleures accroches utilisées" },
                content_types: { type: "array", items: { type: "string" }, description: "Types de contenu les plus performants" },
                keywords: { type: "array", items: { type: "string" }, description: "Mots-clés récurrents efficaces" },
                posting_style: { type: "string", description: "Style de publication (ton, longueur, structure)" },
              },
              required: ["summary", "top_hooks", "content_types", "keywords", "posting_style"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "profile_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez plus tard" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;
    if (toolCall?.function?.arguments) {
      analysis = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      throw new Error("No analysis generated");
    }

    // Save to tracked_profiles
    await supabase
      .from("tracked_profiles")
      .update({ analysis_summary: analysis, last_analyzed_at: new Date().toISOString() })
      .eq("id", profile_id);

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-profile-virality error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
