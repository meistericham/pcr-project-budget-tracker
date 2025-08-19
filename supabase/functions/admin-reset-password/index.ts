// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS helper
function cors(headers: Headers = new Headers()) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "authorization, x-admin-secret, content-type");
  return headers;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors() });
  }

  const headers = cors(new Headers({ "Content-Type": "application/json" }));

  try {
    // ---- ENV ----
    const SB_URL = Deno.env.get("SB_URL");
    const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY");
    const ADMIN_FUNCTION_SECRET = Deno.env.get("ADMIN_FUNCTION_SECRET");

    if (!SB_URL || !SB_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured: missing SB_URL / SB_SERVICE_ROLE_KEY" }), { status: 500, headers });
    }

    // ---- AuthZ (two paths) ----
    // A) Frontend call with a valid JWT (we *don't* enforce verification at edge, but we still verify role using DB)
    // B) Direct admin call with X-Admin-Secret header (for CLI/curl)
    const authz = req.headers.get("authorization") || "";
    const adminSecret = req.headers.get("x-admin-secret") || "";

    const adminClient = createClient(SB_URL, SB_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let isAllowed = false;

    if (adminSecret && ADMIN_FUNCTION_SECRET && adminSecret === ADMIN_FUNCTION_SECRET) {
      // Explicit admin secret allows operation (for CLI/curl)
      isAllowed = true;
    } else if (authz.toLowerCase().startsWith("bearer ")) {
      // Try to trust-but-verify the caller: extract the JWT and look up the user's role in the public.users table
      const jwt = authz.split(" ")[1] || "";
      // We won't verify cryptographically here (function deployed with --no-verify-jwt), but we can still
      // ask the DB who this user is by calling /auth.getUser() through an anon client… which we don't have here.
      // Instead: decode payload cheaply to get sub (no signature verify), then check users table with service role.
      try {
        const payloadBase64 = jwt.split(".")[1];
        if (payloadBase64) {
          const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payloadBase64), c => c.charCodeAt(0))));
          const sub = json?.sub as string | undefined;
          if (sub) {
            const { data: me, error: meErr } = await adminClient
              .from("users")
              .select("id, role")
              .eq("id", sub)
              .single();

            if (!meErr && me?.role === "super_admin") {
              isAllowed = true;
            }
          }
        }
      } catch {
        // ignore decode errors; will fall through to unauthorized
      }
    }

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    // ---- Payload ----
    const { email, newPassword } = await req.json().catch(() => ({}));
    if (!email || !newPassword) {
      return new Response(JSON.stringify({ error: "Missing email or newPassword" }), { status: 400, headers });
    }

    // ---- Admin auth actions ----
    // 1) Look up auth user by email
    const { data: existing, error: getErr } = await adminClient.auth.admin.getUserByEmail(email);
    if (getErr && getErr.message && !/User not found/i.test(getErr.message)) {
      // unexpected error
      return new Response(JSON.stringify({ error: `Lookup failed: ${getErr.message}` }), { status: 500, headers });
    }

    if (existing?.user?.id) {
      // 2a) Update password for existing user
      const { error: updErr } = await adminClient.auth.admin.updateUserById(existing.user.id, {
        password: newPassword
      });
      if (updErr) {
        return new Response(JSON.stringify({ error: `Update failed: ${updErr.message}` }), { status: 500, headers });
      }
      return new Response(JSON.stringify({ ok: true, mode: "updated", userId: existing.user.id }), { status: 200, headers });
    } else {
      // 2b) Create user if not found
      const { data: created, error: crtErr } = await adminClient.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true
      });
      if (crtErr) {
        return new Response(JSON.stringify({ error: `Create failed: ${crtErr.message}` }), { status: 500, headers });
      }
      return new Response(JSON.stringify({ ok: true, mode: "created", userId: created.user?.id }), { status: 200, headers });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), { status: 500, headers: cors() });
  }
});