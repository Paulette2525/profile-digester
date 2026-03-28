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

    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'query' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchResponse = await fetch(
      `https://${UNIPILE_DSN}/api/v1/users/search?query=${encodeURIComponent(query)}&limit=10`,
      {
        headers: {
          "X-API-KEY": UNIPILE_API_KEY,
          Accept: "application/json",
        },
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Unipile search failed: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const data = await searchResponse.json();
    const items = data.items || data.data || [];

    const results = items.map((user: any) => ({
      id: user.id || user.account_id || "",
      name: user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      headline: user.headline || user.title || "",
      avatar_url: user.avatar_url || user.profile_picture_url || "",
      linkedin_url: user.url || user.linkedin_url || `https://linkedin.com/in/${user.public_identifier || user.id}`,
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
