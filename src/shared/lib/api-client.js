/**
 * Janardhan Labs — Shared API Client
 * File: shared/lib/api-client.js
 *
 * Signatures:
 *   callClaude(prompt, maxTokens, appId)
 *     prompt: string or messages array
 *
 *   callClaude(system, userMsg, maxTokens, appId)
 *     system: string system prompt
 *     userMsg: string user message
 */

import { getSession } from "./supabase-client";

const PROXY_URL = process.env.REACT_APP_PROXY_URL || "/api/claude";

export async function callClaude(promptOrSystem, maxTokensOrUser, appIdOrMaxTokens, maybeAppId) {
  // Detect calling convention:
  // 4-arg: callClaude(system, user, maxTokens, appId)
  // 3-arg: callClaude(prompt, maxTokens, appId)
  let messages, maxTokens, appId;

  if (maybeAppId !== undefined) {
    // 4-arg form: (system, user, maxTokens, appId)
    const system  = promptOrSystem;
    const userMsg = maxTokensOrUser;
    maxTokens     = appIdOrMaxTokens;
    appId         = maybeAppId;
    messages = [{ role: "user", content: `${system}\n\n${userMsg}` }];
  } else {
    // 3-arg form: (prompt, maxTokens, appId)
    const prompt = promptOrSystem;
    maxTokens    = maxTokensOrUser;
    appId        = appIdOrMaxTokens;
    messages = Array.isArray(prompt)
      ? prompt
      : [{ role: "user", content: prompt }];
  }

  if (!appId) throw new Error("appId is required — e.g. \'skinstack\'");

  const session = await getSession();
  if (!session) throw new Error("Not signed in. Please sign in to continue.");

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 55000);

  try {
    const res = await fetch(PROXY_URL, {
      method:  "POST",
      signal:  controller.signal,
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        app_id:        appId,
        messages,
        max_tokens:    maxTokens || 1000,
        session_token: session.access_token,
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 429) throw new Error(err.error || "Daily limit reached");
      if (res.status === 401) throw new Error("Session expired — please sign in again");
      throw new Error(err.error || `Request failed (${res.status})`);
    }

    const data = await res.json();

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
      else throw new Error("Could not parse response — please try again");
    }

    return parsed;
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new Error("Request timed out — please try again");
    throw e;
  }
}

// Raw text version — returns plain string, not parsed JSON
// Used by apps that handle their own response parsing (visualmind, feedback-translator)
export async function callClaudeRaw(promptOrSystem, maxTokensOrUser, appIdOrMaxTokens, maybeAppId) {
  let messages, maxTokens, appId;
  if (maybeAppId !== undefined) {
    messages  = [{ role: "user", content: `${promptOrSystem}\n\n${maxTokensOrUser}` }];
    maxTokens = appIdOrMaxTokens;
    appId     = maybeAppId;
  } else {
    messages  = Array.isArray(promptOrSystem) ? promptOrSystem : [{ role: "user", content: promptOrSystem }];
    maxTokens = maxTokensOrUser;
    appId     = appIdOrMaxTokens;
  }

  if (!appId) throw new Error("appId is required");
  const session = await getSession();
  if (!session) throw new Error("Not signed in. Please sign in to continue.");

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 55000);

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
      body: JSON.stringify({ app_id: appId, messages, max_tokens: maxTokens || 1000, session_token: session.access_token }),
    });
    clearTimeout(timeout);
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || e.message || `Request failed (${res.status})`); }
    const data = await res.json();
    return (data.content || []).map(b => b.text || "").join("").trim();
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new Error("Request timed out — please try again");
    throw e;
  }
}

export async function getDailyUsage(supabaseClient) {
  const { data, error } = await supabaseClient.from("daily_usage").select("tokens_today, request_count, app_id");
  if (error) return null;
  return data;
}
