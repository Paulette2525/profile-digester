import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateComment(postContent: string, tone: string, basePrompt: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  const toneInstructions: Record<string, string> = {
    professionnel: "Adopte un ton professionnel et sobre.",
    amical: "Adopte un ton amical et chaleureux.",
    expert: "Adopte un ton d'expert qui apporte une perspective éclairée.",
    enthousiaste: "Adopte un ton enthousiaste et énergique.",
  };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `${basePrompt}\n\n${toneInstructions[tone] || toneInstructions.professionnel}` },
          { role: "user", content: `Génère un commentaire LinkedIn court et naturel pour ce post:\n\n"${postContent.slice(0, 1500)}"` },
        ],
      }),
    });
    if (!res.ok) {
      console.error("AI gateway error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("AI generation error:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    // Determine target user(s)
    let targetUserIds: string[] = [];
    const authHeader = req.headers.get("Authorization");
    let body: any = {};
    try { body = await req.json(); } catch { /* cron call may have no body */ }

    if (authHeader && !body?.cron) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) targetUserIds = [user.id];
    }

    // If cron or no user, get all enabled configs
    if (targetUserIds.length === 0) {
      const { data: configs } = await adminClient
        .from("engaged_config")
        .select("user_id")
        .eq("enabled", true);
      targetUserIds = (configs || []).map((c) => c.user_id);
    }

    if (!UNIPILE_DSN || !UNIPILE_API_KEY) {
      return new Response(JSON.stringify({ error: "Unipile not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summary = { users_processed: 0, likes: 0, comments: 0, errors: 0, skipped: 0 };

    for (const userId of targetUserIds) {
      const { data: config } = await adminClient
        .from("engaged_config")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!config || !config.enabled) {
        summary.skipped++;
        continue;
      }

      // Daily comment limit check
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const { count: todayComments } = await adminClient
        .from("engaged_interactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action_type", "comment")
        .eq("status", "success")
        .gte("created_at", today.toISOString());

      let commentsRemaining = Math.max(0, config.daily_comment_limit - (todayComments || 0));

      // Get user's LinkedIn account
      const accountsRes = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts`, {
        headers: { "X-API-KEY": UNIPILE_API_KEY, accept: "application/json" },
      });
      const accountsData = await accountsRes.json();
      const linkedinAccount = accountsData?.items?.find((a: any) => a.type === "LINKEDIN");
      if (!linkedinAccount) {
        summary.skipped++;
        continue;
      }

      const { data: profiles } = await adminClient
        .from("engaged_profiles")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      for (const profile of profiles || []) {
        try {
          const providerId = profile.unipile_provider_id;
          if (!providerId) continue;

          const postsRes = await fetch(
            `https://${UNIPILE_DSN}/api/v1/users/${encodeURIComponent(providerId)}/posts?account_id=${linkedinAccount.id}&limit=5`,
            { headers: { "X-API-KEY": UNIPILE_API_KEY, accept: "application/json" } }
          );

          if (!postsRes.ok) {
            if (postsRes.status === 503 || postsRes.status === 504) {
              console.log(`Unipile degraded for profile ${profile.name}, skipping`);
              continue;
            }
            console.error(`Posts fetch error for ${profile.name}:`, postsRes.status);
            continue;
          }

          const postsData = await postsRes.json();
          const posts = postsData?.items || [];

          for (const post of posts) {
            const postId = post.id || post.social_id || post.share_url;
            if (!postId) continue;

            const postContent = post.text || post.content || "";
            const postUrl = post.share_url || post.permalink || `https://www.linkedin.com/feed/update/${postId}`;
            const preview = postContent.slice(0, 280);

            // LIKE
            if (profile.auto_like) {
              const { data: existingLike } = await adminClient
                .from("engaged_interactions")
                .select("id")
                .eq("user_id", userId)
                .eq("linkedin_post_id", postId)
                .eq("action_type", "like")
                .maybeSingle();

              if (!existingLike) {
                try {
                  const likeRes = await fetch(`https://${UNIPILE_DSN}/api/v1/posts/${encodeURIComponent(postId)}/reactions`, {
                    method: "POST",
                    headers: {
                      "X-API-KEY": UNIPILE_API_KEY,
                      "Content-Type": "application/json",
                      accept: "application/json",
                    },
                    body: JSON.stringify({ account_id: linkedinAccount.id, reaction_type: "LIKE" }),
                  });
                  const ok = likeRes.ok;
                  await adminClient.from("engaged_interactions").insert({
                    user_id: userId,
                    engaged_profile_id: profile.id,
                    linkedin_post_id: postId,
                    post_content_preview: preview,
                    post_url: postUrl,
                    action_type: "like",
                    status: ok ? "success" : "error",
                    error_message: ok ? null : `HTTP ${likeRes.status}`,
                  });
                  if (ok) summary.likes++;
                  else summary.errors++;
                } catch (e) {
                  summary.errors++;
                  console.error("Like error:", e);
                }
                await sleep(config.delay_between_actions_seconds * 1000);
              }
            }

            // COMMENT
            if (profile.auto_comment && commentsRemaining > 0) {
              const { data: existingComment } = await adminClient
                .from("engaged_interactions")
                .select("id")
                .eq("user_id", userId)
                .eq("linkedin_post_id", postId)
                .eq("action_type", "comment")
                .maybeSingle();

              if (!existingComment && postContent.length > 20) {
                const commentText = await generateComment(postContent, profile.comment_tone, config.comment_prompt);
                if (commentText) {
                  try {
                    const commentRes = await fetch(`https://${UNIPILE_DSN}/api/v1/posts/${encodeURIComponent(postId)}/comments`, {
                      method: "POST",
                      headers: {
                        "X-API-KEY": UNIPILE_API_KEY,
                        "Content-Type": "application/json",
                        accept: "application/json",
                      },
                      body: JSON.stringify({ account_id: linkedinAccount.id, text: commentText }),
                    });
                    const ok = commentRes.ok;
                    await adminClient.from("engaged_interactions").insert({
                      user_id: userId,
                      engaged_profile_id: profile.id,
                      linkedin_post_id: postId,
                      post_content_preview: preview,
                      post_url: postUrl,
                      action_type: "comment",
                      comment_text: commentText,
                      status: ok ? "success" : "error",
                      error_message: ok ? null : `HTTP ${commentRes.status}`,
                    });
                    if (ok) {
                      summary.comments++;
                      commentsRemaining--;
                    } else summary.errors++;
                  } catch (e) {
                    summary.errors++;
                    console.error("Comment error:", e);
                  }
                  await sleep(config.delay_between_actions_seconds * 1000);
                }
              }
            }
          }

          await adminClient
            .from("engaged_profiles")
            .update({ last_checked_at: new Date().toISOString() })
            .eq("id", profile.id);
        } catch (e) {
          console.error(`Profile ${profile.name} processing error:`, e);
          summary.errors++;
        }
      }

      summary.users_processed++;
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("engaged-run error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
