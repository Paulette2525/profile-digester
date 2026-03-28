import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    if (!UNIPILE_DSN || !UNIPILE_API_KEY) throw new Error("Unipile credentials not configured");

    const res = await fetch(`https://${UNIPILE_DSN}/api/v1/users/me`, {
      headers: { "X-API-KEY": UNIPILE_API_KEY },
    });

    if (!res.ok) throw new Error(`Unipile error: ${res.status}`);

    const userData = await res.json();

    return new Response(JSON.stringify({
      followers: userData.followers_count || userData.follower_count || 0,
      connections: userData.connections_count || userData.connection_count || 0,
      name: userData.name || userData.display_name || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch account stats error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
