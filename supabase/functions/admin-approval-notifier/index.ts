import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type NotifyPayload = {
  event_type: "onboarding_submitted";
  approval_request_id?: string | null;
  approval_status?: string;
  user: {
    user_id: string;
    username: string;
    email: string;
    name?: string | null;
    polytechnic?: string | null;
    course?: string | null;
    graduation_year?: number | null;
    linkedin_url: string;
    manual_proof_url?: string | null;
    manual_verification_notes?: string | null;
  };
};

type ActionTokenPayload = {
  request_id: string;
  action: "approve" | "reject";
  exp: number;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APPROVAL_ACTION_SECRET = Deno.env.get("APPROVAL_ACTION_SECRET") ?? "";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TELEGRAM_REVIEW_CHAT_ID = Deno.env.get("TELEGRAM_REVIEW_CHAT_ID") ?? "";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const APPROVAL_EMAIL_TO = Deno.env.get("APPROVAL_EMAIL_TO") ?? "";
const APPROVAL_EMAIL_FROM =
  Deno.env.get("APPROVAL_EMAIL_FROM") ??
  "Poly Myanmar GC <onboarding@updates.local>";

const APPROVAL_ACTION_BASE_URL = Deno.env.get("APPROVAL_ACTION_BASE_URL") ?? "";
const APPROVAL_BOT_ACTOR_ID = Deno.env.get("APPROVAL_BOT_ACTOR_ID") ?? "";

const textHeaders = { "Content-Type": "text/html; charset=utf-8" };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeBase64Url(input: string): string {
  return input.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return normalizeBase64Url(btoa(binary));
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${pad}`);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function encodeActionToken(payload: ActionTokenPayload): Promise<string> {
  if (!APPROVAL_ACTION_SECRET) {
    throw new Error("Missing APPROVAL_ACTION_SECRET");
  }

  const headerPart = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const payloadPart = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signingInput = `${headerPart}.${payloadPart}`;
  const key = await importSigningKey(APPROVAL_ACTION_SECRET);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`;
}

async function decodeActionToken(token: string): Promise<ActionTokenPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  if (!APPROVAL_ACTION_SECRET) {
    throw new Error("Missing APPROVAL_ACTION_SECRET");
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const signingInput = `${headerPart}.${payloadPart}`;
  const key = await importSigningKey(APPROVAL_ACTION_SECRET);

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signaturePart),
    new TextEncoder().encode(signingInput),
  );
  if (!isValid) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(
    new TextDecoder().decode(fromBase64Url(payloadPart)),
  ) as ActionTokenPayload;
  if (!payload.request_id || !payload.action || !payload.exp) {
    throw new Error("Malformed token payload");
  }
  if (Date.now() >= payload.exp * 1000) {
    throw new Error("Token expired");
  }
  return payload;
}

function buildActionUrl(req: Request, token: string): string {
  const fallback = new URL(req.url);
  const base = APPROVAL_ACTION_BASE_URL
    ? new URL(APPROVAL_ACTION_BASE_URL)
    : new URL(`${fallback.origin}/functions/v1/admin-approval-notifier/action`);
  base.searchParams.set("token", token);
  return base.toString();
}

