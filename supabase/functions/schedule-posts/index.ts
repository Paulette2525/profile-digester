import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { schedule } = await req.json();
    if (!schedule || !Array.isArray(schedule)) throw new Error("Missing schedule array");

    const results = [];
    for (const item of schedule) {
      const { post_id, scheduled_at } = item;
      if (!post_id || !scheduled_at) continue;

      const { error } = await supabase
        .from("suggested_posts")
        .update({ status: "scheduled", scheduled_at })
        .eq("id", post_id);

      results.push({ post_id, success: !error, error: error?.message });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Schedule posts error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
