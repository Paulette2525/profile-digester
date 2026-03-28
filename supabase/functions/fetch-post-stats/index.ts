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

    // Use the correct provider ID from connection_params
    const providerId = linkedin.connection_params?.im?.id || linkedin.id;
    console.log("Using provider ID for posts:", providerId);

    // Fetch own posts - try multiple endpoint formats
    let linkedinPosts: any[] = [];
    
    // Try 1: /api/v1/users/{providerId}/posts with account_id
    const postsRes = await fetchWithRetry(
      `https://${UNIPILE_DSN}/api/v1/users/${providerId}/posts?account_id=${linkedin.id}&limit=50`,
      { headers }
    );
    
    if (postsRes.ok) {
      const postsData = await postsRes.json();
      linkedinPosts = postsData.items || postsData || [];
      console.log(`Fetched ${linkedinPosts.length} posts via /users/{id}/posts`);
    } else {
      const errText = await postsRes.text();
      console.error("Posts endpoint 1 failed:", postsRes.status, errText);
      
      // Try 2: /api/v1/posts with account_id
      try {
        const postsRes2 = await fetchWithRetry(
          `https://${UNIPILE_DSN}/api/v1/posts?account_id=${linkedin.id}&limit=50`,
          { headers }
        );
        if (postsRes2.ok) {
          const postsData2 = await postsRes2.json();
          linkedinPosts = postsData2.items || postsData2 || [];
          console.log(`Fetched ${linkedinPosts.length} posts via /posts`);
        } else {
          console.error("Posts endpoint 2 failed:", postsRes2.status, await postsRes2.text());
        }
      } catch (e) {
        console.error("Posts endpoint 2 error:", e);
      }
    }

    if (linkedinPosts.length > 0) {
      // Log first post structure for debugging
      console.log("Sample post keys:", JSON.stringify(Object.keys(linkedinPosts[0])));
      console.log("Sample post:", JSON.stringify(linkedinPosts[0]).substring(0, 500));
    }

    const results = [];

    for (const post of publishedPosts) {
      const contentStart = (post.content || "").substring(0, 80).trim();
      
      // Match by content similarity (first 80 chars, normalized)
      const matched = linkedinPosts.find((lp: any) => {
        const lpContent = (lp.text || lp.content || lp.body || "").substring(0, 80).trim();
        return lpContent === contentStart || 
               lpContent.includes(contentStart.substring(0, 50)) ||
               contentStart.includes(lpContent.substring(0, 50));
      });

      if (matched) {
        const likes = matched.likes_count ?? matched.likeCount ?? matched.reactions_count ?? matched.num_likes ?? 0;
        const comments = matched.comments_count ?? matched.commentCount ?? matched.num_comments ?? 0;
        const shares = matched.shares_count ?? matched.shareCount ?? matched.reposts_count ?? matched.num_shares ?? 0;
        const impressions = matched.impressions_count ?? matched.views ?? matched.impression_count ?? matched.num_impressions ?? 0;

        const performance = {
          likes,
          comments,
          shares,
          impressions,
          actual_score: Math.min(100, Math.round((likes * 2 + comments * 3 + shares * 5) / Math.max(1, 10))),
          fetched_at: new Date().toISOString(),
        };

        await supabase
          .from("suggested_posts")
          .update({ post_performance: performance })
          .eq("id", post.id);

        results.push({ id: post.id, matched: true, performance });
      } else {
        results.push({ id: post.id, matched: false, content_preview: contentStart.substring(0, 40) });
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
