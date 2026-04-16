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

    const { campaign_id, daily_limit = 50, delay_seconds = 3 } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "Missing campaign_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check campaign status and warmup config
    const { data: campaignData } = await supabase
      .from("prospection_campaigns")
      .select("status, warmup_enabled, warmup_delay_hours")
      .eq("id", campaign_id)
      .single();
    if (campaignData?.status === "paused") {
      return new Response(JSON.stringify({ error: "Campaign is paused" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get LinkedIn account ID
    const accountRes = await fetch(`https://${UNIPILE_DSN}/api/v1/accounts`, {
      headers: { "X-API-KEY": UNIPILE_API_KEY, Accept: "application/json" },
    });
    if (!accountRes.ok) throw new Error(`Failed to list accounts: ${accountRes.status}`);
    const accountData = await accountRes.json();
    const linkedinAccount = (accountData.items || []).find((a: any) => a.type === "LINKEDIN");
    if (!linkedinAccount) throw new Error("No LinkedIn account connected in Unipile");

    // Fetch sequence steps for this campaign
    const { data: sequenceSteps } = await supabase
      .from("prospection_sequence_steps")
      .select("*")
      .eq("campaign_id", campaign_id)
      .order("step_order", { ascending: true });

    // Fetch pending messages for step 1
    const { data: messages, error: msgErr } = await supabase
      .from("prospection_messages")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending")
      .eq("step_order", 1);
    if (msgErr) throw msgErr;

    let sentCount = 0;
    let errorCount = 0;

    // Find next step after step 1
    const nextStep = (sequenceSteps || []).find((s: any) => s.step_order === 2);

    // Warmup phase if enabled
    const warmupEnabled = (campaignData as any)?.warmup_enabled === true;
    if (warmupEnabled && messages && messages.length > 0) {
      const prospectIds = messages
        .filter((m: any) => m.prospect_linkedin_url && (!m.warmup_status || m.warmup_status === null))
        .map((m: any) => m.prospect_linkedin_url);

      if (prospectIds.length > 0) {
        try {
          const warmupRes = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/prospect-warmup`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ prospect_ids: prospectIds.slice(0, 10) }),
            }
          );

          if (warmupRes.ok) {
            // Mark messages as warmed
            for (const msg of messages.filter((m: any) => prospectIds.includes(m.prospect_linkedin_url))) {
              await supabase
                .from("prospection_messages")
                .update({ warmup_status: "warmed" })
                .eq("id", msg.id);
            }
          }
        } catch (e) {
          console.error("Warmup error (non-blocking):", e);
        }

        // Wait warmup delay
        const delayHours = (campaignData as any)?.warmup_delay_hours || 2;
        // For now, log the intended delay - actual delay would be via cron
        console.log(`Warmup done. Intended delay: ${delayHours}h before sending.`);
      }
    }

    for (const msg of (messages || []).slice(0, daily_limit)) {
      try {
        const sendRes = await fetch(
          `https://${UNIPILE_DSN}/api/v1/chats`,
          {
            method: "POST",
            headers: {
              "X-API-KEY": UNIPILE_API_KEY,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              account_id: linkedinAccount.id,
              attendees_ids: [msg.prospect_linkedin_url],
              text: msg.message_sent,
            }),
          }
        );

        if (sendRes.ok) {
          // Calculate next_followup_at if there's a next step
          const now = new Date();
          const nextFollowupAt = nextStep
            ? new Date(now.getTime() + nextStep.delay_days * 24 * 60 * 60 * 1000).toISOString()
            : null;

          await supabase
            .from("prospection_messages")
            .update({
              status: "sent",
              sent_at: now.toISOString(),
              next_followup_at: nextFollowupAt,
            })
            .eq("id", msg.id);
          sentCount++;
        } else {
          const errText = await sendRes.text();
          console.error(`Failed to send to ${msg.prospect_name}: ${errText}`);
          await supabase
            .from("prospection_messages")
            .update({ status: "error" })
            .eq("id", msg.id);
          errorCount++;
        }

        await new Promise((r) => setTimeout(r, delay_seconds * 1000));
      } catch (e) {
        console.error(`Error sending to ${msg.prospect_name}:`, e);
        await supabase
          .from("prospection_messages")
          .update({ status: "error" })
          .eq("id", msg.id);
        errorCount++;
      }
    }

    // Update campaign stats
    await supabase
      .from("prospection_campaigns")
      .update({
        sent_count: sentCount,
        status: errorCount === (messages?.length || 0) ? "error" : "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, errors: errorCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Prospect outreach error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
