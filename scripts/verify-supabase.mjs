#!/usr/bin/env node
/**
 * Checks a REAL Supabase project against what VAYVOR expects. Run it only against the intended VAYVOR project.
 *
 *   VAYVOR_SUPABASE_URL=https://<ref>.supabase.co VAYVOR_PROJECT_REF=<ref> VAYVOR_SUPABASE_ANON_KEY=... \
 *   node scripts/verify-supabase.mjs                      # read-only checks (anonymous)
 *   ... VERIFY_A_EMAIL=.. VERIFY_A_PASSWORD=.. VERIFY_B_EMAIL=.. VERIFY_B_PASSWORD=.. node scripts/verify-supabase.mjs --write
 *
 * `--write` signs in as two THROWAWAY, already-confirmed test accounts and writes a few rows under the collection
 * "verify". It never uses a service-role key and never prints keys or tokens. Exit code is non-zero if any check fails.
 * Email delivery, Google sign-in, push delivery and real-device behaviour cannot be checked here: see
 * docs/SUPABASE-SETUP.md for the manual steps.
 */
const url = (process.env.VAYVOR_SUPABASE_URL ?? "").replace(/\/$/, "");
const ref = process.env.VAYVOR_PROJECT_REF ?? "";
const anon = process.env.VAYVOR_SUPABASE_ANON_KEY ?? "";
const write = process.argv.includes("--write");

const die = (m) => {
  console.error(`ABORT: ${m}`);
  process.exit(2);
};
if (!url || !ref || !anon)
  die("set VAYVOR_SUPABASE_URL, VAYVOR_PROJECT_REF and VAYVOR_SUPABASE_ANON_KEY.");
let host;
try {
  host = new URL(url).hostname;
} catch {
  die("VAYVOR_SUPABASE_URL is not a URL.");
}
const local = process.env.VAYVOR_ALLOW_LOCAL === "1" && /^(localhost|127\.0\.0\.1)$/.test(host);
if (!local && host !== `${ref}.supabase.co`)
  die(
    `the URL host (${host}) is not the project ref you named (${ref}.supabase.co). Refusing to touch another project.`,
  );
if (
  /service_role/i.test(anon) ||
  (anon.split(".").length === 3 &&
    (() => {
      try {
        return (
          JSON.parse(Buffer.from(anon.split(".")[1], "base64url").toString()).role ===
          "service_role"
        );
      } catch {
        return false;
      }
    })())
)
  die("that looks like a service-role key. Use the public anon key only.");

const results = [];
const rec = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(
    `${ok === null ? "SKIP" : ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`,
  );
};

