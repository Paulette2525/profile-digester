import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UPSTREAM_UNAVAILABLE_STATUSES = new Set([502, 503, 504]);

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || i === retries) return res;
      if (UPSTREAM_UNAVAILABLE_STATUSES.has(res.status)) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return res;
    } catch (error) {
      if (i === retries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }

  throw new Error("Unreachable");
}

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

    const res = await fetchWithRetry(`https://${UNIPILE_DSN}/api/v1/accounts`, {
      headers: {
        "X-API-KEY": UNIPILE_API_KEY,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const reason = UPSTREAM_UNAVAILABLE_STATUSES.has(res.status)
        ? "upstream_unavailable"
        : res.status === 401 || res.status === 403
          ? "auth_error"
          : "unknown_error";

      console.error(`Unipile API error: ${res.status} – reason: ${reason}`);

      return new Response(
        JSON.stringify({
          connected: false,
          degraded: true,
          reason,
          status: res.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const items = data.items || [];
    const linkedin = items.find((a: any) => a.type === "LINKEDIN");

    if (linkedin) {
      return new Response(
        JSON.stringify({
          connected: true,
          account: {
            id: linkedin.id,
            name: linkedin.name || linkedin.identifier || "Compte LinkedIn",
            status: linkedin.status || "OK",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ connected: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check connection error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});