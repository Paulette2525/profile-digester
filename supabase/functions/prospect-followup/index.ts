import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get LinkedIn account
    const accountRes = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts`, {
      headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
    });
    if (!accountRes.ok) throw new Error(`Failed to list accounts: ${accountRes.status}`);
    const accountData = await accountRes.json();
    const linkedinAccount = (accountData.items || []).find((a: any) => a.type === "LINKEDIN");
    if (!linkedinAccount) throw new Error("No LinkedIn account connected in Unipile");

    // Find messages due for follow-up: sent, not replied, next_followup_at <= now
    const { data: dueMessages, error: dueErr } = await supabase
      .from("prospection_messages")
      .select("*")
      .eq("status", "sent")
      .not("next_followup_at", "is", null)
      .lte("next_followup_at", new Date().toISOString());
    if (dueErr) throw dueErr;

    let sentCount = 0;
    let errorCount = 0;

    for (const msg of dueMessages || []) {
      try {
        const currentStep = msg.step_order || 1;
        const nextStepOrder = currentStep + 1;

        // Get the next sequence step for this campaign
        const { data: nextStepData } = await supabase
          .from("prospection_sequence_steps")
          .select("*")
          .eq("campaign_id", msg.campaign_id)
          .eq("step_order", nextStepOrder)
          .single();

        if (!nextStepData) {
          // No more steps, clear next_followup_at
          await supabase
            .from("prospection_messages")
            .update({ next_followup_at: null })
            .eq("id", msg.id);
          continue;
        }

        // Personalize the follow-up message
        const followupText = (nextStepData as any).message_template
          .replace("{name}", msg.prospect_name || "")
          .replace("{headline}", msg.prospect_headline || "");

        // Send via Unipile
        const sendRes = await fetch(`https://${UNIPILE_DSN}/api/v1/chats`, {
          method: "POST",
          headers: {
            "X-API-KEY": UNIPILE_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            account_id: linkedinAccount.id,
            attendees_ids: [msg.prospect_linkedin_url],
            text: followupText,
          }),
        });

        if (sendRes.ok) {
          // Check if there's yet another step after this one
          const { data: futureStep } = await supabase
            .from("prospection_sequence_steps")
            .select("*")
            .eq("campaign_id", msg.campaign_id)
            .eq("step_order", nextStepOrder + 1)
            .single();

          const now = new Date();
          const futureFollowupAt = futureStep
            ? new Date(now.getTime() + (futureStep as any).delay_days * 24 * 60 * 60 * 1000).toISOString()
            : null;

          // Create new message record for the follow-up
          await supabase.from("prospection_messages").insert({
            campaign_id: msg.campaign_id,
            user_id: msg.user_id,
            prospect_name: msg.prospect_name,
            prospect_headline: msg.prospect_headline,
            prospect_linkedin_url: msg.prospect_linkedin_url,
            prospect_avatar_url: msg.prospect_avatar_url,
            message_sent: followupText,
            status: "sent",
            step_order: nextStepOrder,
            sent_at: now.toISOString(),
            next_followup_at: futureFollowupAt,
          });

          // Clear next_followup_at on the original message
          await supabase
            .from("prospection_messages")
            .update({ next_followup_at: null })
            .eq("id", msg.id);

          sentCount++;
        } else {
          const errText = await sendRes.text();
          console.error(`Follow-up failed for ${msg.prospect_name}: ${errText}`);
          errorCount++;
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 5000));
      } catch (e) {
        console.error(`Error following up with ${msg.prospect_name}:`, e);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: (dueMessages || []).length,
        sent: sentCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Prospect followup error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
