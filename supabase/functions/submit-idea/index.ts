import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const keywordMap: Record<string, string> = {
  tutorial: "GUIDE",
  viral: "LIEN",
  storytelling: "RESSOURCE",
  news: "ARTICLE",
  autre: "LIEN",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, idea_text, content_type, resource_url } = await req.json();

    if (!user_id || typeof user_id !== "string") {
      return new Response(JSON.stringify({ error: "user_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!idea_text || typeof idea_text !== "string" || idea_text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "idea_text requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeType = ["tutorial", "viral", "storytelling", "news", "autre"].includes(content_type)
      ? content_type
      : "autre";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert the idea
    const { error: insertErr } = await supabase.from("content_ideas").insert({
      user_id,
      idea_text: idea_text.trim(),
      content_type: safeType,
      resource_url: resource_url?.trim() || null,
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Erreur lors de l'enregistrement" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-create DM rule if resource_url is provided
    if (resource_url && resource_url.trim()) {
      const trimmedUrl = resource_url.trim();

      // Check for existing rule with same resource_url for this user
      const { data: existing } = await supabase
        .from("post_dm_rules")
        .select("id")
        .eq("user_id", user_id)
        .eq("resource_url", trimmedUrl)
        .limit(1);

      if (!existing || existing.length === 0) {
        const keyword = keywordMap[safeType] || "LIEN";
        const dmMessage = `Bonjour {author_name} ! 👋 Merci pour ton intérêt. Voici la ressource : ${trimmedUrl}\n\nN'hésite pas si tu as des questions !`;

        await supabase.from("post_dm_rules").insert({
          user_id,
          trigger_keyword: keyword,
          dm_message: dmMessage,
          resource_url: trimmedUrl,
          is_active: true,
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
