import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { form_slug, data } = await req.json();

    if (!form_slug || typeof form_slug !== "string") {
      return new Response(JSON.stringify({ error: "form_slug requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data || typeof data !== "object") {
      return new Response(JSON.stringify({ error: "data requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the form
    const { data: form, error: formErr } = await supabase
      .from("lead_forms")
      .select("id, user_id, is_active, fields_config")
      .eq("form_slug", form_slug)
      .single();

    if (formErr || !form) {
      return new Response(JSON.stringify({ error: "Formulaire introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!form.is_active) {
      return new Response(JSON.stringify({ error: "Ce formulaire est désactivé" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required fields
    const fields = (form.fields_config || []) as any[];
    for (const field of fields) {
      if (field.required && (!data[field.name] || String(data[field.name]).trim() === "")) {
        return new Response(JSON.stringify({ error: `Le champ "${field.label}" est requis` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Insert lead
    const { error: insertErr } = await supabase.from("leads").insert({
      user_id: form.user_id,
      form_id: form.id,
      data,
      email: data.email || null,
      phone: data.phone || data.telephone || null,
      company: data.company || data.entreprise || null,
      linkedin_url: data.linkedin_url || data.linkedin || null,
      source: `form:${form_slug}`,
      status: "new",
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Erreur lors de l'enregistrement" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