function actionResultPage(title: string, body: string): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f5ef; color: #1d2939; margin: 0; }
      .wrap { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
      .card { width: min(680px, 100%); background: #fff; border: 1px solid #e4e7ec; border-radius: 14px; padding: 28px; box-shadow: 0 8px 24px rgba(16, 24, 40, 0.08); }
      h1 { margin: 0 0 12px; font-size: 24px; line-height: 1.2; }
      p { margin: 0; color: #344054; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <h1>${title}</h1>
        <p>${body}</p>
      </section>
    </main>
  </body>
</html>`,
    { status: 200, headers: textHeaders },
  );
}

function requireSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_REVIEW_CHAT_ID) {
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_REVIEW_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });
  return response.ok;
}

async function sendEmail(subject: string, text: string): Promise<boolean> {
  if (!RESEND_API_KEY || !APPROVAL_EMAIL_TO) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: APPROVAL_EMAIL_FROM,
      to: [APPROVAL_EMAIL_TO],
      subject,
      text,
    }),
  });
  return response.ok;
}

async function handleNotify(req: Request): Promise<Response> {
  let payload: NotifyPayload;
  try {
    payload = (await req.json()) as NotifyPayload;
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  if (
    payload.event_type !== "onboarding_submitted" ||
    !payload.user ||
    !payload.user.user_id
  ) {
    return json({ error: "Unsupported event payload" }, 400);
  }

  const requestId = payload.approval_request_id;
  if (!requestId) {
    return json({ error: "approval_request_id is required" }, 400);
  }

  const approveToken = await encodeActionToken({
    request_id: requestId,
    action: "approve",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  });
  const rejectToken = await encodeActionToken({
    request_id: requestId,
    action: "reject",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  });

  const approveUrl = buildActionUrl(req, approveToken);
  const rejectUrl = buildActionUrl(req, rejectToken);

  const lines = [
    "New onboarding submission requires review",
    `Request ID: ${requestId}`,
    `User ID: ${payload.user.user_id}`,
    `Username: ${payload.user.username}`,
    `Email: ${payload.user.email}`,
    `Name: ${payload.user.name ?? "(not provided)"}`,
    `Polytechnic/Course: ${payload.user.polytechnic ?? "-"} / ${payload.user.course ?? "-"}`,
    `Graduation year: ${payload.user.graduation_year ?? "-"}`,
    `LinkedIn: ${payload.user.linkedin_url}`,
    `Manual proof: ${payload.user.manual_proof_url ?? "(none)"}`,
    `Notes: ${payload.user.manual_verification_notes ?? "(none)"}`,
    "",
    `Approve: ${approveUrl}`,
    `Reject: ${rejectUrl}`,
  ];

  const message = lines.join("\n");
  const [telegramSent, emailSent] = await Promise.all([
    sendTelegramMessage(message),
    sendEmail("New onboarding approval request", message),
  ]);

  return json({
    ok: true,
    request_id: requestId,
    telegram_sent: telegramSent,
    email_sent: emailSent,
  });
}

async function handleAction(token: string): Promise<Response> {
  const decoded = await decodeActionToken(token);
  const supabase = requireSupabaseClient();

  const { data: requestRow, error: requestError } = await supabase
    .from("approval_requests")
    .select("id,user_id,status")
    .eq("id", decoded.request_id)
    .maybeSingle();

  if (requestError) {
    return actionResultPage(
      "Review Failed",
      `Could not load request: ${requestError.message}`,
    );
  }
  if (!requestRow) {
    return actionResultPage(
      "Request Not Found",
      "This approval request does not exist.",
    );
  }

  const currentStatus = String(requestRow.status ?? "pending");
  if (["approved", "rejected", "banned"].includes(currentStatus)) {
    return actionResultPage(
      "Already Reviewed",
      `This request was already set to '${currentStatus}'.`,
    );
  }

  const nextStatus = decoded.action === "approve" ? "approved" : "rejected";
  const reviewedAt = new Date().toISOString();

  const { error: updateRequestError } = await supabase
    .from("approval_requests")
    .update({
      status: nextStatus,
      reviewer_notes: "Reviewed via edge function action link",
      reviewed_by: APPROVAL_BOT_ACTOR_ID || null,
      reviewed_at: reviewedAt,
    })
    .eq("id", decoded.request_id);

  if (updateRequestError) {
    return actionResultPage(
      "Review Failed",
      `Could not update request: ${updateRequestError.message}`,
    );
  }

  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update({ approval_status: nextStatus })
    .eq("id", String(requestRow.user_id));

  if (updateProfileError) {
    return actionResultPage(
      "Review Failed",
      `Request updated, but profile update failed: ${updateProfileError.message}`,
    );
  }

  if (APPROVAL_BOT_ACTOR_ID) {
    const action = decoded.action === "approve" ? "approve" : "reject";
    await supabase.from("admin_actions").insert({
      actor_id: APPROVAL_BOT_ACTOR_ID,
      target_type: "user_application",
      target_id: decoded.request_id,
      action,
      reason: "edge function action link",
      payload: {
        profile_id: String(requestRow.user_id),
        source: "edge_function",
      },
    });
  }

  return actionResultPage(
    nextStatus === "approved" ? "Application Approved" : "Application Rejected",
    `Request ${decoded.request_id} has been set to '${nextStatus}'.`,
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");

  if (
    req.method === "POST" &&
    (path.endsWith("/admin-approval-notifier") ||
      path.endsWith("/admin-approval-notifier/notify"))
  ) {
    try {
      return await handleNotify(req);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";
      return json({ error: message }, 500);
    }
  }

  if (
    (req.method === "GET" || req.method === "POST") &&
    path.endsWith("/admin-approval-notifier/action")
  ) {
    const token = url.searchParams.get("token") ?? "";
    if (!token) {
      return new Response("Missing token", { status: 400 });
    }

    try {
      return await handleAction(token);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";
      return actionResultPage("Invalid Action Link", message);
    }
  }

  return json({ error: "Not found" }, 404);
});
