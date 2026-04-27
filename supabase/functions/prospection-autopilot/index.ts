import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch all configs that have at least one mode enabled
    const { data: configs, error: cfgErr } = await supabase
      .from("prospection_autopilot_config")
      .select("*")
      .or("profiles_enabled.eq.true,commenters_enabled.eq.true,companies_enabled.eq.true");
    if (cfgErr) throw cfgErr;
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: "No active autopilot configs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const config of configs) {
      try {
        const userId = config.user_id;
        let prospects: any[] = [];

        // 1. Fetch prospects from all enabled modes
        if (config.profiles_enabled && config.search_query) {
          const searchBody: any = { query: config.search_query, limit: config.daily_contact_limit * 2 };
          if (config.profiles_location) searchBody.location = config.profiles_location;
          if (config.profiles_industry) searchBody.industry = config.profiles_industry;
          if (config.profiles_company_size) searchBody.company_size = config.profiles_company_size;
          const res = await fetch(`${SUPABASE_URL}/functions/v1/search-profiles`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify(searchBody),
          });
          if (res.ok) {
            const data = await res.json();
            let results = data.results || [];
            // Post-filter by title
            if (config.profiles_title_filter) {
              const titles = config.profiles_title_filter.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean);
              results = results.filter((p: any) => titles.some((t: string) => (p.headline || "").toLowerCase().includes(t)));
            }
            prospects.push(...results);
          }
        }

        if (config.commenters_enabled && config.post_ids?.length > 0) {
          for (const postId of config.post_ids.slice(0, 5)) {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/extract-commenters`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({ post_id: postId, limit: Math.ceil(config.daily_contact_limit / config.post_ids.length) }),
            });
            if (res.ok) {
              const data = await res.json();
              let results = data.results || [];
              // Filter by headline
              if (config.commenters_filter_headline) {
                const headlines = config.commenters_filter_headline.split(",").map((h: string) => h.trim().toLowerCase()).filter(Boolean);
                results = results.filter((p: any) => headlines.some((h: string) => (p.headline || "").toLowerCase().includes(h)));
              }
              // Filter by min likes
              if (config.commenters_min_likes > 0) {
                results = results.filter((p: any) => (p.likes || 0) >= config.commenters_min_likes);
              }
              // Exclude keywords
              if (config.commenters_exclude_keywords) {
                const excludes = config.commenters_exclude_keywords.split(",").map((k: string) => k.trim().toLowerCase()).filter(Boolean);
                results = results.filter((p: any) => !excludes.some((k: string) => (p.headline || "").toLowerCase().includes(k)));
              }
              prospects.push(...results);
            }
          }
        }

        if (config.companies_enabled && config.company_keywords) {
          const compSearchBody: any = { query: config.company_keywords, limit: 10 };
          if (config.companies_location) compSearchBody.location = config.companies_location;
          if (config.companies_industry_filter) compSearchBody.industry = config.companies_industry_filter;
          if (config.companies_size_min) compSearchBody.size_min = config.companies_size_min;
          if (config.companies_size_max) compSearchBody.size_max = config.companies_size_max;
          const compRes = await fetch(`${SUPABASE_URL}/functions/v1/search-companies`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify(compSearchBody),
          });
          if (compRes.ok) {
            const compData = await compRes.json();
            const companies = compData.results || [];
            for (const company of companies.slice(0, 5)) {
              const profRes = await fetch(`${SUPABASE_URL}/functions/v1/search-profiles`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                  query: company.name,
                  company_id: company.id,
                  limit: Math.ceil(config.daily_contact_limit / companies.length),
                }),
              });
              if (profRes.ok) {
                const profData = await profRes.json();
                prospects.push(...(profData.results || []));
              }
            }
          }
        }

        if (prospects.length === 0) {
          results.push({ user_id: userId, status: "no_prospects" });
          continue;
        }

        // 2. Deduplicate — remove already contacted prospects
        const { data: existingMessages } = await supabase
          .from("prospection_messages")
          .select("prospect_linkedin_url")
          .eq("user_id", userId);
        const contactedUrls = new Set((existingMessages || []).map((m: any) => m.prospect_linkedin_url));
        prospects = prospects.filter((p: any) => !contactedUrls.has(p.linkedin_url));

        // Apply daily limit
        prospects = prospects.slice(0, config.daily_contact_limit);

        if (prospects.length === 0) {
          results.push({ user_id: userId, status: "all_already_contacted" });
          continue;
        }

        // 3. Personalize messages with AI if guidelines exist
        const personalizedMessages: { prospect: any; message: string }[] = [];

        if (LOVABLE_API_KEY && (config.offer_description || config.conversation_guidelines)) {
          // Batch personalize with AI
          for (const prospect of prospects) {
            try {
              const prompt = `Tu es un expert en prospection LinkedIn. Personnalise ce message pour le prospect suivant.

PROSPECT:
- Nom: ${prospect.name}
- Titre: ${prospect.headline || "Non spécifié"}

CE QUE NOUS PROPOSONS:
${config.offer_description || "Non spécifié"}

GUIDELINES DE CONVERSATION:
${config.conversation_guidelines || "Sois professionnel et amical"}

TEMPLATE DE BASE:
${config.message_template || "Bonjour {name}, j'aimerais échanger avec vous."}

INSTRUCTIONS:
- Garde le message court (max 300 caractères pour LinkedIn)
- Personnalise en fonction du titre/poste du prospect
- Utilise un ton naturel, pas de spam
- Varie les formulations pour éviter la détection
- Ne mets PAS de guillemets autour du message
- Retourne UNIQUEMENT le message personnalisé, rien d'autre`;

              const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "anthropic/claude-3.5-sonnet",
                  messages: [{ role: "user", content: prompt }],
                }),
              });

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                const content = aiData.choices?.[0]?.message?.content?.trim();
                if (content) {
                  personalizedMessages.push({ prospect, message: content });
                  continue;
                }
              }
            } catch (e) {
              console.error(`AI personalization failed for ${prospect.name}:`, e);
            }

            // Fallback to template
            const fallback = (config.message_template || "Bonjour {name}")
              .replace(/\{name\}/g, prospect.name)
              .replace(/\{headline\}/g, prospect.headline || "");
            personalizedMessages.push({ prospect, message: fallback });
          }
        } else {
          // No AI — use template directly
          for (const prospect of prospects) {
            const msg = (config.message_template || "Bonjour {name}")
              .replace(/\{name\}/g, prospect.name)
              .replace(/\{headline\}/g, prospect.headline || "");
            personalizedMessages.push({ prospect, message: msg });
          }
        }

        // 4. Create campaign
        const enabledModes: string[] = [];
        if (config.profiles_enabled) enabledModes.push("Profils");
        if (config.commenters_enabled) enabledModes.push("Commentaires");
        if (config.companies_enabled) enabledModes.push("Entreprises");
        const now = new Date();
        const campaignName = `Auto — ${enabledModes.join("+") || "Manuel"} — ${now.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;

        const { data: campaign, error: campErr } = await supabase
          .from("prospection_campaigns")
          .insert({
            user_id: userId,
            name: campaignName,
            message_template: config.message_template || "",
            status: "active",
            total_prospects: personalizedMessages.length,
            warmup_enabled: config.warmup_enabled,
            warmup_delay_hours: config.warmup_delay_hours,
          })
          .select("id")
          .single();
        if (campErr) throw campErr;

        // 5. Create sequence steps
        const seqSteps = [
          { campaign_id: campaign.id, step_order: 1, delay_days: 0, message_template: config.message_template || "" },
        ];
        const configSteps = config.sequence_steps as any[];
        if (Array.isArray(configSteps)) {
          for (const s of configSteps) {
            seqSteps.push({
              campaign_id: campaign.id,
              step_order: s.step_order || seqSteps.length + 1,
              delay_days: s.delay_days || 3,
              message_template: s.message_template || "",
            });
          }
        }
        await supabase.from("prospection_sequence_steps").insert(seqSteps);

        // 6. Insert messages
        const msgs = personalizedMessages.map((pm) => ({
          campaign_id: campaign.id,
          user_id: userId,
          prospect_name: pm.prospect.name,
          prospect_headline: pm.prospect.headline,
          prospect_linkedin_url: pm.prospect.linkedin_url,
          prospect_avatar_url: pm.prospect.avatar_url,
          message_sent: pm.message,
          status: "pending",
          step_order: 1,
        }));
        await supabase.from("prospection_messages").insert(msgs);

        // 7. Trigger outreach
        const outreachRes = await fetch(`${SUPABASE_URL}/functions/v1/prospect-outreach`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            campaign_id: campaign.id,
            daily_limit: config.daily_contact_limit,
            delay_seconds: config.delay_between_messages,
          }),
        });
        const outreachData = outreachRes.ok ? await outreachRes.json() : { error: await outreachRes.text() };

        // 8. Update last_run_at
        await supabase
          .from("prospection_autopilot_config")
          .update({ last_run_at: now.toISOString() })
          .eq("id", config.id);

        results.push({
          user_id: userId,
          modes: enabledModes,
          campaign_id: campaign.id,
          prospects_found: personalizedMessages.length,
          outreach: outreachData,
        });
      } catch (e) {
        console.error(`Autopilot error for user ${config.user_id}:`, e);
        results.push({ user_id: config.user_id, status: "error", error: String(e) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Prospection autopilot error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
