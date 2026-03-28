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

    // 1. Find LinkedIn account
    const accountsRes = await fetchWithRetry(`https://${UNIPILE_DSN}/api/v1/accounts`, { headers });
    if (!accountsRes.ok) {
      return new Response(JSON.stringify({ followers: 0, connections: 0, name: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountsData = await accountsRes.json();
    const items = accountsData.items || [];
    const linkedin = items.find((a: any) => a.type === "LINKEDIN");

    if (!linkedin) {
      return new Response(JSON.stringify({ followers: 0, connections: 0, name: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = linkedin.name || "";
    const providerId = linkedin.connection_params?.im?.id || "";
    let followers = 0;
    let connections = 0;

    // 2. Get follower count via /api/v1/users/followers (limit=1 to just get the count/cursor)
    try {
      const followersRes = await fetchWithRetry(
        `https://${UNIPILE_DSN}/api/v1/users/followers?account_id=${linkedin.id}&limit=1`,
        { headers }
      );
      if (followersRes.ok) {
        const followersData = await followersRes.json();
        console.log("Followers response keys:", JSON.stringify(Object.keys(followersData)));
        // The response may have total_count, total, or items array length
        followers = followersData.total_count || followersData.total || followersData.count || 0;
        // If no total field, try checking if there's pagination info
        if (followers === 0 && followersData.paging?.total) {
          followers = followersData.paging.total;
        }
        console.log("Followers count:", followers);
      } else {
        console.error("Followers endpoint:", followersRes.status, await followersRes.text());
      }
    } catch (e) {
      console.error("Error fetching followers:", e);
    }

    // 3. Get connections count via /api/v1/connections
    try {
      const connectionsRes = await fetchWithRetry(
        `https://${UNIPILE_DSN}/api/v1/connections?account_id=${linkedin.id}&limit=1`,
        { headers }
      );
      if (connectionsRes.ok) {
        const connectionsData = await connectionsRes.json();
        console.log("Connections response keys:", JSON.stringify(Object.keys(connectionsData)));
        connections = connectionsData.total_count || connectionsData.total || connectionsData.count || 0;
        if (connections === 0 && connectionsData.paging?.total) {
          connections = connectionsData.paging.total;
        }
        console.log("Connections count:", connections);
      } else {
        console.error("Connections endpoint:", connectionsRes.status, await connectionsRes.text());
      }
    } catch (e) {
      console.error("Error fetching connections:", e);
    }

    // 4. Fallback: try user profile for network_info
    if (followers === 0 && connections === 0 && providerId) {
      try {
        const profileRes = await fetchWithRetry(
          `https://${UNIPILE_DSN}/api/v1/users/${providerId}?account_id=${linkedin.id}`,
          { headers }
        );
        if (profileRes.ok) {
          const profile = await profileRes.json();
          console.log("Profile response:", JSON.stringify(profile));
          followers = profile.followers_count || profile.follower_count || profile.network_info?.followers_count || 0;
          connections = profile.connections_count || profile.connection_count || profile.network_info?.connections_count || 0;
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
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
