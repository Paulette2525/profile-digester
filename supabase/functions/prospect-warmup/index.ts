import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    if (!UNIPILE_API_KEY || !UNIPILE_DSN) {
      throw new Error("UNIPILE_API_KEY or UNIPILE_DSN not configured");
    }

    const { prospect_ids, account_id } = await req.json();
    if (!prospect_ids || !Array.isArray(prospect_ids) || prospect_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or empty prospect_ids array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get LinkedIn account ID if not provided
    let linkedinAccountId = account_id;
    if (!linkedinAccountId) {
      const accountRes = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts`, {
        headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
      });
      if (!accountRes.ok) throw new Error(`Failed to list accounts: ${accountRes.status}`);
      const accountData = await accountRes.json();
      const linkedin = (accountData.items || []).find((a: any) => a.type === "LINKEDIN");
      if (!linkedin) throw new Error("No LinkedIn account connected in Unipile");
      linkedinAccountId = linkedin.id;
    }

    const results: any[] = [];
    const DELAY_MS = 7000; // 7s between actions to avoid LinkedIn restrictions

    for (const prospectId of prospect_ids) {
      const result: any = { prospect_id: prospectId, visited: false, liked_posts: 0, errors: [] };

      try {
        // Step 1: Visit profile (triggers LinkedIn notification)
        const visitRes = await fetch(
          `https://${UNIPILE_DSN}/api/v1/users/${prospectId}?account_id=${linkedinAccountId}`,
          {
            headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
          }
        );
        if (visitRes.ok) {
          result.visited = true;
        } else {
          const errText = await visitRes.text();
          result.errors.push(`Visit failed: ${visitRes.status} ${errText}`);
        }

        await new Promise((r) => setTimeout(r, DELAY_MS));

        // Step 2: Get recent posts
        const postsRes = await fetch(
          `https://${UNIPILE_DSN}/api/v1/users/${prospectId}/posts?account_id=${linkedinAccountId}&limit=3`,
          {
            headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
          }
        );

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          const posts = (postsData.items || postsData.data || []).slice(0, 2);

          // Step 3: Like 1-2 posts
          for (const post of posts) {
            const postId = post.id || post.provider_id;
            if (!postId) continue;

            await new Promise((r) => setTimeout(r, DELAY_MS));

            const likeRes = await fetch(
              `https://${UNIPILE_DSN}/api/v1/posts/${postId}/reactions`,
              {
                method: "POST",
                headers: {
                  "X-API-KEY": UNIPILE_API_KEY,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  account_id: linkedinAccountId,
                  type: "LIKE",
                }),
              }
            );

            if (likeRes.ok) {
              result.liked_posts++;
            } else {
              const errText = await likeRes.text();
              result.errors.push(`Like failed for post ${postId}: ${likeRes.status} ${errText}`);
            }
          }
        } else {
          const errText = await postsRes.text();
          result.errors.push(`Posts fetch failed: ${postsRes.status} ${errText}`);
        }
      } catch (e) {
        result.errors.push(`Error: ${String(e)}`);
      }

      results.push(result);

      // Delay between prospects
      if (prospect_ids.indexOf(prospectId) < prospect_ids.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Prospect warmup error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
