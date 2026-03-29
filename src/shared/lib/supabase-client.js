/**
 * Janardhan Labs — Supabase Client Singleton
 * File: src/lib/supabase-client.js
 *
 * Install dependency:
 *   npm install @supabase/supabase-js
 *
 * Set environment variables:
 *   REACT_APP_SUPABASE_URL   = https://xxxx.supabase.co
 *   REACT_APP_SUPABASE_ANON  = your-anon-public-key
 *
 * Both of these are SAFE to expose in the browser (anon key, not service key).
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    "Missing Supabase env vars. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON to .env"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
});

// ── Auth helpers ──────────────────────────────────────────────────────────

// Get current session (null if logged out)
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

// Get current user (null if logged out)
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// Send magic link OTP to email
export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // auto-create account on first login
    },
  });
  if (error) throw new Error(error.message);
}

// Verify OTP code entered by user
export async function verifyOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) throw new Error(error.message);
  return data.session;
}

// Sign out
export async function signOut() {
  await supabase.auth.signOut();
}

// Subscribe to auth state changes
// Usage: const unsub = onAuthChange((session) => setSession(session))
//        unsub() to clean up
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => callback(session)
  );
  return () => subscription.unsubscribe();
}
