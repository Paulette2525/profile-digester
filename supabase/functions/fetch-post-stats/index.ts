import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || i === retries) return res;
      if (res.status >= 500) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Unreachable");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    if (!UNIPILE_API_KEY || !UNIPILE_DSN) throw new Error("Unipile not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: publishedPosts, error: pErr } = await supabase
      .from("suggested_posts")
      .select("*")
      .eq("status", "published");
    if (pErr) throw pErr;

    if (!publishedPosts || publishedPosts.length === 0) {
      return new Response(JSON.stringify({ message: "No published posts to check" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" };

    // Get LinkedIn account
    const accountsRes = await fetchWithRetry(`https://${UNIPILE_DSN}/api/v1/accounts`, { headers });
    if (!accountsRes.ok) throw new Error(`Failed to list accounts: ${accountsRes.status}`);
    const accountsData = await accountsRes.json();
    const linkedin = (accountsData.items || []).find((a: any) => a.type === "LINKEDIN");
    if (!linkedin) throw new Error("No LinkedIn account connected");

    const providerId = linkedin.connection_params?.im?.id || linkedin.id;

    // Fetch own posts
    let linkedinPosts: any[] = [];
    const postsRes = await fetchWithRetry(
      `https://${UNIPILE_DSN}/api/v1/users/${providerId}/posts?account_id=${linkedin.id}&limit=50`,
      { headers }
    );
    if (postsRes.ok) {
      const postsData = await postsRes.json();
      linkedinPosts = postsData.items || postsData || [];
    } else {
      try {
        const postsRes2 = await fetchWithRetry(
          `https://${UNIPILE_DSN}/api/v1/posts?account_id=${linkedin.id}&limit=50`,
          { headers }
        );
        if (postsRes2.ok) {
          const postsData2 = await postsRes2.json();
          linkedinPosts = postsData2.items || postsData2 || [];
        }
      } catch (e) {
        console.error("Posts endpoint 2 error:", e);
      }
    }

    const results = [];

    for (const post of publishedPosts) {
      // Priority 1: match by unipile_post_id (exact)
      let matched: any = null;
      if (post.unipile_post_id) {
        matched = linkedinPosts.find((lp: any) => lp.id === post.unipile_post_id);
      }

      // Priority 2: fallback to content matching
      if (!matched) {
        const contentStart = (post.content || "").substring(0, 80).trim();
        matched = linkedinPosts.find((lp: any) => {
          const lpContent = (lp.text || lp.content || lp.body || "").substring(0, 80).trim();
          return lpContent === contentStart ||
                 lpContent.includes(contentStart.substring(0, 50)) ||
                 contentStart.includes(lpContent.substring(0, 50));
        });
      }

      if (matched) {
        const likes = matched.reaction_counter ?? matched.likes_count ?? matched.num_likes ?? 0;
        const comments = matched.comment_counter ?? matched.comments_count ?? matched.num_comments ?? 0;
        const shares = matched.repost_counter ?? matched.shares_count ?? matched.num_shares ?? 0;
        const impressions = matched.impressions_counter ?? matched.impressions_count ?? matched.views ?? 0;

        const performance = {
          likes,
          comments,
          shares,
          impressions,
          actual_score: Math.min(100, Math.round((likes * 2 + comments * 3 + shares * 5) / Math.max(1, 10))),
          fetched_at: new Date().toISOString(),
        };

        // Also save unipile_post_id if we matched by content but didn't have it
        const updatePayload: any = { post_performance: performance };
        if (!post.unipile_post_id && matched.id) {
          updatePayload.unipile_post_id = matched.id;
        }

        await supabase
          .from("suggested_posts")
          .update(updatePayload)
          .eq("id", post.id);

        results.push({ id: post.id, matched: true, performance });
      } else {
        results.push({ id: post.id, matched: false });
      }
    }

    return new Response(JSON.stringify({ success: true, total_linkedin_posts: linkedinPosts.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch post stats error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
