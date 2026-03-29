/**
 * Janardhan Labs — AuthWrapper
 * File: src/lib/AuthWrapper.jsx
 *
 * Usage — wrap any app's root component:
 *
 *   import AuthWrapper from "./lib/AuthWrapper";
 *   export default function App() {
 *     return (
 *       <AuthWrapper appId="skinstack">
 *         <SkinStack />
 *       </AuthWrapper>
 *     );
 *   }
 *
 * The wrapper shows a themed login screen if the user is not signed in.
 * Once authenticated, it renders children (the actual app).
 * Session persists across page reloads via localStorage (Supabase handles this).
 */

import { useState, useEffect } from "react";
import { supabase, signInWithEmail, verifyOtp, signOut, onAuthChange } from "../lib/supabase-client";

// ── Per-app theme config ──────────────────────────────────────────────────
const APP_THEMES = {
  "visualmind": {
    name: "VisualMind",
    tagline: "Turn notes into visual understanding",
    bg: "#FAFAF7", surface: "#FFFFFF", accent: "#2D2D2D",
    accentPale: "#F5F5F0", accentText: "#2D2D2D",
    rule: "#E8E8E2", ink: "#1A1A1A", inkMid: "#6B6B6B",
    fontHead: "'DM Sans', sans-serif", fontMono: "'DM Mono', monospace",
    gfont: "DM+Sans:wght@400;500;600&family=DM+Mono:wght@400",
    orb: "🧠",
  },
  "feedback-translator": {
    name: "FeedbackTranslator",
    tagline: "Decode what feedback actually means",
    bg: "#080b14", surface: "#0F1320", accent: "#6C8EF5",
    accentPale: "#0D1530", accentText: "#6C8EF5",
    rule: "#1A2240", ink: "#E8ECF8", inkMid: "#7A85B0",
    fontHead: "'DM Sans', sans-serif", fontMono: "'DM Mono', monospace",
    gfont: "DM+Sans:wght@400;500;600&family=DM+Mono:wght@400",
    orb: "💬", dark: true,
  },
  "debate-coach": {
    name: "DebateCoach",
    tagline: "Master both sides of any argument",
    bg: "#12100E", surface: "#1C1815", accent: "#E8C97A",
    accentPale: "#1E1A0E", accentText: "#E8C97A",
    rule: "#2A2520", ink: "#F0EBE0", inkMid: "#8A7E6A",
    fontHead: "'Playfair Display', serif", fontMono: "'DM Mono', monospace",
    gfont: "Playfair+Display:wght@400;700&family=DM+Mono:wght@400",
    orb: "⚔️", dark: true,
  },
  "gift-intelligence": {
    name: "GiftIntelligence",
    tagline: "The perfect gift for every person",
    bg: "#F7F0E6", surface: "#FFFFFF", accent: "#C4674A",
    accentPale: "#FEF3EE", accentText: "#C4674A",
    rule: "#EAE0D4", ink: "#2A1F1A", inkMid: "#8A6858",
    fontHead: "'Cormorant Garamond', serif", fontMono: "'DM Mono', monospace",
    gfont: "Cormorant+Garamond:wght@400;500;600&family=DM+Mono:wght@400",
    orb: "🎁",
  },
  "exam-simulator": {
    name: "ExamSimulator",
    tagline: "Test yourself before the test tests you",
    bg: "#F3F5FA", surface: "#FFFFFF", accent: "#0F1F3D",
    accentPale: "#EEF1F8", accentText: "#0F1F3D",
    rule: "#DDE2EE", ink: "#0F1F3D", inkMid: "#5A6A8A",
    fontHead: "'Libre Baskerville', serif", fontMono: "'JetBrains Mono', monospace",
    gfont: "Libre+Baskerville:wght@400;700&family=JetBrains+Mono:wght@400",
    orb: "📝",
  },
  "claim-lens": {
    name: "ClaimLens",
    tagline: "Verify any claim with evidence",
    bg: "#08111C", surface: "#0E1A28", accent: "#00C9A7",
    accentPale: "#041814", accentText: "#00C9A7",
    rule: "#142030", ink: "#E0EEF8", inkMid: "#6A8AA8",
    fontHead: "'Syne', sans-serif", fontMono: "'Fira Code', monospace",
    gfont: "Syne:wght@400;600;700&family=Fira+Code:wght@400",
    orb: "🔍", dark: true,
  },
  "aperture": {
    name: "Aperture",
    tagline: "See research papers through 6 lenses",
    bg: "#F4F1EC", surface: "#FFFFFF", accent: "#3D6B4F",
    accentPale: "#EEF5F0", accentText: "#3D6B4F",
    rule: "#E0DAD2", ink: "#1E2A1E", inkMid: "#6A7A6A",
    fontHead: "'Fraunces', serif", fontMono: "'Fira Code', monospace",
    gfont: "Fraunces:wght@300;400;500&family=Fira+Code:wght@400",
    orb: "📖",
  },
  "style-mirror": {
    name: "StyleMirror",
    tagline: "Extract your voice. Rewrite anything in it.",
    bg: "#13131F", surface: "#1C1C2E", accent: "#9B5DE5",
    accentPale: "#1E1530", accentText: "#9B5DE5",
    rule: "#2A2A40", ink: "#E8E6F0", inkMid: "#8A88A0",
    fontHead: "'Plus Jakarta Sans', sans-serif", fontMono: "'Overpass Mono', monospace",
    gfont: "Plus+Jakarta+Sans:wght@400;500;700&family=Overpass+Mono:wght@400",
    orb: "✍️", dark: true,
  },
  "sprint-mind": {
    name: "SprintMind",
    tagline: "PRD + JIRA hierarchy from one sentence",
    bg: "#F8F9FC", surface: "#FFFFFF", accent: "#2563EB",
    accentPale: "#EFF6FF", accentText: "#2563EB",
    rule: "#E2E6F0", ink: "#0F172A", inkMid: "#475569",
    fontHead: "'Instrument Sans', sans-serif", fontMono: "'Fira Code', monospace",
    gfont: "Instrument+Sans:wght@400;500;600&family=Fira+Code:wght@400",
    orb: "🚀",
  },
  "contract-scan": {
    name: "ContractScan",
    tagline: "Know what you're signing before you sign it",
    bg: "#0B1610", surface: "#111E16", accent: "#10B981",
    accentPale: "#0A2016", accentText: "#10B981",
    rule: "#1A2E20", ink: "#EDF2EE", inkMid: "#8BAF95",
    fontHead: "'Lora', serif", fontMono: "'Space Mono', monospace",
    gfont: "Lora:wght@400;500;600&family=Space+Mono:wght@400",
    orb: "📋", dark: true,
  },
  "skinstack": {
    name: "SkinStack",
    tagline: "Your skin, your stack, no guesswork",
    bg: "#FDFAF6", surface: "#FFFFFF", accent: "#C084A0",
    accentPale: "#FDF0F5", accentText: "#9B5F7A",
    rule: "#EDE8E2", ink: "#2C1F1A", inkMid: "#7A6058",
    fontHead: "'Vidaloka', serif", fontMono: "'Nunito', sans-serif",
    gfont: "Vidaloka&family=Nunito:wght@400;500;600",
    orb: "✨",
  },
};

