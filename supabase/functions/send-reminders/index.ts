// Supabase Edge Function: delivers due reminders over Web Push.
// Run it every minute (Supabase Scheduled Functions / pg_cron + pg_net) with the header `x-cron-secret: $CRON_SECRET`.
//
// Required secrets (names only; never commit values):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@example.com), CRON_SECRET
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Not verified end to end in development: it needs real VAPID keys and a device subscription.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Claimed = { user_id: string; key: string; title: string; body: string; url: string; endpoint: string; p256dh: string; auth: string };

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("forbidden", { status: 403 });

  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // Atomically claims due reminders (each is returned once) and marks long-overdue ones as skipped.
  const { data, error } = await sb.rpc("claim_due_reminders", { p_stale_after: "10 minutes" });
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0, gone = 0, failed = 0;
  for (const r of (data ?? []) as Claimed[]) {
    try {
      await webpush.sendNotification(
        { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
        JSON.stringify({ title: r.title, body: r.body, url: r.url, tag: r.key }),
        { TTL: 600, urgency: "normal" }, // expire quickly: a late prayer reminder is worse than none
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        gone++;
        await sb.from("push_subscriptions").delete().eq("user_id", r.user_id).eq("endpoint", r.endpoint);
      } else failed++;
    }
  }
  return Response.json({ sent, gone, failed });
});
