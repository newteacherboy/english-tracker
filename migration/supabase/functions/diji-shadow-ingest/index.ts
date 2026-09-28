// DESIGN / DEPLOYMENT DRAFT ONLY.
// This function is intentionally not deployed and is not imported by index.html.
//
// Future purpose:
//   Apps Script (server-to-server) -> Edge Function -> realtime_events
//
// Authentication is a dedicated ingestion secret, not Supabase Auth.
// The secret must be configured in the Supabase Function environment and
// the caller's secret must be kept in Apps Script Properties.
// Never commit either secret.

import { createClient } from "npm:@supabase/supabase-js@2";

type ShadowEvent = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  studentId?: string | null;
  source: string;
  payloadVersion: number;
  payload: Record<string, unknown>;
};

const ALLOWED_EVENT_TYPES = new Set([
  "duel.created",
  "duel.accepted",
  "duel.rejected",
  "duel.completed",
  "notification.created",
  "notification.read",
  "chat.message",
  "chat.read",
  "presence.upsert",
  "presence.close",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
const ingestionSecret = Deno.env.get("DIJI_SHADOW_INGEST_SECRET");

if (!supabaseUrl || !secretKeys || !ingestionSecret) {
  throw new Error("Required function secrets are not configured");
}

const parsedSecretKeys = JSON.parse(secretKeys);
const supabaseSecret = parsedSecretKeys["default"];

if (!supabaseSecret) {
  throw new Error("Supabase default secret key is not configured");
}

const admin = createClient(supabaseUrl, supabaseSecret);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const supplied = req.headers.get("x-diji-shadow-secret") ?? "";
  if (!timingSafeEqual(supplied, ingestionSecret)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let event: ShadowEvent;
  try {
    event = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  if (!event || typeof event !== "object") {
    return json({ ok: false, error: "invalid_event" }, 400);
  }

  if (!event.eventId || !event.eventType || !event.occurredAt || !event.source) {
    return json({ ok: false, error: "missing_event_fields" }, 400);
  }

  if (!ALLOWED_EVENT_TYPES.has(event.eventType)) {
    return json({ ok: false, error: "event_type_not_allowed" }, 400);
  }

  if (event.payloadVersion !== 1 || !event.payload || typeof event.payload !== "object") {
    return json({ ok: false, error: "invalid_payload_version_or_payload" }, 400);
  }

  if (event.source !== "apps-script-shadow") {
    return json({ ok: false, error: "invalid_source" }, 400);
  }

  // Do not accept credentials or raw Apps Script session material in payloads.
  const forbiddenKeys = new Set([
    "password",
    "sifre",
    "token",
    "sessionToken",
    "rawToken",
    "tokenHash",
    "service_role",
    "secret",
  ]);

  for (const key of Object.keys(event.payload)) {
    if (forbiddenKeys.has(key)) {
      return json({ ok: false, error: "forbidden_payload_field" }, 400);
    }
  }

  const { error } = await admin.from("realtime_events").insert({
    event_id: event.eventId,
    event_type: event.eventType,
    occurred_at: event.occurredAt,
    student_id: event.studentId ?? null,
    source: event.source,
    payload_version: event.payloadVersion,
    payload: event.payload,
  });

  if (error) {
    // Duplicate event IDs are expected during retries. The database schema
    // must make event_id unique; the final implementation should translate
    // the duplicate constraint into an idempotent success response.
    if (error.code === "23505") {
      return json({ ok: true, duplicate: true, eventId: event.eventId });
    }

    console.error("shadow ingest failed", {
      code: error.code,
      message: error.message,
    });
    return json({ ok: false, error: "storage_failed" }, 503);
  }

  return json({ ok: true, duplicate: false, eventId: event.eventId });
});
