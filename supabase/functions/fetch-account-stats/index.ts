import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, options);
    if (res.ok || i === retries) return res;
    if (res.status >= 500) {
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      continue;
    }
    return res;
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

    // List accounts to find the LinkedIn one
    const accountsRes = await fetchWithRetry(`https://${UNIPILE_DSN}/api/v1/accounts`, { headers });

    if (!accountsRes.ok) {
      console.error("Failed to list accounts:", accountsRes.status);
      // Graceful fallback
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

    return new Response(JSON.stringify({
      followers: linkedin.followers_count || linkedin.follower_count || 0,
      connections: linkedin.connections_count || linkedin.connection_count || 0,
      name: linkedin.name || linkedin.identifier || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch account stats error:", error);
    // Graceful fallback instead of 500
    return new Response(JSON.stringify({ followers: 0, connections: 0, name: "", error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
