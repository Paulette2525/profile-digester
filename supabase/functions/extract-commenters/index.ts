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
  const linkedin = (data.items || []).find((a: any) => a.type === "LINKEDIN");
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
    const { post_id, limit: requestedLimit } = body;
    const totalLimit = Math.max(Number(requestedLimit) || 50, 1);

    if (!post_id || typeof post_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'post_id' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountId = await getLinkedInAccountId(UNIPILE_DSN, UNIPILE_API_KEY);

    // Fetch comments with pagination
    const profilesMap = new Map<string, any>();
    let cursor: string | null = null;

    while (profilesMap.size < totalLimit) {
      const url = new URL(`https://${UNIPILE_DSN}/api/v1/posts/${post_id}/comments`);
      url.searchParams.set("account_id", accountId);
      url.searchParams.set("limit", "50");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetch(url.toString(), {
        headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Comments fetch error:", errText);
        throw new Error(`Failed to fetch comments: ${res.status}`);
      }

      const data = await res.json();
      const items = data.items || data.data || [];

      for (const comment of items) {
        const authorId = comment.author?.id || comment.author?.provider_id;
        if (!authorId || profilesMap.has(authorId)) continue;

        profilesMap.set(authorId, {
          id: authorId,
          name: comment.author?.name || `${comment.author?.first_name || ""} ${comment.author?.last_name || ""}`.trim(),
          headline: comment.author?.headline || comment.author?.title || "",
          avatar_url: comment.author?.profile_picture_url || comment.author?.avatar_url || "",
          linkedin_url: comment.author?.public_profile_url || comment.author?.url || `https://linkedin.com/in/${comment.author?.public_identifier || authorId}`,
        });

        if (profilesMap.size >= totalLimit) break;
      }

      cursor = data.cursor || data.next_cursor || null;
      if (!cursor || items.length < 50) break;
    }

    // Also fetch reactions
    try {
      let reactionCursor: string | null = null;
      while (profilesMap.size < totalLimit) {
        const url = new URL(`https://${UNIPILE_DSN}/api/v1/posts/${post_id}/reactions`);
        url.searchParams.set("account_id", accountId);
        url.searchParams.set("limit", "50");
        if (reactionCursor) url.searchParams.set("cursor", reactionCursor);

        const res = await fetch(url.toString(), {
          headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
        });

        if (!res.ok) break;

        const data = await res.json();
        const items = data.items || data.data || [];

        for (const reaction of items) {
          const authorId = reaction.author?.id || reaction.author?.provider_id || reaction.id;
          if (!authorId || profilesMap.has(authorId)) continue;

          profilesMap.set(authorId, {
            id: authorId,
            name: reaction.author?.name || reaction.name || "",
            headline: reaction.author?.headline || reaction.headline || "",
            avatar_url: reaction.author?.profile_picture_url || reaction.profile_picture_url || "",
            linkedin_url: reaction.author?.public_profile_url || `https://linkedin.com/in/${authorId}`,
          });

          if (profilesMap.size >= totalLimit) break;
        }

        reactionCursor = data.cursor || data.next_cursor || null;
        if (!reactionCursor || items.length < 50) break;
      }
    } catch (e) {
      console.error("Reactions fetch error (non-blocking):", e);
    }

    const results = Array.from(profilesMap.values()).slice(0, totalLimit);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Extract commenters error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
