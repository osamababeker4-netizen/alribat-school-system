import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "content-type": "application/json",
  "cache-control": "no-store"
};

const respond = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed" });

  try {
    const input = await req.json().catch(() => ({}));
    const identifier = String(input?.identifier ?? "").trim();
    const password = String(input?.password ?? "");

    if (
      identifier.length < 3 ||
      identifier.length > 254 ||
      password.length < 1 ||
      password.length > 256
    ) {
      return respond(401, { error: "بيانات الدخول غير صحيحة" });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");

    if (!url || !service || !anon) {
      return respond(503, { error: "خدمة تسجيل الدخول غير متاحة حاليًا" });
    }

    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let email = identifier.toLowerCase();

    if (!email.includes("@")) {
      const phone = identifier.replace(/[^0-9+]/g, "");
      if (phone.length < 7 || phone.length > 20) {
        return respond(401, { error: "بيانات الدخول غير صحيحة" });
      }

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("user_id")
        .eq("phone", phone)
        .eq("active", true)
        .maybeSingle();

      if (profileError || !profile?.user_id) {
        return respond(401, { error: "بيانات الدخول غير صحيحة" });
      }

      const { data: userResult, error: userError } =
        await admin.auth.admin.getUserById(profile.user_id);

      if (userError || !userResult?.user?.email) {
        return respond(401, { error: "بيانات الدخول غير صحيحة" });
      }

      email = userResult.user.email;
    }

    const authResponse = await fetch(url + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "apikey": anon
      },
      body: JSON.stringify({ email, password })
    });

    const body = await authResponse.json().catch(() => ({}));

    if (!authResponse.ok) {
      return respond(401, { error: "بيانات الدخول غير صحيحة" });
    }

    if (!body?.access_token || !body?.refresh_token) {
      return respond(503, { error: "خدمة تسجيل الدخول غير متاحة حاليًا" });
    }

    return respond(200, body);
  } catch {
    return respond(500, { error: "خطأ غير متوقع" });
  }
});
