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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all users with autopilot enabled
    const { data: configs, error: cfgErr } = await supabase
      .from("autopilot_config")
      .select("*")
      .eq("enabled", true);

    if (cfgErr) throw cfgErr;
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: "No active autopilot configs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const today = new Date();
    const todayDay = today.getDay();

    const results: any[] = [];

    for (const config of configs) {
      const userId = config.user_id;

      // Check if today is an active day
      const activeDayNumbers = (config.active_days || []).map((d: string) => dayMap[d.toLowerCase()] ?? -1);
      if (!activeDayNumbers.includes(todayDay)) {
        results.push({ userId, status: "skipped", reason: "not an active day" });
        continue;
      }

      try {
        // 1. Load Memory
        const { data: memory } = await supabase
          .from("user_memory")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        const m = memory as any;
        const writingInstructions = m?.writing_instructions || "";
        const industry = m?.industry || (config.industries_to_watch?.[0]) || "business";

        // 2. Fetch trends from Perplexity
        const industriesQuery = (config.industries_to_watch || []).length > 0
          ? config.industries_to_watch.join(", ")
          : industry;

        const perplexityRes = await fetchWithRetry("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              {
                role: "system",
                content: "Tu es un analyste de tendances LinkedIn. Retourne les sujets chauds du moment de manière concise et structurée en français.",
              },
              {
                role: "user",
                content: `Quels sont les 5 sujets les plus tendance aujourd'hui sur LinkedIn et les réseaux professionnels dans les domaines suivants : ${industriesQuery} ? Pour chaque sujet, donne : le titre, pourquoi c'est tendance, et un angle original pour en parler. Cherche aussi sur Reddit et Twitter ce qui buzz dans ces domaines.`,
              },
            ],
            search_recency_filter: "day",
          }),
        });

        let trends = "Aucune tendance trouvée";
        let trendTopics: string[] = [];
        if (perplexityRes.ok) {
          const perplexityData = await perplexityRes.json();
          trends = perplexityData.choices?.[0]?.message?.content || "Aucune tendance trouvée";

          // Extract topics for storage
          const topicMatches = trends.match(/\d+\.\s*\*?\*?([^*\n:]+)/g);
          trendTopics = (topicMatches || []).map((t: string) => t.replace(/^\d+\.\s*\*?\*?/, "").trim()).slice(0, 5);

          // Store trend insights
          if (trendTopics.length > 0) {
            const trendInserts = trendTopics.map((topic: string) => ({
              user_id: userId,
              topic,
              source: "perplexity",
              summary: trends.slice(0, 500),
              used: false,
            }));
            await supabase.from("trend_insights").insert(trendInserts);
          }
        } else {
          console.error("Perplexity error:", await perplexityRes.text());
        }

        // 3. Load tracked profiles and their top posts
        const { data: trackedProfiles } = await supabase
          .from("tracked_profiles")
          .select("name, headline, analysis_summary")
          .eq("user_id", userId)
          .limit(5);

        const { data: topPosts } = await supabase
          .from("linkedin_posts")
          .select("content, likes_count, comments_count, impressions_count")
          .eq("user_id", userId)
          .order("likes_count", { ascending: false })
          .limit(10);

        // 4. Load recent generated posts for continuity
        const { data: recentPosts } = await supabase
          .from("suggested_posts")
          .select("content, topic, status, scheduled_at, post_performance")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        // 5. Load a virality analysis for the function
        const { data: latestAnalysis } = await supabase
          .from("virality_analyses")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "done")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!latestAnalysis) {
          results.push({ userId, status: "skipped", reason: "no virality analysis available" });
          continue;
        }

        // 6. Load photos and ideas
        const { data: photos } = await supabase.from("user_photos").select("*").eq("user_id", userId);
        const { data: ideas } = await supabase.from("content_ideas").select("*").eq("user_id", userId).eq("used", false).limit(config.posts_per_day);

        // 7. Build the enhanced prompt
        let systemMessage = `Tu es un copywriter LinkedIn expert spécialisé dans la rédaction de posts HUMAINS, authentiques et engageants. Tu n'écris JAMAIS de posts vendeurs, corporate ou artificiels.`;
        if (writingInstructions) {
          systemMessage += `\n\n🚨 INSTRUCTIONS DE RÉDACTION OBLIGATOIRES DE L'AUTEUR (À RESPECTER IMPÉRATIVEMENT POUR CHAQUE POST, C'EST LA PRIORITÉ ABSOLUE) :\n${writingInstructions}`;
        }
        systemMessage += `\n\nGénère des posts via la fonction generate_posts.`;

        let userPrompt = "";

        // Writing instructions emphasis
        if (writingInstructions) {
          userPrompt += `⚠️ STYLE OBLIGATOIRE DE L'AUTEUR (PRIORITÉ #1) :\n${writingInstructions}\n\n---\n\n`;
        }

        // Trends of the day
        userPrompt += `📊 TENDANCES DU JOUR (utilise ces sujets pour créer des posts d'actualité et pertinents) :\n${trends}\n\n---\n\n`;

        // Author profile
        if (m) {
          userPrompt += `PROFIL DE L'AUTEUR:\n`;
          const fields = [
            ["Nom", m.full_name], ["Profession", m.profession], ["Entreprise", m.company],
            ["Industrie", m.industry], ["Audience cible", m.target_audience],
            ["Problèmes de l'audience", m.audience_pain_points],
            ["Offres/Services", m.offers_description], ["Ambitions", m.ambitions],
            ["Valeurs", m.values], ["Ton de voix", m.tone_of_voice],
            ["Histoire personnelle", m.personal_story], ["Expertise", m.expertise_areas],
            ["Réalisations", m.achievements], ["Résultats", m.key_results],
            ["Méthodologie unique", m.unique_methodology], ["Différenciateurs", m.differentiators],
            ["Style CTA", m.call_to_action_style], ["Objectifs LinkedIn", m.linkedin_goals],
          ];
          fields.forEach(([label, val]) => { userPrompt += `- ${label}: ${val || "Non renseigné"}\n`; });
          if (m.content_themes?.length) userPrompt += `- Thèmes: ${m.content_themes.join(", ")}\n`;
          if (m.content_pillars?.length) userPrompt += `- Piliers: ${m.content_pillars.join(", ")}\n`;
          if (m.brand_keywords?.length) userPrompt += `- Mots-clés: ${m.brand_keywords.join(", ")}\n`;
          userPrompt += `\n`;
        }

        // Tracked profiles
        if (trackedProfiles?.length) {
          userPrompt += `PROFILS ANALYSÉS (inspiration de style) :\n`;
          trackedProfiles.forEach((p: any) => {
            userPrompt += `- ${p.name} (${p.headline || ""})\n`;
            if (p.analysis_summary && Object.keys(p.analysis_summary).length > 0) {
              userPrompt += `  Résumé: ${JSON.stringify(p.analysis_summary).slice(0, 300)}\n`;
            }
          });
          userPrompt += `\n`;
        }

        // Top performing posts
        if (topPosts?.length) {
          userPrompt += `POSTS LES PLUS PERFORMANTS (reproduire le style, la longueur et le ton) :\n`;
          topPosts.slice(0, 8).forEach((p: any, i: number) => {
            const excerpt = (p.content || "").slice(0, 800);
            userPrompt += `${i + 1}. [${p.likes_count}❤️ ${p.comments_count}💬 ${p.impressions_count || 0}👁️] "${excerpt}"\n\n`;
          });
        }

        // Recent posts for continuity
        if (recentPosts?.length) {
          userPrompt += `📝 DERNIERS POSTS GÉNÉRÉS (assure une CONTINUITÉ LOGIQUE, ne répète pas les mêmes sujets) :\n`;
          recentPosts.slice(0, 10).forEach((p: any, i: number) => {
            const perf = p.post_performance ? ` — Perf: ${JSON.stringify(p.post_performance)}` : "";
            userPrompt += `${i + 1}. [${p.topic}] ${(p.content || "").slice(0, 200)}...${perf}\n`;
          });
          userPrompt += `\n`;
        }

        // Virality analysis
        userPrompt += `ANALYSE DE VIRALITÉ:\n${JSON.stringify(latestAnalysis.analysis_json, null, 2)}\n\n`;

        // Ideas
        if (ideas?.length) {
          userPrompt += `IDÉES À INTÉGRER:\n${ideas.map((i: any, idx: number) => `${idx + 1}. ${i.idea_text}`).join("\n")}\n\n`;
        }

        // Photos
        if (photos?.length) {
          userPrompt += `L'auteur a ${photos.length} photo(s). Suggère "use_personal_photo": true quand pertinent.\n\n`;
        }

        // Rules
        userPrompt += `RÈGLES IMPÉRATIVES:\n`;
        userPrompt += `1. 🚨 RESPECTER les instructions de rédaction — PRIORITÉ ABSOLUE\n`;
        userPrompt += `2. Posts HUMAINS, authentiques — PAS vendeurs\n`;
        userPrompt += `3. Écrire avec la voix de l'auteur\n`;
        userPrompt += `4. Chaque post UNIQUE avec structure différente\n`;
        userPrompt += `5. Hook puissant en première ligne\n`;
        userPrompt += `6. Emojis naturels sans abuser\n`;
        userPrompt += `7. CTA subtil et naturel\n`;
        userPrompt += `8. En français\n`;
        userPrompt += `9. S'inspirer des posts performants\n`;
        userPrompt += `10. Utiliser l'histoire personnelle\n`;
        userPrompt += `11. 🔥 VARIER les longueurs : LONGS (20-40 lignes), MOYENS (8-15), COURTS (3-7)\n`;
        userPrompt += `12. NE JAMAIS écrire de carousel ou sondage\n`;
        userPrompt += `13. INTÉGRER les tendances du jour de manière naturelle\n`;
        userPrompt += `14. Assurer un FIL NARRATIF cohérent avec les posts précédents\n`;
        userPrompt += `15. Pour chaque post, suggère une heure entre 7h et 20h\n`;
        userPrompt += `\nGénère exactement ${config.posts_per_day} posts.`;

        // 8. Call AI
        const aiRes = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: userPrompt },
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
                          suggested_hour: { type: "number" },
                          length: { type: "string", enum: ["short", "medium", "long"] },
                        },
                        required: ["content", "topic", "virality_score", "suggested_hour", "length"],
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
          const errText = await aiRes.text();
          results.push({ userId, status: "error", reason: `AI error: ${aiRes.status} - ${errText}` });
          continue;
        }

        const aiData = await aiRes.json();
        let generatedPosts: any[];
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          generatedPosts = JSON.parse(toolCall.function.arguments).posts || [];
        } else {
          const content = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          generatedPosts = jsonMatch ? JSON.parse(jsonMatch[0]).posts || [] : [];
        }

        // 9. Assign schedules based on config hours
        const postingHours = config.posting_hours || [9, 12, 17];
        const photoUrls = photos?.map((p: any) => p.image_url) || [];
        const isAutoMode = config.approval_mode === "auto";

        const toInsert = generatedPosts.map((p: any, idx: number) => {
          const hour = postingHours[idx % postingHours.length];
          const daysToAdd = Math.floor(idx / postingHours.length) + 1;
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + daysToAdd);
          scheduledDate.setHours(hour, 0, 0, 0);

          const usePhoto = p.use_personal_photo && photoUrls.length > 0;

          return {
            content: p.content,
            topic: p.topic,
            virality_score: Math.min(100, Math.max(0, Math.round(p.virality_score))),
            source_analysis_id: latestAnalysis.id,
            status: isAutoMode ? "scheduled" : "draft",
            user_id: userId,
            image_url: usePhoto ? photoUrls[Math.floor(Math.random() * photoUrls.length)] : null,
            scheduled_at: scheduledDate.toISOString(),
          };
        });

        const { data: saved, error: sErr } = await supabase.from("suggested_posts").insert(toInsert).select("*");
        if (sErr) throw sErr;

        // Mark ideas as used
        if (ideas?.length) {
          await supabase.from("content_ideas").update({ used: true }).in("id", ideas.map((i: any) => i.id));
        }

        // Mark trends as used
        if (trendTopics.length > 0) {
          await supabase
            .from("trend_insights")
            .update({ used: true })
            .eq("user_id", userId)
            .in("topic", trendTopics);
        }

        // Update last_run_at
        await supabase
          .from("autopilot_config")
          .update({ last_run_at: new Date().toISOString() })
          .eq("user_id", userId);

        results.push({ userId, status: "success", postsGenerated: saved?.length || 0 });
        console.log(`Autopilot: generated ${saved?.length || 0} posts for user ${userId}`);

      } catch (userError) {
        console.error(`Autopilot error for user ${userId}:`, userError);
        results.push({ userId, status: "error", reason: String(userError) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Autopilot run error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
