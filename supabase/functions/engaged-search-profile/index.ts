import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { linkedin_url } = await req.json();
    if (!linkedin_url || typeof linkedin_url !== "string") {
      return new Response(JSON.stringify({ error: "linkedin_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    if (!UNIPILE_DSN || !UNIPILE_API_KEY) {
      return new Response(JSON.stringify({ error: "Unipile not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user's linkedin account_id from Unipile
    const accountsRes = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts`, {
      headers: { "X-API-KEY": UNIPILE_API_KEY, accept: "application/json" },
    });
    const accountsData = await accountsRes.json();
    const linkedinAccount = accountsData?.items?.find((a: any) => a.type === "LINKEDIN");
    if (!linkedinAccount) {
      return new Response(JSON.stringify({ error: "No LinkedIn account connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract identifier from linkedin URL
    const match = linkedin_url.match(/linkedin\.com\/in\/([^/?#]+)/i);
    const identifier = match ? match[1] : linkedin_url;

    const profileRes = await fetch(
      `https://${UNIPILE_DSN}/api/v1/users/${encodeURIComponent(identifier)}?account_id=${linkedinAccount.id}`,
      { headers: { "X-API-KEY": UNIPILE_API_KEY, accept: "application/json" } }
    );

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error("Unipile profile fetch error:", profileRes.status, errText);
      if (profileRes.status === 503 || profileRes.status === 504) {
        return new Response(JSON.stringify({ degraded: true, error: "Unipile temporarily unavailable" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = await profileRes.json();

    return new Response(
      JSON.stringify({
        name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.name || "Inconnu",
        avatar_url: profile.profile_picture_url || profile.profile_picture_url_large || null,
        headline: profile.headline || profile.occupation || null,
        unipile_provider_id: profile.provider_id || profile.public_identifier || identifier,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("engaged-search-profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
