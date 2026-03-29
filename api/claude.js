/**
 * Janardhan Labs — Vercel Serverless Proxy
 * File: /api/claude.js  (Vercel auto-routes POST /api/claude)
 *
 * Environment variables required in Vercel dashboard:
 *   ANTHROPIC_API_KEY      — your Anthropic key (never exposed to browser)
 *   SUPABASE_URL           — your Supabase project URL
 *   SUPABASE_SERVICE_KEY   — Supabase service role key (server-only, not anon key)
 *
 * Request body expected:
 *   { app_id, messages, max_tokens, session_token }
 *
 * Response: identical to Anthropic /v1/messages response
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const DAILY_TOKEN_LIMIT = 50_000;

// ── Allowed app IDs — add new apps here as you build them ──────────────────
const VALID_APP_IDS = new Set([
  "visualmind",
  "feedback-translator",
  "debate-coach",
  "gift-intelligence",
  "exam-simulator",
  "claim-lens",
  "aperture",
  "style-mirror",
  "sprint-mind",
  "contract-scan",
  "skinstack",
  // future apps:
  "plot-doctor",
  "world-builder",
  "stakeholder-translator",
  "decision-lens",
]);

// ── CORS headers ──────────────────────────────────────────────────────────
function corsHeaders(origin) {
  // In production, lock this down to your actual domain
  const allowed = process.env.ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin":  allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(res, status, body) {
  return res.status(status).json(body);
}

// ── Verify Supabase JWT and return user_id ────────────────────────────────
async function verifySession(sessionToken) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase env vars not configured");
  }

  // Use Supabase Auth REST API to validate JWT
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${sessionToken}`,
      "apikey":        serviceKey,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Invalid or expired session");
  }

  const user = await res.json();
  return user.id; // UUID
}

// ── Check + update daily token usage in Supabase ──────────────────────────
async function checkAndLogUsage(userId, appId, tokensUsed) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
  const headers = {
    "Content-Type":  "application/json",
    "apikey":        serviceKey,
    "Authorization": `Bearer ${serviceKey}`,
    "Prefer":        "return=minimal",
  };

  // Sum tokens used in last 24 hours for this user
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const usageRes = await fetch(
    `${supabaseUrl}/rest/v1/usage_logs?user_id=eq.${userId}&created_at=gte.${since}&select=tokens_used`,
    { headers }
  );

  if (!usageRes.ok) throw new Error("Could not read usage data");

  const rows        = await usageRes.json();
  const totalSoFar  = rows.reduce((sum, r) => sum + (r.tokens_used || 0), 0);

  if (totalSoFar >= DAILY_TOKEN_LIMIT) {
    throw new Error(
      `Daily limit reached (${DAILY_TOKEN_LIMIT.toLocaleString()} tokens). Resets in 24 hours.`
    );
  }

  // Log this request's usage (fire-and-forget after we know limit is ok)
  if (tokensUsed > 0) {
    fetch(`${supabaseUrl}/rest/v1/usage_logs`, {
      method:  "POST",
      headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify({
        user_id:     userId,
        app_id:      appId,
        tokens_used: tokensUsed,
      }),
    }).catch(() => {}); // non-blocking — don't fail request if logging fails
  }

  return { totalSoFar, remaining: DAILY_TOKEN_LIMIT - totalSoFar };
}

// ── Count tokens from Anthropic response ─────────────────────────────────
function extractTokenCount(data) {
  const m = data?.usageMetadata;
  return (m?.promptTokenCount || 0) + (m?.candidatesTokenCount || 0);
}

// ── Main handler ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  // ── Parse body ──
  const { app_id, messages, max_tokens, session_token } = req.body || {};

  // Validate required fields
  if (!session_token)           return json(res, 401, { error: "No session token provided" });
  if (!app_id)                  return json(res, 400, { error: "app_id is required" });
  if (!VALID_APP_IDS.has(app_id)) return json(res, 400, { error: `Unknown app_id: ${app_id}` });
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return json(res, 400, { error: "messages array is required" });
  }

  // ── Verify session ──
  let userId;
  try {
    userId = await verifySession(session_token);
  } catch (e) {
    return json(res, 401, { error: e.message || "Authentication failed" });
  }

  // ── Pre-flight rate limit check (with 0 tokens — just reads current usage) ──
  try {
    await checkAndLogUsage(userId, app_id, 0);
  } catch (e) {
    return json(res, 429, { error: e.message });
  }

  // ── Call Anthropic ──
  let anthropicData;
  try {
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: max_tokens || 1000,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}));
      return json(res, anthropicRes.status, {
        error: errBody?.error?.message || `Anthropic error ${anthropicRes.status}`,
      });
    }

    anthropicData = await anthropicRes.json();
  } catch (e) {
    return json(res, 502, { error: "Failed to reach Anthropic API" });
  }

  // ── Log actual token usage (non-blocking) ──
  const tokensUsed = extractTokenCount(anthropicData);
  checkAndLogUsage(userId, app_id, tokensUsed).catch(() => {});

  // ── Return response ──
  return json(res, 200, anthropicData);
  // Anthropic needs x-api-key + anthropic-version headers + messages array
// Gemini needs the key in the URL as ?key=... and a contents array

const geminiRes = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: messages,          // messages array format also changes — see File 2
    generationConfig: { maxOutputTokens: max_tokens || 1000 }
  })
});
}
