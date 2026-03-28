import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    if (!UNIPILE_DSN || !UNIPILE_API_KEY) throw new Error("Unipile credentials not configured");

    const headers = { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" };

    // 1. List accounts to find LinkedIn
    const accountsRes = await fetchWithRetry(`https://${UNIPILE_DSN}/api/v1/accounts`, { headers });
    if (!accountsRes.ok) {
      console.error("Failed to list accounts:", accountsRes.status);
      return new Response(JSON.stringify({ followers: 0, connections: 0, name: "", error: "unipile_unavailable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountsData = await accountsRes.json();
    const items = accountsData.items || [];
    const linkedin = items.find((a: any) => a.type === "LINKEDIN");

    if (!linkedin) {
      return new Response(JSON.stringify({ followers: 0, connections: 0, name: "", error: "no_linkedin_account" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log full account object to identify available fields
    console.log("LinkedIn account object:", JSON.stringify(linkedin));

    // Extract stats from account object first
    let followers = linkedin.followers_count || linkedin.follower_count || linkedin.followers || 0;
    let connections = linkedin.connections_count || linkedin.connection_count || linkedin.connections || 0;
    const name = linkedin.name || linkedin.identifier || "";

    // 2. If stats are 0, try fetching user profile for detailed stats
    if (followers === 0 && connections === 0) {
      try {
        const profileRes = await fetchWithRetry(
          `https://${UNIPILE_DSN}/api/v1/users/me?account_id=${linkedin.id}`,
          { headers }
        );
        if (profileRes.ok) {
          const profile = await profileRes.json();
          console.log("User profile response:", JSON.stringify(profile));
          followers = profile.followers_count || profile.follower_count || profile.followers || profile.network_info?.followers_count || 0;
          connections = profile.connections_count || profile.connection_count || profile.connections || profile.network_info?.connections_count || 0;
        } else {
          console.error("Profile endpoint returned:", profileRes.status);
        }
      } catch (e) {
        console.error("Error fetching user profile:", e);
      }
    }

    // 3. If still 0, try individual account endpoint
    if (followers === 0 && connections === 0) {
      try {
        const detailRes = await fetchWithRetry(
          `https://${UNIPILE_DSN}/api/v1/accounts/${linkedin.id}`,
          { headers }
        );
        if (detailRes.ok) {
          const detail = await detailRes.json();
          console.log("Account detail response:", JSON.stringify(detail));
          followers = detail.followers_count || detail.follower_count || detail.followers || 0;
          connections = detail.connections_count || detail.connection_count || detail.connections || 0;
        }
      } catch (e) {
        console.error("Error fetching account detail:", e);
      }
    }

    return new Response(JSON.stringify({ followers, connections, name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch account stats error:", error);
    return new Response(JSON.stringify({ followers: 0, connections: 0, name: "", error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
