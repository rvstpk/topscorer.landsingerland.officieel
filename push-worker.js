/**
 * PUSH-WORKER (gratis, Cloudflare Workers)
 *
 * Dit kleine programma staat tussen jouw website en OneSignal. Je OneSignal-sleutel staat
 * alleen hier (als geheime instelling), nooit in je website. Alleen ingelogde beheerders
 * van jouw website kunnen er een pushmelding mee versturen.
 *
 * Instellingen (Cloudflare > je worker > Settings > Variables and Secrets):
 *   ONESIGNAL_API_KEY    (Secret)  OneSignal > Settings > Keys & IDs > REST API Key
 *   ONESIGNAL_APP_ID     (Text)    jouw OneSignal App ID
 *   FIREBASE_PROJECT_ID  (Text)    topscorerslandsingerland
 *   ALLOWED_ORIGIN       (Text)    https://rvstpk.github.io   (alleen het domein, zonder pad)
 *   SITE_URL             (Text, optioneel) adres dat opent als je op de melding tikt
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  s += "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function cors(env, origin) {
  const ok = origin && origin === env.ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": ok ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(env, req, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env, req.headers.get("Origin")) },
  });
}

// Controleert of het inlogbewijs echt van Firebase komt en voor jouw project is.
async function verifyIdToken(token, env) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("ongeldig token");
  const header = JSON.parse(dec.decode(b64u(parts[0])));
  const payload = JSON.parse(dec.decode(b64u(parts[1])));
  if (header.alg !== "RS256") throw new Error("ongeldig algoritme");

  const res = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    { cf: { cacheTtl: 3600, cacheEverything: true } }
  );
  const jwk = (await res.json()).keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("onbekende sleutel");
  const key = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, b64u(parts[2]), enc.encode(parts[0] + "." + parts[1])
  );
  if (!valid) throw new Error("handtekening klopt niet");

  const now = Math.floor(Date.now() / 1000);
  const pid = env.FIREBASE_PROJECT_ID;
  if (payload.aud !== pid || payload.iss !== "https://securetoken.google.com/" + pid) throw new Error("verkeerd project");
  if (!payload.sub || payload.exp < now || payload.iat > now + 300) throw new Error("token verlopen");
  return payload;
}

// Leest het spelersdocument van de ingelogde gebruiker (met zijn eigen inlog, dus via jouw Firestore-regels).
async function isAdmin(uid, token, env) {
  const url =
    "https://firestore.googleapis.com/v1/projects/" + env.FIREBASE_PROJECT_ID +
    "/databases/(default)/documents/players/" + encodeURIComponent(uid);
  const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) return false;
  const d = await r.json();
  return !!(d.fields && d.fields.admin && d.fields.admin.booleanValue === true);
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, req.headers.get("Origin")) });
    if (req.method !== "POST") return json(env, req, 405, { ok: false, error: "alleen POST" });
    if (req.headers.get("Origin") !== env.ALLOWED_ORIGIN) return json(env, req, 403, { ok: false, error: "niet toegestaan vanaf dit adres" });

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    let user;
    try { user = await verifyIdToken(token, env); }
    catch (e) { return json(env, req, 401, { ok: false, error: "niet ingelogd" }); }
    if (!(await isAdmin(user.sub, token, env))) return json(env, req, 403, { ok: false, error: "alleen beheerders" });

    let b;
    try { b = await req.json(); } catch (e) { return json(env, req, 400, { ok: false, error: "ongeldig bericht" }); }
    const text = String(b.text || "").trim().slice(0, 500);
    if (!text) return json(env, req, 400, { ok: false, error: "leeg bericht" });
    const title = String(b.title || "Topscorers Landsingerland").slice(0, 80);

    const payload = {
      app_id: env.ONESIGNAL_APP_ID,
      target_channel: "push",
      headings: { en: title, nl: title },
      contents: { en: text, nl: text },
    };
    if (env.SITE_URL) payload.url = env.SITE_URL;

    if (b.all === true) {
      payload.included_segments = ["Total Subscriptions"];
    } else {
      const to = Array.isArray(b.to) ? b.to.filter((x) => typeof x === "string" && x.length < 200).slice(0, 1000) : [];
      if (!to.length) return json(env, req, 400, { ok: false, error: "geen ontvangers" });
      payload.include_aliases = { external_id: to };
    }

    const r = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Key " + env.ONESIGNAL_API_KEY },
      body: JSON.stringify(payload),
    });
    const o = await r.json().catch(() => ({}));
    if (!r.ok) return json(env, req, 502, { ok: false, error: "OneSignal weigert het bericht", detail: o.errors || o });
    // geen ontvangers = niemand heeft meldingen aangezet (of is nog niet ingelogd op zijn telefoon)
    return json(env, req, 200, { ok: true, id: o.id || null, recipients: typeof o.recipients === "number" ? o.recipients : null, warn: o.errors || null });
  },
};