async function call(path, { method = "GET", token, body, headers = {} } = {}) {
  const res = await fetch(url + path, {
    method,
    headers: {
      apikey: anon,
      authorization: `Bearer ${token ?? anon}`,
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, json };
}
const denied = (r) => r.status === 401 || r.status === 403 || r.json?.code === "42501";
const missing = (r) => r.status === 404 || r.json?.code === "PGRST202" || r.json?.code === "42P01";
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

// --- anonymous ---------------------------------------------------------------------------------------------
const settings = await call("/auth/v1/settings");
if (settings.status === 200) {
  const s = settings.json ?? {};
  rec("Auth settings reachable", true);
  rec(
    "Email sign-up with confirmation required (autoconfirm off)",
    s.mailer_autoconfirm === false,
    `mailer_autoconfirm=${s.mailer_autoconfirm}`,
  );
  rec("Public sign-up enabled", s.disable_signup === false, `disable_signup=${s.disable_signup}`);
  const g = s.external?.google;
  rec(
    "Google provider enabled (only needed if VITE_AUTH_PROVIDERS lists google)",
    g === undefined ? null : g === true,
    `external.google=${g}`,
  );
} else rec("Auth settings reachable", false, `HTTP ${settings.status}`);

for (const [migration, fn, args] of [
  [
    "0003",
    "push_mutation",
    {
      p_collection: "verify",
      p_id: "x",
      p_op: "put",
      p_data: {},
      p_base_rev: 0,
      p_mid: "anon-check",
    },
  ],
  ["0005", "username_available", { p_username: "verify_anon" }],
  [
    "0005",
    "create_profile",
    { p_username: "verify_anon", p_display_name: "x", p_timezone: "Europe/London" },
  ],
  ["0004", "replace_reminders", { p_items: [] }],
  ["0004", "claim_due_reminders", {}],
  ["0006", "circle_find_people", { p_query: "verify" }],
  ["0006", "circle_my_connections", {}],
  ["0006", "circle_my_blocks", {}],
  ["0006", "circle_send_request", { p_user_id: ZERO_UUID }],
  ["0006", "circle_respond_request", { p_user_id: ZERO_UUID, p_accept: false }],
  ["0006", "circle_remove_connection", { p_user_id: ZERO_UUID }],
  ["0006", "circle_block", { p_user_id: ZERO_UUID }],
  ["0006", "circle_unblock", { p_user_id: ZERO_UUID }],
  [
    "0006",
    "circle_share",
    {
      p_kind: "milestone",
      p_title: "verify",
      p_body: null,
      p_metric_label: null,
      p_metric_value: null,
      p_source_date: null,
    },
  ],
  ["0006", "circle_delete_post", { p_post_id: ZERO_UUID }],
  ["0006", "circle_toggle_kudos", { p_post_id: ZERO_UUID }],
  ["0006", "circle_feed", { p_before: null, p_limit: 1 }],
  ["0007", "circle_chat_threads", {}],
  ["0007", "circle_chat_messages", { p_user_id: ZERO_UUID, p_before: null, p_limit: 1 }],
  ["0007", "circle_chat_send", { p_user_id: ZERO_UUID, p_body: "verify" }],
  ["0007", "circle_chat_mark_read", { p_user_id: ZERO_UUID }],
  ["0007", "circle_chat_delete", { p_message_id: ZERO_UUID }],
  [
    "0008",
    "circle_challenge_create",
    {
      p_user_id: ZERO_UUID,
      p_title: "verify",
      p_unit: "sessions",
      p_target: 1,
      p_ends_on: "2099-01-01",
    },
  ],
  ["0008", "circle_challenge_respond", { p_challenge_id: ZERO_UUID, p_accept: false }],
  ["0008", "circle_challenges", {}],
  ["0008", "circle_challenge_entries", { p_challenge_id: ZERO_UUID }],
  ["0008", "circle_challenge_add", { p_challenge_id: ZERO_UUID, p_amount: 1, p_note: "verify" }],
  ["0008", "circle_challenge_delete_entry", { p_entry_id: ZERO_UUID }],
  ["0008", "circle_challenge_close", { p_challenge_id: ZERO_UUID }],
]) {
  const r = await call(`/rest/v1/rpc/${fn}`, { method: "POST", body: args });
  if (missing(r))
    rec(
      `Migration applied: ${fn} exists`,
      false,
      `function not found: apply migration ${migration}`,
    );
  else rec(`Anonymous cannot call ${fn}`, denied(r), `HTTP ${r.status}`);
}
for (const [migration, t] of [
  ["0003", "records"],
  ["0003", "mutation_log"],
  ["0005", "profiles"],
  ["0004", "push_subscriptions"],
  ["0004", "scheduled_reminders"],
  ["0006", "circle_blocks"],
  ["0006", "circle_connections"],
  ["0006", "circle_posts"],
  ["0006", "circle_kudos"],
  ["0007", "circle_messages"],
  ["0008", "circle_challenges"],
  ["0008", "circle_challenge_entries"],
]) {
  const r = await call(`/rest/v1/${t}?select=*&limit=1`);
  if (missing(r))
    rec(`Migration applied: table ${t} exists`, false, `apply migration ${migration}`);
  else
    rec(
      `Anonymous cannot read ${t}`,
      denied(r) || (r.status === 200 && Array.isArray(r.json) && r.json.length === 0),
      `HTTP ${r.status}`,
    );
}

// --- authenticated (opt-in) --------------------------------------------------------------------------------
async function login(prefix) {
  const email = process.env[`${prefix}_EMAIL`],
    password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) return null;
  const r = await call("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  return r.status === 200 ? { token: r.json.access_token, id: r.json.user.id } : null;
}
if (!write)
  rec(
    "Authenticated checks (isolation, sync, profiles)",
    null,
    "re-run with --write and two throwaway test accounts",
  );
else {
  const A = await login("VERIFY_A"),
    B = await login("VERIFY_B");
  if (!A || !B)
    rec(
      "Two confirmed test accounts can sign in",
      false,
      "set VERIFY_A_* and VERIFY_B_* to confirmed throwaway accounts",
    );
  else {
    rec("Two confirmed test accounts can sign in", A.id !== B.id);
    const id = `v-${Date.now()}`;
    const push = (u, mid, data, base = 0, col = "verify", op = "put") =>
      call("/rest/v1/rpc/push_mutation", {
        method: "POST",
        token: u.token,
        body: {
          p_collection: col,
          p_id: id,
          p_op: op,
          p_data: data,
          p_base_rev: base,
          p_mid: mid,
        },
      });
    const a1 = await push(A, `${id}-1`, { who: "A" });
    rec("A can push a record", a1.json?.status === "applied", JSON.stringify(a1.json));
    const a1b = await push(A, `${id}-1`, { who: "A" });
    rec(
      "Retrying the same mutation is idempotent",
      a1b.json?.status === "duplicate",
      JSON.stringify(a1b.json),
    );
    const stale = await push(A, `${id}-2`, { who: "A2" }, 0);
    rec(
      "A stale write is a conflict, not an overwrite",
      stale.json?.status === "conflict",
      JSON.stringify(stale.json),
    );
    const priv = await push(A, `${id}-p`, { text: "private" }, 0, "mind");
    rec(
      "A can store a private mind record",
      priv.json?.status === "applied",
      JSON.stringify(priv.json),
    );
    const readA = await call(
      `/rest/v1/records?select=collection,id&collection=eq.verify&id=eq.${id}`,
      { token: A.token },
    );
    rec(
      "A can read back its own record",
      readA.status === 200 && readA.json?.length === 1,
      `HTTP ${readA.status}`,
    );
    const readB = await call(
      `/rest/v1/records?select=collection,id&or=(id.eq.${id},collection.eq.mind)`,
      { token: B.token },
    );
    rec(
      "B cannot read A's records (including private mind records)",
      readB.status === 200 && readB.json?.length === 0,
      `HTTP ${readB.status}, rows ${readB.json?.length}`,
    );
    const b1 = await push(B, `${id}-1`, { who: "B" });
    rec(
      "B can write the same collection/id independently",
      b1.json?.status === "applied",
      JSON.stringify(b1.json),
    );
    const stillA = await call(`/rest/v1/records?select=data&collection=eq.verify&id=eq.${id}`, {
      token: A.token,
    });
    rec(
      "A's data is unchanged after B's write",
      stillA.json?.[0]?.data?.who === "A",
      JSON.stringify(stillA.json),
    );
    const direct = await call("/rest/v1/records", {
      method: "POST",
      token: A.token,
      body: { collection: "verify", id: "direct", data: {} },
    });
    rec(
      "Direct table writes are blocked (only the RPC writes)",
      denied(direct),
      `HTTP ${direct.status}`,
    );
    const claim = await call("/rest/v1/rpc/claim_due_reminders", {
      method: "POST",
      token: A.token,
      body: {},
    });
    rec(
      "Signed-in users cannot claim reminders (service role only)",
      denied(claim),
      `HTTP ${claim.status}`,
    );
    const del = await push(A, `${id}-d`, null, a1.json?.rev ?? 1, "verify", "delete");
    rec(
      "A can delete (tombstone) its record",
      del.json?.status === "applied",
      JSON.stringify(del.json),
    );
    const hA = `verify_${Math.random().toString(36).slice(2, 8)}`;
    const avail = await call("/rest/v1/rpc/username_available", {
      method: "POST",
      token: A.token,
      body: { p_username: hA },
    });
    rec(
      "Handle availability works for signed-in users",
      avail.json === true,
      JSON.stringify(avail.json),
    );
  }
}

const failed = results.filter((r) => r.ok === false).length;
console.log(
  `\n${results.filter((r) => r.ok).length} passed, ${failed} failed, ${results.filter((r) => r.ok === null).length} skipped.`,
);
console.log(
  "Not covered here (manual): confirmation and recovery emails, Google sign-in, push delivery, real-device behaviour.",
);
process.exit(failed ? 1 : 0);
