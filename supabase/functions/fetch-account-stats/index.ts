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
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    if (!UNIPILE_DSN || !UNIPILE_API_KEY) throw new Error("Unipile credentials not configured");

    // Extract user from JWT
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (_) {}
    }

    const uHeaders = { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" };

    // 1. Find LinkedIn account
    const accountsRes = await fetchWithRetry(`https://${UNIPILE_DSN}/api/v1/accounts`, { headers: uHeaders });
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

    // 2. Get follower count
    try {
      const followersRes = await fetchWithRetry(
        `https://${UNIPILE_DSN}/api/v1/users/followers?account_id=${linkedin.id}&limit=1`,
        { headers: uHeaders }
      );
      if (followersRes.ok) {
        const followersData = await followersRes.json();
        followers = followersData.total_count || followersData.total || followersData.count || 0;
        if (followers === 0 && followersData.paging?.total) {
          followers = followersData.paging.total;
        }
      }
    } catch (e) {
      console.error("Error fetching followers:", e);
    }

    // 3. Get connections count
    try {
      const connectionsRes = await fetchWithRetry(
        `https://${UNIPILE_DSN}/api/v1/connections?account_id=${linkedin.id}&limit=1`,
        { headers: uHeaders }
      );
      if (connectionsRes.ok) {
        const connectionsData = await connectionsRes.json();
        connections = connectionsData.total_count || connectionsData.total || connectionsData.count || 0;
        if (connections === 0 && connectionsData.paging?.total) {
          connections = connectionsData.paging.total;
        }
      }
    } catch (e) {
      console.error("Error fetching connections:", e);
    }

    // 4. Fallback: try user profile
    if (followers === 0 && connections === 0 && providerId) {
      try {
        const profileRes = await fetchWithRetry(
          `https://${UNIPILE_DSN}/api/v1/users/${providerId}?account_id=${linkedin.id}`,
          { headers: uHeaders }
        );
        if (profileRes.ok) {
          const profile = await profileRes.json();
          followers = profile.followers_count || profile.follower_count || profile.network_info?.followers_count || 0;
          connections = profile.connections_count || profile.connection_count || profile.network_info?.connections_count || 0;
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      }
    }

    // 5. Save snapshot to account_stats_history (upsert by user+date)
    if (userId && (followers > 0 || connections > 0)) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabaseAdmin.from("account_stats_history").upsert(
          {
            user_id: userId,
            followers,
            connections,
            snapshot_date: new Date().toISOString().split("T")[0],
          },
          { onConflict: "user_id,snapshot_date" }
        );
        console.log("Saved stats snapshot:", { followers, connections });
      } catch (e) {
        console.error("Error saving snapshot:", e);
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
