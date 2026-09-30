// push-dispatch: turns a new inbox row into a phone buzz.
//
// Called by a Supabase Database Webhook on INSERT into public.notifications
// (Dashboard > Database > Webhooks). The row is already in the inbox by the
// time this runs; all this decides is whether the phone should also buzz.
//
// WHAT IT SENDS. Never the row's title or body. Those can name a report, and a
// push shows on a locked screen that anyone at the dinner table can read. Each
// category has one generic line instead, and the tap opens the app, behind the
// app lock, on the right screen. The only exception is `updates`, whose rows
// never carry anything personal ("Dietitian consults is live on Cheeku").
//
// WHO GETS IT. Only if the account's preference for that category is on, and
// only to phones registered through register_push_device(). Tokens Expo says
// are dead are deleted so they stop costing a request every time.
//
// Deploy:  supabase functions deploy push-dispatch --no-verify-jwt
// Secrets: supabase secrets set PUSH_WEBHOOK_SECRET=<long random string>
//          (optional) EXPO_ACCESS_TOKEN if push security is enabled in Expo
// Webhook: table notifications, event INSERT, type Supabase Edge Function,
//          header  x-webhook-secret: <the same string>

type Row = {
  id: string;
  user_id: string;
  kind: string;
  category: "reports" | "appointments" | "family" | "account" | "updates";
  title: string;
  route: string | null;
  created_at: string;
  read_at: string | null;
};

const PREF_FOR: Record<Row["category"], string> = {
  reports: "reportNotifications",
  appointments: "appointmentReminders",
  family: "familyActivity",
  account: "accountSecurity",
  updates: "productUpdates",
};

// Kept in step with DEFAULT_PREFS in the app (src/lib/settings/queries.ts).
const DEFAULTS: Record<string, boolean> = {
  reportNotifications: false,
  appointmentReminders: true,
  familyActivity: false,
  accountSecurity: true,
  productUpdates: false,
};

const COPY: Record<Row["category"], { title: string; body: string }> = {
  reports: { title: "Cheeku has an update on a report", body: "Tap to see it in the app." },
  appointments: { title: "An update on your appointment", body: "Tap to see the details." },
  family: { title: "Something new in your family's files", body: "Tap to have a look." },
  account: { title: "An update on your account", body: "Tap to review it in Cheeku AI." },
  updates: { title: "News from Cheeku", body: "Tap to have a look." },
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
const EXPO_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN");

function rest(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

Deno.serve(async (req) => {
  // Constant-time enough for a shared secret of fixed length; the point is that
  // nobody on the internet can make this function spam someone's phone.
  if (!SECRET || req.headers.get("x-webhook-secret") !== SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  const payload = (await req.json().catch(() => null)) as { type?: string; record?: Row } | null;
  const row = payload?.record;
  if (payload?.type !== "INSERT" || !row) return new Response("ignored", { status: 200 });

  // Backfilled or already-read rows, and anything older than an hour (a
  // webhook retried long after the fact), never buzz.
  if (row.read_at || Date.now() - new Date(row.created_at).getTime() > 60 * 60 * 1000) {
    return new Response("stale", { status: 200 });
  }

  const famRes = await rest(`families?owner_id=eq.${row.user_id}&select=notification_prefs`);
  const fam = ((await famRes.json()) as { notification_prefs: Record<string, boolean> | null }[])[0];
  const key = PREF_FOR[row.category];
  const prefs = { ...DEFAULTS, ...(fam?.notification_prefs ?? {}) };
  if (!prefs[key]) return new Response("muted", { status: 200 });

  const devRes = await rest(`push_devices?user_id=eq.${row.user_id}&select=token`);
  const devices = (await devRes.json()) as { token: string }[];
  if (devices.length === 0) return new Response("no devices", { status: 200 });

  const copy = row.category === "updates" ? { title: row.title, body: COPY.updates.body } : COPY[row.category];

  const messages = devices.map((d) => ({
    to: d.token,
    title: copy.title,
    body: copy.body,
    sound: "default",
    channelId: row.category === "appointments" ? "appointments" : "default",
    // Ids only. The app looks the row up after the lock, it does not trust
    // anything a push carried.
    data: { notificationId: row.id, url: row.route ?? "/notifications" },
  }));

  const sent = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(EXPO_TOKEN ? { Authorization: `Bearer ${EXPO_TOKEN}` } : {}),
    },
    body: JSON.stringify(messages),
  });

  const result = (await sent.json().catch(() => null)) as {
    data?: { status: string; details?: { error?: string } }[];
  } | null;

  // Prune phones that uninstalled or revoked permission.
  const dead = (result?.data ?? [])
    .map((t, i) => (t.status === "error" && t.details?.error === "DeviceNotRegistered" ? devices[i]?.token : null))
    .filter((t): t is string => Boolean(t));
  if (dead.length > 0) {
    await rest(`push_devices?token=in.(${dead.map((t) => `"${t}"`).join(",")})`, { method: "DELETE" });
  }

  return new Response(JSON.stringify({ sent: messages.length, pruned: dead.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