const DEFAULT_THEME = APP_THEMES["sprint-mind"];

function buildStyles(t) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=${t.gfont}&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    :root {
      --bg:          ${t.bg};
      --surface:     ${t.surface};
      --accent:      ${t.accent};
      --accent-pale: ${t.accentPale};
      --accent-text: ${t.accentText};
      --rule:        ${t.rule};
      --ink:         ${t.ink};
      --ink-mid:     ${t.inkMid};
      --font-head:   ${t.fontHead};
      --font-mono:   ${t.fontMono};
    }
    html,body { height:100%; }
    body { background:var(--bg); color:var(--ink); font-family:var(--font-head); }

    .auth-wrap {
      min-height:100vh; display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      background:var(--bg); padding:1.5rem;
      position:relative; overflow:hidden;
    }
    /* Ambient orb */
    .auth-wrap::before {
      content:''; position:fixed;
      top:-150px; right:-150px;
      width:500px; height:500px; border-radius:50%;
      background:radial-gradient(circle, ${hexToRgba(t.accent, 0.07)} 0%, transparent 65%);
      pointer-events:none;
    }
    .auth-wrap::after {
      content:''; position:fixed;
      bottom:-120px; left:-120px;
      width:400px; height:400px; border-radius:50%;
      background:radial-gradient(circle, ${hexToRgba(t.accent, 0.05)} 0%, transparent 65%);
      pointer-events:none;
    }

    .auth-card {
      background:var(--surface);
      border:1px solid var(--rule);
      border-radius:16px;
      padding:2.5rem 2rem;
      width:100%; max-width:420px;
      box-shadow:0 4px 40px rgba(0,0,0,${t.dark ? "0.4" : "0.08"});
      position:relative; z-index:1;
      animation:riseIn 0.4s ease;
    }
    @keyframes riseIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes spin   { to{transform:rotate(360deg)} }

    .auth-orb {
      font-size:2.5rem; text-align:center; margin-bottom:1.25rem;
      display:block; line-height:1; animation:fadeIn 0.5s ease 0.1s both;
    }
    .auth-eyebrow {
      font-family:var(--font-mono); font-size:0.5rem;
      letter-spacing:0.2em; text-transform:uppercase;
      color:var(--accent); text-align:center; margin-bottom:0.35rem;
    }
    .auth-appname {
      font-family:var(--font-head); font-size:1.75rem; font-weight:700;
      color:var(--ink); text-align:center; line-height:1.1;
      letter-spacing:-0.02em; margin-bottom:0.35rem;
    }
    .auth-tagline {
      font-size:0.8rem; color:var(--ink-mid); text-align:center;
      font-style:italic; margin-bottom:2rem; line-height:1.5;
    }

    .auth-label {
      font-family:var(--font-mono); font-size:0.6rem;
      letter-spacing:0.14em; text-transform:uppercase;
      color:var(--accent); display:block; margin-bottom:0.5rem;
    }
    .auth-input {
      width:100%; padding:0.8rem 1rem;
      background:var(--accent-pale); border:1.5px solid var(--rule);
      border-radius:8px; font-family:var(--font-head); font-size:0.95rem;
      color:var(--ink); outline:none;
      transition:border-color 0.2s, box-shadow 0.2s;
      margin-bottom:1rem;
    }
    .auth-input:focus {
      border-color:var(--accent);
      box-shadow:0 0 0 3px ${hexToRgba(t.accent, 0.12)};
    }
    .auth-input::placeholder { color:var(--ink-mid); font-style:italic; }

    /* OTP input — big digits */
    .otp-input {
      width:100%; padding:1rem; text-align:center;
      background:var(--accent-pale); border:1.5px solid var(--rule);
      border-radius:8px; font-family:var(--font-mono);
      font-size:1.75rem; font-weight:700; letter-spacing:0.3em;
      color:var(--ink); outline:none; margin-bottom:1rem;
      transition:border-color 0.2s, box-shadow 0.2s;
    }
    .otp-input:focus {
      border-color:var(--accent);
      box-shadow:0 0 0 3px ${hexToRgba(t.accent, 0.12)};
    }

    .auth-btn {
      width:100%; padding:0.85rem;
      background:var(--accent); color:${t.dark ? "#000" : "#fff"};
      border:none; border-radius:100px;
      font-family:var(--font-head); font-size:0.95rem; font-weight:700;
      cursor:pointer; transition:all 0.2s; letter-spacing:0.01em;
      box-shadow:0 2px 12px ${hexToRgba(t.accent, 0.25)};
    }
    .auth-btn:hover:not(:disabled) {
      transform:translateY(-1px);
      box-shadow:0 4px 20px ${hexToRgba(t.accent, 0.35)};
      filter:brightness(1.08);
    }
    .auth-btn:active:not(:disabled) { transform:translateY(0); }
    .auth-btn:disabled {
      opacity:0.5; cursor:not-allowed; transform:none; box-shadow:none;
    }

    .auth-btn-ghost {
      width:100%; padding:0.65rem;
      background:none; border:1.5px solid var(--rule);
      border-radius:100px; font-family:var(--font-mono);
      font-size:0.65rem; letter-spacing:0.1em; text-transform:uppercase;
      color:var(--ink-mid); cursor:pointer; margin-top:0.75rem;
      transition:all 0.15s;
    }
    .auth-btn-ghost:hover { border-color:var(--accent); color:var(--accent); }

    .auth-spinner {
      width:18px; height:18px; border-radius:50%;
      border:2px solid rgba(255,255,255,0.3);
      border-top-color:white;
      animation:spin 0.7s linear infinite;
      display:inline-block; margin-right:0.5rem; vertical-align:middle;
    }
    .auth-spinner.dark {
      border:2px solid rgba(0,0,0,0.2);
      border-top-color:rgba(0,0,0,0.8);
    }

    .auth-step-hint {
      font-family:var(--font-mono); font-size:0.6rem;
      letter-spacing:0.06em; color:var(--ink-mid);
      text-align:center; margin-bottom:1.5rem; line-height:1.6;
    }
    .auth-step-hint strong { color:var(--accent); }

    .auth-error {
      background:${t.dark ? "rgba(239,68,68,0.1)" : "#FEF2F2"};
      border:1px solid rgba(239,68,68,0.3);
      border-radius:8px; padding:0.75rem 1rem;
      font-size:0.8rem; color:#EF4444;
      margin-bottom:1rem; line-height:1.5;
    }
    .auth-success {
      font-size:0.78rem; color:var(--ink-mid);
      text-align:center; margin-top:1rem; font-style:italic;
    }

    .auth-divider {
      display:flex; align-items:center; gap:0.75rem;
      margin:1.25rem 0; color:var(--ink-mid);
      font-family:var(--font-mono); font-size:0.55rem; letter-spacing:0.1em;
    }
    .auth-divider::before, .auth-divider::after {
      content:''; flex:1; height:1px; background:var(--rule);
    }

    .auth-footer {
      margin-top:1.5rem; text-align:center;
      font-family:var(--font-mono); font-size:0.5rem;
      letter-spacing:0.08em; color:var(--ink-mid);
    }
    .auth-footer strong { color:var(--accent); font-weight:600; }

    /* Logged-in user bar at top of app */
    .user-bar {
      display:flex; align-items:center; justify-content:space-between;
      gap:0.75rem; padding:0.45rem 1.75rem;
      background:var(--surface); border-bottom:1px solid var(--rule);
      font-family:var(--font-mono); font-size:0.52rem;
      letter-spacing:0.08em; color:var(--ink-mid);
    }
    .user-bar-email { color:var(--accent); font-weight:600; }
    .user-bar-signout {
      background:none; border:1px solid var(--rule); border-radius:100px;
      font-family:var(--font-mono); font-size:0.5rem; letter-spacing:0.08em;
      text-transform:uppercase; color:var(--ink-mid); padding:0.2rem 0.65rem;
      cursor:pointer; transition:all 0.15s;
    }
    .user-bar-signout:hover { border-color:var(--accent); color:var(--accent); }
  `;
}

// ── Utility: hex colour to rgba string ───────────────────────────────────
function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Auth screen steps ─────────────────────────────────────────────────────
// "email"  — enter email address
// "otp"    — enter 6-digit OTP from inbox
// "done"   — successfully signed in (briefly shown before app renders)

export default function AuthWrapper({ appId, children }) {
  const theme = APP_THEMES[appId] || DEFAULT_THEME;

  const [session, setSession]     = useState(undefined); // undefined = loading
  const [step, setStep]           = useState("email");   // "email" | "otp" | "done"
  const [email, setEmail]         = useState("");
  const [otp, setOtp]             = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [sentTo, setSentTo]       = useState("");

  // ── Initialise session ──
  useEffect(() => {
    // Check for existing session immediately
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null);
    });
    // Listen for auth changes (magic link clicks, sign outs)
    const unsub = onAuthChange((s) => setSession(s));
    return unsub;
  }, []);

  // ── Step 1: Send OTP ──
  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true); setError("");
    try {
      await signInWithEmail(email.trim().toLowerCase());
      setSentTo(email.trim().toLowerCase());
      setStep("otp");
    } catch (e) {
      setError(e.message || "Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──
  const handleVerifyOtp = async () => {
    if (otp.trim().length < 6) return;
    setLoading(true); setError("");
    try {
      const s = await verifyOtp(sentTo, otp.trim());
      setSession(s);
      setStep("done");
    } catch (e) {
      const msg = e.message || "Invalid or expired code. Please try again.";
      // If token expired, nudge user toward resend prominently
      const isExpired = msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid");
      setError(isExpired
        ? "Code expired or invalid. Request a new one below."
        : msg
      );
      setOtp(""); // FIX: always clear stale OTP so user doesn't retry the same code
    } finally {
      setLoading(false);
    }
  };

  // ── Handle sign out ──
  const handleSignOut = async () => {
    await signOut();
    setSession(null);
    setStep("email");
    setEmail(""); setOtp(""); setError(""); setSentTo("");
  };

  // ── Loading state (checking session) ──
  if (session === undefined) {
    return (
      <>
        <style>{buildStyles(theme)}</style>
        <div className="auth-wrap">
          <div className="auth-card" style={{ textAlign:"center", padding:"3rem 2rem" }}>
            <span className="auth-orb">{theme.orb}</span>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:"var(--ink-mid)", letterSpacing:"0.12em", textTransform:"uppercase" }}>
              Loading…
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Authenticated — show app with user bar ──
  if (session) {
    const userEmail = session.user?.email || "";
    return (
      <>
        <style>{buildStyles(theme)}</style>
        <div className="user-bar">
          <span>Signed in as <span className="user-bar-email">{userEmail}</span></span>
          <button className="user-bar-signout" onClick={handleSignOut}>Sign out</button>
        </div>
        {children}
      </>
    );
  }

  // ── Not authenticated — show themed login ──
  const isDark   = !!theme.dark;
  const spinnerCls = isDark ? "auth-spinner dark" : "auth-spinner";

  return (
    <>
      <style>{buildStyles(theme)}</style>
      <div className="auth-wrap">
        <div className="auth-card">
          <span className="auth-orb">{theme.orb}</span>
          <div className="auth-eyebrow">Janardhan Labs</div>
          <div className="auth-appname">{theme.name}</div>
          <div className="auth-tagline">{theme.tagline}</div>

          {error && <div className="auth-error">{error}</div>}

          {/* ── Step: Email ── */}
          {step === "email" && (
            <>
              <label className="auth-label" htmlFor="auth-email">Your email</label>
              <input
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && !loading && email.trim() && handleSendOtp()}
                autoFocus
              />
              <button
                className="auth-btn"
                onClick={handleSendOtp}
                disabled={loading || !email.trim()}
              >
                {loading
                  ? <><span className={spinnerCls} />Sending code…</>
                  : "Send sign-in code →"
                }
              </button>
              <div className="auth-divider">no password needed</div>
              <div className="auth-success">
                We'll email you a 6-digit code. No account needed — it's created automatically.
              </div>
            </>
          )}

          {/* ── Step: OTP ── */}
          {step === "otp" && (
            <>
              <div className="auth-step-hint">
                Code sent to <strong>{sentTo}</strong><br />
                Check your inbox (and spam folder). Valid for 1 hour.
              </div>
              <label className="auth-label" htmlFor="auth-otp">Enter 6-digit code</label>
              <input
                id="auth-otp"
                type="text"
                inputMode="numeric"
                className="otp-input"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={e => e.key === "Enter" && !loading && otp.length >= 6 && handleVerifyOtp()}
                autoFocus
              />
              <button
                className="auth-btn"
                onClick={handleVerifyOtp}
                disabled={loading || otp.trim().length < 6}
              >
                {loading
                  ? <><span className={spinnerCls} />Verifying…</>
                  : "Verify & sign in →"
                }
              </button>
              <button
                className="auth-btn-ghost"
                onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                disabled={loading}
              >
                ← Use a different email
              </button>
              <button
                className="auth-btn-ghost"
                onClick={handleSendOtp}
                disabled={loading}
                style={{ marginTop:"0.35rem" }}
              >
                Resend code
              </button>
            </>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && (
            <div style={{ textAlign:"center", padding:"1rem 0" }}>
              <div style={{ fontSize:"2rem", marginBottom:"0.75rem" }}>✓</div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.7rem", color:"var(--accent)", letterSpacing:"0.1em", textTransform:"uppercase" }}>
                Signed in successfully
              </div>
            </div>
          )}

          <div className="auth-footer">
            Part of <strong>Janardhan Labs</strong> · Made with intent by Sriharsha
          </div>
        </div>
      </div>
    </>
  );
}
