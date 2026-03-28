import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get all published posts
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

    // Get LinkedIn account
    const accountsRes = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts`, {
      headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
    });
    if (!accountsRes.ok) throw new Error(`Failed to list accounts: ${accountsRes.status}`);
    const accountsData = await accountsRes.json();
    const linkedinAccount = (accountsData.items || []).find((a: any) => a.type === "LINKEDIN");
    if (!linkedinAccount) throw new Error("No LinkedIn account connected");

    // Fetch recent posts from the account to match
    const postsRes = await fetch(
      `https://${UNIPILE_DSN}/api/v1/users/${linkedinAccount.provider_id || linkedinAccount.id}/posts?limit=50`,
      { headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" } }
    );

    let linkedinPosts: any[] = [];
    if (postsRes.ok) {
      const postsData = await postsRes.json();
      linkedinPosts = postsData.items || postsData || [];
      console.log(`Fetched ${linkedinPosts.length} LinkedIn posts for stats matching`);
    } else {
      console.error("Failed to fetch LinkedIn posts:", postsRes.status, await postsRes.text());
    }

    const results = [];

    for (const post of publishedPosts) {
      // Try to match by content similarity (first 100 chars)
      const contentStart = post.content?.substring(0, 100) || "";
      const matched = linkedinPosts.find((lp: any) => {
        const lpContent = lp.text || lp.content || "";
        return lpContent.substring(0, 100) === contentStart;
      });

      if (matched) {
        const likes = matched.likes_count ?? matched.likeCount ?? matched.reactions_count ?? 0;
        const comments = matched.comments_count ?? matched.commentCount ?? 0;
        const shares = matched.shares_count ?? matched.shareCount ?? matched.reposts_count ?? 0;
        const impressions = matched.impressions_count ?? matched.views ?? matched.impression_count ?? 0;

        const performance = {
          likes,
          comments,
          shares,
          impressions,
          actual_score: Math.min(100, Math.round((likes * 2 + comments * 3 + shares * 5) / 10)),
          fetched_at: new Date().toISOString(),
        };

        await supabase
          .from("suggested_posts")
          .update({ post_performance: performance })
          .eq("id", post.id);

        results.push({ id: post.id, matched: true, performance });
      } else {
        results.push({ id: post.id, matched: false });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch post stats error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
