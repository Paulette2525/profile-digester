import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!UNIPILE_API_KEY || !UNIPILE_DSN) throw new Error("UNIPILE credentials not configured");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: config } = await supabase.from("auto_engagement_config").select("*").limit(1).single();
    if (!config) throw new Error("No auto_engagement_config found");
    if (!config.auto_reply && !config.auto_dm && !config.auto_like) {
      return new Response(JSON.stringify({ message: "Aucune automation activée" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch post-specific DM rules
    const { data: dmRules } = await supabase.from("post_dm_rules").select("*").eq("is_active", true);
    const rulesByPostId = new Map<string, any[]>();
    (dmRules || []).forEach((r: any) => {
      const list = rulesByPostId.get(r.post_id) || [];
      list.push(r);
      rulesByPostId.set(r.post_id, list);
    });

    const { data: publishedPosts } = await supabase
      .from("linkedin_posts")
      .select("id, unipile_post_id, content")
      .not("unipile_post_id", "is", null)
      .order("posted_at", { ascending: false })
      .limit(20);

    if (!publishedPosts || publishedPosts.length === 0) {
      return new Response(JSON.stringify({ message: "Aucun post publié trouvé", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingLogs } = await supabase.from("auto_engagement_logs").select("comment_id, action_type");
    const processedSet = new Set((existingLogs || []).map((l) => `${l.comment_id}:${l.action_type}`));

    let totalProcessed = 0;
    const results: any[] = [];

    let linkedinAccountId: string | null = null;
    if (config.auto_dm || rulesByPostId.size > 0) {
      try {
        const accRes = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts`, {
          headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
        });
        const accData = await accRes.json();
        const linkedin = (accData.items || []).find((a: any) => a.type === "LINKEDIN");
        if (linkedin) linkedinAccountId = linkedin.id;
      } catch (e) {
        console.error("Failed to get LinkedIn account:", e);
      }
    }

    for (const post of publishedPosts) {
      if (!post.unipile_post_id) continue;

      let comments: any[] = [];
      try {
        const commentsRes = await fetch(
          `https://${UNIPILE_DSN}/api/v1/posts/${post.unipile_post_id}/comments`,
          { headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" } }
        );
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          comments = commentsData.items || commentsData || [];
        }
      } catch (e) {
        console.error(`Failed to fetch comments for post ${post.unipile_post_id}:`, e);
        continue;
      }

      const postRules = rulesByPostId.get(post.id) || [];

      for (const comment of comments) {
        const commentId = comment.id || comment.comment_id;
        if (!commentId) continue;

        const authorName = comment.author?.name || comment.author_name || "Inconnu";
        const authorUrl = comment.author?.linkedin_url || comment.author?.profile_url || null;
        const commentText = comment.text || comment.content || "";
        const authorProviderId = comment.author?.provider_id || comment.author?.id || null;
        const commentLower = commentText.toLowerCase();

        const likeDelay = config.like_delay_seconds ?? 5;
        const replyDelayS = config.reply_delay_seconds ?? 10;
        const dmDelayS = config.dm_delay_seconds ?? 15;

        // Auto-like
        if (config.auto_like && !processedSet.has(`${commentId}:like`)) {
          try {
            const likeRes = await fetch(
              `https://${UNIPILE_DSN}/api/v1/posts/comments/${commentId}/reactions`,
              {
                method: "POST",
                headers: { "X-API-KEY": UNIPILE_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ type: "LIKE" }),
              }
            );
            await supabase.from("auto_engagement_logs").insert({
              action_type: "like", post_id: post.id, comment_id: commentId,
              author_name: authorName, author_linkedin_url: authorUrl,
              status: likeRes.ok ? "success" : "error",
              error_message: likeRes.ok ? null : `HTTP ${likeRes.status}`,
            });
            results.push({ type: "like", author: authorName, ok: likeRes.ok });
            totalProcessed++;
            await new Promise(r => setTimeout(r, likeDelay * 1000));
          } catch (e) {
            await supabase.from("auto_engagement_logs").insert({
              action_type: "like", post_id: post.id, comment_id: commentId,
              author_name: authorName, status: "error", error_message: String(e),
            });
          }
        }

        // Auto-reply
        if (config.auto_reply && !processedSet.has(`${commentId}:reply`)) {
          try {
            const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "anthropic/claude-sonnet-4",
                messages: [
                  { role: "system", content: config.reply_prompt || "Tu es un community manager LinkedIn professionnel. Réponds de manière chaleureuse, pertinente et concise." },
                  { role: "user", content: `Post original:\n${post.content || ""}\n\nCommentaire de ${authorName}:\n${commentText}\n\nRéponds en français, naturellement. Maximum 2-3 phrases.` },
                ],
              }),
            });
            const aiData = await aiRes.json();
            const replyText = aiData.choices?.[0]?.message?.content || "";
            if (replyText) {
              const replyRes = await fetch(
                `https://${UNIPILE_DSN}/api/v1/posts/${post.unipile_post_id}/comments`,
                {
                  method: "POST",
                  headers: { "X-API-KEY": UNIPILE_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
                  body: JSON.stringify({ text: replyText, reply_to: commentId }),
                }
              );
              await supabase.from("auto_engagement_logs").insert({
                action_type: "reply", post_id: post.id, comment_id: commentId,
                author_name: authorName, author_linkedin_url: authorUrl,
                content_sent: replyText, status: replyRes.ok ? "success" : "error",
                error_message: replyRes.ok ? null : `HTTP ${replyRes.status}`,
              });
              results.push({ type: "reply", author: authorName, ok: replyRes.ok });
              totalProcessed++;
            }
          } catch (e) {
            await supabase.from("auto_engagement_logs").insert({
              action_type: "reply", post_id: post.id, comment_id: commentId,
              author_name: authorName, status: "error", error_message: String(e),
            });
          }
        }

        // Post-specific DM rules (priority over global DM)
        let dmRuleMatched = false;
        if (linkedinAccountId && authorProviderId && postRules.length > 0) {
          for (const rule of postRules) {
            if (commentLower.includes(rule.trigger_keyword.toLowerCase()) && !processedSet.has(`${commentId}:dm_rule`)) {
              dmRuleMatched = true;
              try {
                let dmText = rule.dm_message.replace("{author_name}", authorName);
                if (rule.resource_url) dmText += `\n\n${rule.resource_url}`;

                const chatRes = await fetch(`https://${UNIPILE_DSN}/api/v1/chats`, {
                  method: "POST",
                  headers: { "X-API-KEY": UNIPILE_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
                  body: JSON.stringify({ account_id: linkedinAccountId, attendees_ids: [authorProviderId], text: dmText }),
                });
                await supabase.from("auto_engagement_logs").insert({
                  action_type: "dm_rule", post_id: post.id, comment_id: commentId,
                  author_name: authorName, author_linkedin_url: authorUrl,
                  content_sent: dmText, status: chatRes.ok ? "success" : "error",
                  error_message: chatRes.ok ? null : `HTTP ${chatRes.status}`,
                });
                results.push({ type: "dm_rule", author: authorName, ok: chatRes.ok, keyword: rule.trigger_keyword });
                totalProcessed++;
              } catch (e) {
                await supabase.from("auto_engagement_logs").insert({
                  action_type: "dm_rule", post_id: post.id, comment_id: commentId,
                  author_name: authorName, status: "error", error_message: String(e),
                });
              }
              break; // Only first matching rule
            }
          }
        }

        // Global Auto-DM (only if no rule matched)
        if (!dmRuleMatched && config.auto_dm && linkedinAccountId && authorProviderId && !processedSet.has(`${commentId}:dm`)) {
          try {
            const dmText = (config.dm_template || "Bonjour {author_name}, merci pour votre commentaire !").replace("{author_name}", authorName);
            const chatRes = await fetch(`https://${UNIPILE_DSN}/api/v1/chats`, {
              method: "POST",
              headers: { "X-API-KEY": UNIPILE_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ account_id: linkedinAccountId, attendees_ids: [authorProviderId], text: dmText }),
            });
            await supabase.from("auto_engagement_logs").insert({
              action_type: "dm", post_id: post.id, comment_id: commentId,
              author_name: authorName, author_linkedin_url: authorUrl,
              content_sent: dmText, status: chatRes.ok ? "success" : "error",
              error_message: chatRes.ok ? null : `HTTP ${chatRes.status}`,
            });
            results.push({ type: "dm", author: authorName, ok: chatRes.ok });
            totalProcessed++;
          } catch (e) {
            await supabase.from("auto_engagement_logs").insert({
              action_type: "dm", post_id: post.id, comment_id: commentId,
              author_name: authorName, status: "error", error_message: String(e),
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `${totalProcessed} actions effectuées`, processed: totalProcessed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-engage error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
