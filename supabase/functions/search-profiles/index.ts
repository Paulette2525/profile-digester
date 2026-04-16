import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getLinkedInAccountId(dsn: string, apiKey: string): Promise<string> {
  const res = await fetch(`https://${dsn}/api/v1/accounts`, {
    headers: { "X-API-KEY": apiKey, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to list accounts: ${res.status}`);
  const data = await res.json();
  const items = data.items || [];
  const linkedin = items.find((a: any) => a.type === "LINKEDIN");
  if (!linkedin) throw new Error("No LinkedIn account connected in Unipile");
  return linkedin.id;
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

    const body = await req.json();
    const { query, limit: requestedLimit, company_id } = body;
    const totalLimit = Math.max(Number(requestedLimit) || 10, 1);
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'query' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountId = await getLinkedInAccountId(UNIPILE_DSN, UNIPILE_API_KEY);

    const allResults: any[] = [];
    let cursor: string | null = null;
    const PAGE_SIZE = Math.min(totalLimit, 50);

    while (allResults.length < totalLimit) {
      const url = new URL(`https://${UNIPILE_DSN}/api/v1/linkedin/search`);
      url.searchParams.set("account_id", accountId);
      url.searchParams.set("limit", String(PAGE_SIZE));
      if (cursor) url.searchParams.set("cursor", cursor);

      const searchBody: any = {
        api: "classic",
        category: "people",
        keywords: query,
      };
      if (company_id) {
        searchBody.company_id = company_id;
      }

      const searchResponse = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "X-API-KEY": UNIPILE_API_KEY,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchBody),
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error("Unipile search error:", errorText);
        throw new Error(`Unipile search failed: ${searchResponse.status} ${searchResponse.statusText}`);
      }

      const data = await searchResponse.json();
      const items = data.items || data.data || [];
      allResults.push(...items);

      cursor = data.cursor || data.next_cursor || null;
      if (!cursor || items.length < PAGE_SIZE) break;
    }

    const results = allResults.slice(0, totalLimit).map((user: any) => ({
      id: user.id || user.provider_id || "",
      name: user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      headline: user.headline || user.title || "",
      avatar_url: user.profile_picture_url || user.avatar_url || "",
      linkedin_url: user.public_profile_url || user.url || `https://linkedin.com/in/${user.public_identifier || user.id}`,
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
