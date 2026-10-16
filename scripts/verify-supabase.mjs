#!/usr/bin/env node
/**
 * Checks a REAL Supabase project against what VAYVOR expects. Run it only against the intended VAYVOR project.
 *
 *   VAYVOR_SUPABASE_URL=https://<ref>.supabase.co VAYVOR_PROJECT_REF=<ref> VAYVOR_SUPABASE_ANON_KEY=... \
 *   node scripts/verify-supabase.mjs                      # read-only checks (anonymous)
 *   ... VERIFY_A_EMAIL=.. VERIFY_A_PASSWORD=.. VERIFY_B_EMAIL=.. VERIFY_B_PASSWORD=.. node scripts/verify-supabase.mjs --write
 *
 * `--write` signs in as two THROWAWAY, already-confirmed test accounts and exercises private sync plus Circle,
 * chat, challenge and game records. It cleans up the social relationship and content afterwards, but creates profiles when
 * absent and leaves sync tombstones. It never uses a service-role key or prints keys/tokens. Exit code is non-zero
 * if any check fails.
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
  ["0009", "circle_four_create", { p_user_id: ZERO_UUID, p_creator_dare: "Verifier dare" }],
  ["0009", "circle_four_respond", { p_game_id: ZERO_UUID, p_accept: false, p_invited_dare: null }],
  ["0009", "circle_four_games", {}],
  ["0009", "circle_four_move", { p_game_id: ZERO_UUID, p_column: 0 }],
  ["0009", "circle_four_close", { p_game_id: ZERO_UUID }],
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
  ["0009", "circle_four_games"],
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
const okResponse = (response) => response.status >= 200 && response.status < 300;
const rpc = (name, user, body = {}) =>
  call(`/rest/v1/rpc/${name}`, { method: "POST", token: user.token, body });
const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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

    const ensureProfile = async (user, suffix) => {
      const response = await rpc("create_profile", user, {
        p_username: `verify_${suffix}_${Math.random().toString(36).slice(2, 8)}`,
        p_display_name: `Verifier ${suffix}`,
        p_timezone: "Europe/London",
      });
      return okResponse(response) || response.json?.message === "profile_exists";
    };
    const profilesReady = (await ensureProfile(A, "a")) && (await ensureProfile(B, "b"));
    rec("Both test accounts have Circle profiles", profilesReady);

    if (profilesReady) {
      // Throwaway accounts only: start from a known relationship state and clean it again at the end.
      await rpc("circle_unblock", A, { p_user_id: B.id });
      await rpc("circle_unblock", B, { p_user_id: A.id });
      await rpc("circle_remove_connection", A, { p_user_id: B.id });

      const requested = await rpc("circle_send_request", A, { p_user_id: B.id });
      rec(
        "A can send B a connection request",
        requested.json === "outgoing",
        JSON.stringify(requested.json),
      );
      const accepted = await rpc("circle_respond_request", B, {
        p_user_id: A.id,
        p_accept: true,
      });
      rec(
        "B can accept A's connection request",
        accepted.json === "connected",
        JSON.stringify(accepted.json),
      );

      const priorGames = await rpc("circle_four_games", A);
      if (Array.isArray(priorGames.json)) {
        for (const game of priorGames.json.filter(
          (item) => item.other_user_id === B.id && ["pending", "active"].includes(item.status),
        )) {
          await rpc("circle_four_close", A, { p_game_id: game.id });
        }
      }

      const post = await rpc("circle_share", A, {
        p_kind: "milestone",
        p_title: "Verifier post",
        p_body: "Created by the VAYVOR real-project verification script.",
        p_metric_label: null,
        p_metric_value: null,
        p_source_date: null,
      });
      rec("A can share a Circle post", isUuid(post.json), JSON.stringify(post.json));
      const feed = await rpc("circle_feed", B, { p_before: null, p_limit: 20 });
      rec(
        "B can see A's post while connected",
        Array.isArray(feed.json) && feed.json.some((item) => item.id === post.json),
        `HTTP ${feed.status}`,
      );
      const kudos = isUuid(post.json)
        ? await rpc("circle_toggle_kudos", B, { p_post_id: post.json })
        : { status: 0, json: null };
      rec("B can give kudos to A's post", kudos.json === true, JSON.stringify(kudos.json));

      const message = await rpc("circle_chat_send", A, {
        p_user_id: B.id,
        p_body: "Verifier message",
      });
      rec("A can message B", isUuid(message.json), JSON.stringify(message.json));
      const messages = await rpc("circle_chat_messages", B, {
        p_user_id: A.id,
        p_before: null,
        p_limit: 10,
      });
      rec(
        "B can read A's message",
        Array.isArray(messages.json) && messages.json.some((item) => item.id === message.json),
        `HTTP ${messages.status}`,
      );
      const marked = await rpc("circle_chat_mark_read", B, { p_user_id: A.id });
      rec("B can mark the thread read", Number(marked.json) >= 1, JSON.stringify(marked.json));

      const endsOn = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
      const challenge = await rpc("circle_challenge_create", A, {
        p_user_id: B.id,
        p_title: "Verifier challenge",
        p_unit: "sessions",
        p_target: 3,
        p_ends_on: endsOn,
      });
      rec("A can invite B to a challenge", isUuid(challenge.json), JSON.stringify(challenge.json));
      const challengeAccepted = isUuid(challenge.json)
        ? await rpc("circle_challenge_respond", B, {
            p_challenge_id: challenge.json,
            p_accept: true,
          })
        : { status: 0, json: null };
      rec(
        "B can accept A's challenge",
        challengeAccepted.json === "active",
        JSON.stringify(challengeAccepted.json),
      );
      const progress = isUuid(challenge.json)
        ? await rpc("circle_challenge_add", A, {
            p_challenge_id: challenge.json,
            p_amount: 1,
            p_note: "Verifier progress",
          })
        : { status: 0, json: null };
      rec("A can add challenge progress", isUuid(progress.json), JSON.stringify(progress.json));
      const challengeList = await rpc("circle_challenges", B);
      rec(
        "B sees the accepted challenge and A's progress",
        Array.isArray(challengeList.json) &&
          challengeList.json.some(
            (item) => item.id === challenge.json && Number(item.their_progress) === 1,
          ),
        `HTTP ${challengeList.status}`,
      );

      const game = await rpc("circle_four_create", A, {
        p_user_id: B.id,
        p_creator_dare: "Take a twenty-minute verifier walk",
      });
      rec("A can invite B to Four in a Row", isUuid(game.json), JSON.stringify(game.json));
      const gameAccepted = isUuid(game.json)
        ? await rpc("circle_four_respond", B, {
            p_game_id: game.json,
            p_accept: true,
            p_invited_dare: "Prepare tomorrow's verifier lunch",
          })
        : { status: 0, json: null };
      rec(
        "B can accept with a self-authored dare",
        gameAccepted.json === "active",
        JSON.stringify(gameAccepted.json),
      );
      const gameMove = isUuid(game.json)
        ? await rpc("circle_four_move", A, { p_game_id: game.json, p_column: 0 })
        : { status: 0, json: null };
      rec(
        "A can make a server-validated move",
        gameMove.json === "active",
        JSON.stringify(gameMove.json),
      );
      const gameList = await rpc("circle_four_games", B);
      rec(
        "B sees the move and receives the next turn",
        Array.isArray(gameList.json) &&
          gameList.json.some(
            (item) =>
              item.id === game.json && item.my_turn === true && Number(item.board?.[35]) === 1,
          ),
        `HTTP ${gameList.status}`,
      );

      const directPost = await call("/rest/v1/circle_posts", {
        method: "POST",
        token: A.token,
        body: { author_id: A.id, kind: "milestone", title: "Direct write" },
      });
      rec(
        "Direct Circle table writes are blocked",
        denied(directPost),
        `HTTP ${directPost.status}`,
      );

      const blocked = await rpc("circle_block", B, { p_user_id: A.id });
      const blockedFeed = await rpc("circle_feed", B, { p_before: null, p_limit: 20 });
      const blockedGames = await rpc("circle_four_games", B);
      rec(
        "Blocking ends the connection and hides A's post and game",
        okResponse(blocked) &&
          Array.isArray(blockedFeed.json) &&
          !blockedFeed.json.some((item) => item.id === post.json) &&
          Array.isArray(blockedGames.json) &&
          !blockedGames.json.some((item) => item.id === game.json),
        `block HTTP ${blocked.status}, feed HTTP ${blockedFeed.status}, games HTTP ${blockedGames.status}`,
      );

      await rpc("circle_unblock", B, { p_user_id: A.id });
      if (isUuid(progress.json))
        await rpc("circle_challenge_delete_entry", A, { p_entry_id: progress.json });
      if (isUuid(challenge.json))
        await rpc("circle_challenge_close", A, { p_challenge_id: challenge.json });
      if (isUuid(game.json)) await rpc("circle_four_close", A, { p_game_id: game.json });
      if (isUuid(message.json)) await rpc("circle_chat_delete", A, { p_message_id: message.json });
      if (isUuid(post.json)) await rpc("circle_delete_post", A, { p_post_id: post.json });
      await rpc("circle_remove_connection", A, { p_user_id: B.id });
    }
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
