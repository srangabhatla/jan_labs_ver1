/**
 * Janardhan Labs — Vercel Serverless Proxy
 * File: /api/claude.js  (Vercel auto-routes POST /api/claude)
 *
 * Environment variables required in Vercel dashboard:
 *   GEMINI_API_KEY       — your Google AI Studio key (never exposed to browser)
 *   SUPABASE_URL         — your Supabase project URL
 *   SUPABASE_SERVICE_KEY — Supabase service role key (server-only, not anon key)
 *
 * Request body expected:
 *   { app_id, messages, max_tokens, session_token }
 *
 * Response: normalised to Anthropic shape so api-client.js needs zero changes:
 *   { content: [{ type: "text", text: "..." }], usage: { input_tokens, output_tokens } }
 */

const GEMINI_MODEL    = "gemini-2.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DAILY_TOKEN_LIMIT = 50_000;

// ── Allowed app IDs ────────────────────────────────────────────────────────
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
  "plot-doctor",
  "world-builder",
  "stakeholder-translator",
  "decision-lens",
]);

// ── CORS headers ───────────────────────────────────────────────────────────
function corsHeaders() {
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

// ── Convert Anthropic-style messages → Gemini contents ────────────────────
// Anthropic: { role: "user", content: "text" }
//         or { role: "user", content: [{ type:"text", text:"..." }, { type:"image", source:{...} }] }
// Gemini:   { role: "user", parts: [{ text: "..." }] }
//         or { role: "user", parts: [{ inlineData: { mimeType, data } }, { text: "..." }] }
function toGeminiContents(messages) {
  return messages.map(msg => {
    const role = msg.role === "assistant" ? "model" : "user";

    // Simple string content
    if (typeof msg.content === "string") {
      return { role, parts: [{ text: msg.content }] };
    }

    // Already in Gemini parts format (VisualMind / ContractScan after their fix)
    if (msg.parts) {
      return { role, parts: msg.parts };
    }

    // Anthropic content array — convert each block
    if (Array.isArray(msg.content)) {
      const parts = msg.content.map(block => {
        if (block.type === "text") {
          return { text: block.text };
        }
        if (block.type === "image") {
          return {
            inlineData: {
              mimeType: block.source.media_type,
              data:     block.source.data,
            },
          };
        }
        if (block.type === "document") {
          return {
            inlineData: {
              mimeType: "application/pdf",
              data:     block.source.data,
            },
          };
        }
        return { text: block.text || "" };
      });
      return { role, parts };
    }

    // Fallback
    return { role, parts: [{ text: String(msg.content || "") }] };
  });
}

// ── Normalise Gemini response → Anthropic shape ────────────────────────────
// This means api-client.js stays completely unchanged.
// It still reads: data.content[0].text  ✓
function toAnthropicShape(geminiData) {
  const candidate    = geminiData?.candidates?.[0];
  const text         = candidate?.content?.parts?.[0]?.text || "";
  const finishReason = candidate?.finishReason || "UNKNOWN";
  const usage        = geminiData?.usageMetadata || {};
  // Log for Vercel function debugging
  console.log("finishReason:", finishReason, "| text length:", text.length, "| preview:", text.slice(0,100));
  return {
    content:       [{ type: "text", text }],
    _finishReason: finishReason,
    usage: {
      input_tokens:  usage.promptTokenCount     || 0,
      output_tokens: usage.candidatesTokenCount || 0,
    },
  };
}

// ── Verify Supabase JWT and return user_id ─────────────────────────────────
async function verifySession(sessionToken) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase env vars not configured");
  }

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
  return user.id;
}

// ── Check + log daily token usage in Supabase ─────────────────────────────
async function checkAndLogUsage(userId, appId, tokensUsed) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
  const headers = {
    "Content-Type":  "application/json",
    "apikey":        serviceKey,
    "Authorization": `Bearer ${serviceKey}`,
    "Prefer":        "return=minimal",
  };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const usageRes = await fetch(
    `${supabaseUrl}/rest/v1/usage_logs?user_id=eq.${userId}&created_at=gte.${since}&select=tokens_used`,
    { headers }
  );

  if (!usageRes.ok) throw new Error("Could not read usage data");

  const rows       = await usageRes.json();
  const totalSoFar = rows.reduce((sum, r) => sum + (r.tokens_used || 0), 0);

  if (totalSoFar >= DAILY_TOKEN_LIMIT) {
    throw new Error(
      `Daily limit reached (${DAILY_TOKEN_LIMIT.toLocaleString()} tokens). Resets in 24 hours.`
    );
  }

  if (tokensUsed > 0) {
    fetch(`${supabaseUrl}/rest/v1/usage_logs`, {
      method:  "POST",
      headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify({ user_id: userId, app_id: appId, tokens_used: tokensUsed }),
    }).catch(() => {});
  }

  return { totalSoFar, remaining: DAILY_TOKEN_LIMIT - totalSoFar };
}

// ── Main handler ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  if (req.method === "OPTIONS") {
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const { app_id, messages, max_tokens, session_token } = req.body || {};

  if (!session_token)             return json(res, 401, { error: "No session token provided" });
  if (!app_id)                    return json(res, 400, { error: "app_id is required" });
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

  // ── Pre-flight rate limit check ──
  try {
    await checkAndLogUsage(userId, app_id, 0);
  } catch (e) {
    return json(res, 429, { error: e.message });
  }

  // ── Call Gemini ────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(res, 500, { error: "GEMINI_API_KEY is not configured in environment variables" });
  }

  let geminiData;
  try {
    const geminiRes = await fetch(
      `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents:         toGeminiContents(messages),
          generationConfig: {
            maxOutputTokens:  max_tokens || 1000,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}));
      const errMsg  = errBody?.error?.message || `Gemini error ${geminiRes.status}`;
      return json(res, geminiRes.status, { error: errMsg });
    }

    geminiData = await geminiRes.json();
  } catch (e) {
    return json(res, 502, { error: "Failed to reach Gemini API" });
  }

  // ── Normalise to Anthropic shape so frontend needs zero changes ──
  const normalised = toAnthropicShape(geminiData);

  // ── Log token usage (non-blocking) ──
  checkAndLogUsage(userId, app_id, normalised.usage.input_tokens + normalised.usage.output_tokens)
    .catch(() => {});

  return json(res, 200, normalised);
}
