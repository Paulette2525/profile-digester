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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");
    const userId = user.id;

    const { analysis_id, count = 5, topic, calendar, trends: externalTrends } = await req.json();
    if (!analysis_id) throw new Error("Missing analysis_id");

    const { data: analysis, error: aErr } = await supabase.from("virality_analyses").select("*").eq("id", analysis_id).single();
    if (aErr || !analysis) throw new Error("Analysis not found");
    if (analysis.status !== "done") throw new Error("Analysis not complete");

    const factors = analysis.analysis_json;

    const { data: memory } = await supabase.from("user_memory").select("*").eq("user_id", userId).limit(1).maybeSingle();
    const { data: photos } = await supabase.from("user_photos").select("*").eq("user_id", userId);
    const { data: ideas } = await supabase.from("content_ideas").select("*").eq("user_id", userId).eq("used", false).limit(count);

    // Fetch scraped profiles for inspiration
    const { data: trackedProfiles } = await supabase.from("tracked_profiles").select("name, headline, analysis_summary").eq("user_id", userId).limit(5);
    const { data: topLinkedinPosts } = await supabase.from("linkedin_posts").select("content, likes_count, comments_count, impressions_count").eq("user_id", userId).order("likes_count", { ascending: false }).limit(10);

    // Load recent posts for continuity
    const { data: recentPosts } = await supabase.from("suggested_posts").select("content, topic, status, post_performance").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);

    const m = memory as any;
    const writingInstructions = m?.writing_instructions || "";

    // === SYSTEM MESSAGE: writing instructions get maximum priority ===
    let systemMessage = `Tu es un copywriter LinkedIn expert spécialisé dans la rédaction de posts HUMAINS, authentiques et engageants. Tu n'écris JAMAIS de posts vendeurs, corporate ou artificiels.`;
    if (writingInstructions) {
      systemMessage += `\n\n🚨 INSTRUCTIONS DE RÉDACTION OBLIGATOIRES DE L'AUTEUR (À RESPECTER IMPÉRATIVEMENT POUR CHAQUE POST, C'EST LA PRIORITÉ ABSOLUE) :\n${writingInstructions}`;
    }
    systemMessage += `\n\nGénère des posts via la fonction generate_posts.`;

    // === USER MESSAGE ===
    let userPrompt = "";

    // 1. Writing instructions repeated at the top for emphasis
    if (writingInstructions) {
      userPrompt += `⚠️ STYLE OBLIGATOIRE DE L'AUTEUR (PRIORITÉ #1 — à respecter avant toute autre consigne) :\n${writingInstructions}\n\n---\n\n`;
    }

    // 2. Author profile
    if (m) {
      userPrompt += `PROFIL DE L'AUTEUR:\n`;
      userPrompt += `- Nom: ${m.full_name || "Non renseigné"}\n`;
      userPrompt += `- Profession: ${m.profession || "Non renseigné"}\n`;
      userPrompt += `- Entreprise: ${m.company || "Non renseigné"}\n`;
      userPrompt += `- Industrie: ${m.industry || "Non renseigné"}\n`;
      userPrompt += `- Audience cible: ${m.target_audience || "Non renseigné"}\n`;
      userPrompt += `- Problèmes de l'audience: ${m.audience_pain_points || "Non renseigné"}\n`;
      userPrompt += `- Offres/Services: ${m.offers_description || "Non renseigné"}\n`;
      userPrompt += `- Ambitions: ${m.ambitions || "Non renseigné"}\n`;
      userPrompt += `- Valeurs: ${m.values || "Non renseigné"}\n`;
      userPrompt += `- Ton de voix: ${m.tone_of_voice || "Non renseigné"}\n`;
      userPrompt += `- Thèmes: ${(m.content_themes as string[])?.join(", ") || "Non renseigné"}\n`;
      userPrompt += `- Piliers de contenu: ${(m.content_pillars as string[])?.join(", ") || "Non renseigné"}\n`;
      userPrompt += `- Mots-clés de marque: ${(m.brand_keywords as string[])?.join(", ") || "Non renseigné"}\n`;
      userPrompt += `- Types de contenu: ${(m.content_types as string[])?.join(", ") || "Non renseigné"}\n`;
      userPrompt += `- Histoire personnelle: ${m.personal_story || "Non renseigné"}\n`;
      userPrompt += `- Domaines d'expertise: ${m.expertise_areas || "Non renseigné"}\n`;
      userPrompt += `- Réalisations majeures: ${m.achievements || "Non renseigné"}\n`;
      userPrompt += `- Résultats marquants: ${m.key_results || "Non renseigné"}\n`;
      userPrompt += `- Méthodologie unique: ${m.unique_methodology || "Non renseigné"}\n`;
      userPrompt += `- Ce qui le différencie: ${m.differentiators || "Non renseigné"}\n`;
      userPrompt += `- Style de CTA: ${m.call_to_action_style || "Non renseigné"}\n`;
      userPrompt += `- Formats préférés: ${m.preferred_formats || "Non renseigné"}\n`;
      userPrompt += `- Concurrents/Leaders: ${m.competitors || "Non renseigné"}\n`;
      userPrompt += `- Objectifs LinkedIn: ${m.linkedin_goals || "Non renseigné"}\n`;
      userPrompt += `- Notes: ${m.additional_notes || "Non renseigné"}\n\n`;
    }

    // 3. Scraped profiles for inspiration
    if (trackedProfiles && trackedProfiles.length > 0) {
      userPrompt += `PROFILS ANALYSÉS (inspiration de style et de structure) :\n`;
      trackedProfiles.forEach((p: any) => {
        userPrompt += `- ${p.name} (${p.headline || ""})\n`;
        if (p.analysis_summary && Object.keys(p.analysis_summary).length > 0) {
          userPrompt += `  Résumé: ${JSON.stringify(p.analysis_summary).slice(0, 300)}\n`;
        }
      });
      userPrompt += `\n`;
    }

    // 4. Top performing posts as examples
    if (topLinkedinPosts && topLinkedinPosts.length > 0) {
      userPrompt += `POSTS LINKEDIN LES PLUS PERFORMANTS (à analyser en profondeur pour reproduire le style, la longueur, la structure et le ton) :\n`;
      topLinkedinPosts.slice(0, 8).forEach((p: any, i: number) => {
        const excerpt = (p.content || "").slice(0, 800);
        userPrompt += `${i + 1}. [${p.likes_count}❤️ ${p.comments_count}💬 ${p.impressions_count || 0}👁️] "${excerpt}${(p.content || "").length > 800 ? "..." : ""}"\n\n`;
      });
      userPrompt += `\n`;
    }

    // 5. Virality analysis
    userPrompt += `ANALYSE DE VIRALITÉ:\n${JSON.stringify(factors, null, 2)}\n\n`;

    // 5b. Trends (if provided from autopilot or manual)
    if (externalTrends) {
      userPrompt += `📊 TENDANCES DU JOUR (intègre-les naturellement dans les posts) :\n${externalTrends}\n\n`;
    }

    // 5c. Recent posts for continuity
    if (recentPosts && recentPosts.length > 0) {
      userPrompt += `📝 DERNIERS POSTS (assure une CONTINUITÉ LOGIQUE, ne répète pas les mêmes sujets) :\n`;
      recentPosts.slice(0, 10).forEach((p: any, i: number) => {
        const perf = p.post_performance ? ` — Perf: ${JSON.stringify(p.post_performance)}` : "";
        userPrompt += `${i + 1}. [${p.topic}] ${(p.content || "").slice(0, 200)}...${perf}\n`;
      });
      userPrompt += `\n`;
    }


    // 6. Calendar slots if provided
    const effectiveCount = calendar ? calendar.length : count;
    if (calendar && calendar.length > 0) {
      userPrompt += `CALENDRIER ÉDITORIAL À SUIVRE (génère exactement 1 post par slot) :\n`;
      calendar.forEach((slot: any, i: number) => {
        userPrompt += `${i + 1}. ${slot.date} — Type: ${slot.type} — Thème: ${slot.theme}\n`;
      });
      userPrompt += `\n`;
    }

    // 7. Topic
    if (topic) {
      userPrompt += `THÈME SOUHAITÉ: ${topic}\n\n`;
    } else if (!calendar) {
      userPrompt += `Propose des thèmes variés.\n\n`;
    }

    // 8. Ideas
    if (ideas && ideas.length > 0) {
      userPrompt += `IDÉES DE PUBLICATIONS À INTÉGRER:\n${ideas.map((i: any, idx: number) => `${idx + 1}. ${i.idea_text}${i.image_url ? " [IMAGE ASSOCIÉE]" : ""}`).join("\n")}\n\n`;
    }

    // 9. Photos
    if (photos && photos.length > 0) {
      userPrompt += `L'auteur dispose de ${photos.length} photo(s) personnelles. Pour certains posts, suggère "use_personal_photo": true.\n\n`;
    }

    // 10. Rules with writing instructions emphasis
    userPrompt += `RÈGLES IMPÉRATIVES:\n`;
    userPrompt += `1. 🚨 RESPECTER IMPÉRATIVEMENT les instructions de rédaction de l'auteur ci-dessus — c'est la PRIORITÉ ABSOLUE\n`;
    userPrompt += `2. Les posts doivent être HUMAINS, authentiques, personnels — PAS des posts vendeurs, corporate ou génériques\n`;
    userPrompt += `3. Écrire comme si l'auteur parlait naturellement à son réseau, avec SA voix et SON style\n`;
    userPrompt += `4. Chaque post doit être UNIQUE avec une structure différente\n`;
    userPrompt += `5. Hook puissant sur la première ligne (accroche émotionnelle ou surprenante)\n`;
    userPrompt += `6. Inclure des emojis naturellement mais sans en abuser\n`;
    userPrompt += `7. CTA subtil et naturel à la fin (pas vendeur)\n`;
    userPrompt += `8. Écrire en français\n`;
    userPrompt += `9. S'inspirer du style et de la LONGUEUR des posts performants analysés ci-dessus — reproduire leur structure\n`;
    userPrompt += `10. Utiliser l'histoire personnelle et les anecdotes réelles de l'auteur\n`;
    userPrompt += `11. 🔥 VARIER OBLIGATOIREMENT LES LONGUEURS : certains posts doivent être LONGS (20-40 lignes avec storytelling développé, narration complète), d'autres MOYENS (8-15 lignes), d'autres COURTS (3-7 lignes percutants). Le mélange est OBLIGATOIRE.\n`;
    userPrompt += `12. NE JAMAIS écrire de posts "Carousel" avec "Slide 1, Slide 2..." — écris toujours des posts complets et lisibles en texte continu\n`;
    userPrompt += `13. NE JAMAIS écrire de sondages\n`;
    userPrompt += `14. Pour chaque post, suggère une heure de publication optimale entre 7h et 20h (champ suggested_hour)\n`;
    userPrompt += `\nGénère exactement ${effectiveCount} posts. Pour chaque post: contenu complet, topic/thème, score de viralité estimé (1-100), longueur (short/medium/long), heure de publication suggérée (7-20).`;

    console.log("Generating posts with Lovable AI for user:", userId);

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
                      content: { type: "string", description: "Le contenu complet du post LinkedIn" },
                      topic: { type: "string" },
                      virality_score: { type: "number" },
                      use_personal_photo: { type: "boolean" },
                      suggested_hour: { type: "number", description: "Heure optimale de publication (7-20)" },
                      length: { type: "string", enum: ["short", "medium", "long"], description: "Longueur du post" },
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
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit, réessayez plus tard" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await aiRes.text();
      throw new Error(`AI error: ${aiRes.status} - ${errText}`);
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
      const calendarSlot = calendar?.[idx];

      // Auto-assign scheduled_at: use calendar slot, or compute from suggested_hour
      let scheduledAt = calendarSlot?.scheduled_at || null;
      if (!scheduledAt && p.suggested_hour) {
        const postDate = new Date();
        postDate.setDate(postDate.getDate() + 1 + idx); // spread across days
        postDate.setHours(Math.max(7, Math.min(20, p.suggested_hour)), 0, 0, 0);
        scheduledAt = postDate.toISOString();
      }

      return {
        content: p.content,
        topic: p.topic,
        virality_score: Math.min(100, Math.max(0, Math.round(p.virality_score))),
        source_analysis_id: analysis_id,
        status: "draft",
        user_id: userId,
        image_url: ideaImage || (usePhoto ? photoUrls[Math.floor(Math.random() * photoUrls.length)] : null),
        scheduled_at: scheduledAt,
      };
    });

    const { data: saved, error: sErr } = await supabase.from("suggested_posts").insert(toInsert).select("*");
    if (sErr) throw sErr;

    if (ideas && ideas.length > 0) {
      const ideaIds = ideas.map((i: any) => i.id);
      await supabase.from("content_ideas").update({ used: true }).in("id", ideaIds);
    }

    console.log(`Generated ${saved?.length || 0} posts for user ${userId}`);

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
