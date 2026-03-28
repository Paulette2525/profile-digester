import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");
    if (!UNIPILE_API_KEY || !UNIPILE_DSN) throw new Error("Unipile credentials not configured");

    const headers = { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" };

    // Find LinkedIn account
    const accountsRes = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts`, { headers });
    if (!accountsRes.ok) throw new Error(`Failed to list accounts: ${accountsRes.status}`);

    const accountsData = await accountsRes.json();
    const linkedin = (accountsData.items || []).find((a: any) => a.type === "LINKEDIN");
    if (!linkedin) {
      return new Response(JSON.stringify({ success: true, message: "No LinkedIn account found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete the account
    const deleteRes = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts/${linkedin.id}`, {
      method: "DELETE",
      headers,
    });

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      console.error("Delete account error:", errText);
      throw new Error(`Failed to delete account: ${deleteRes.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Disconnect error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
