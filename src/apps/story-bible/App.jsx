/**
 * Story Bible Builder — Janardhan Labs
 * Agentic 5-step story bible generator.
 * Uses user's own Gemini API key (not Jan Labs backend).
 */
import { useState, useEffect, useRef, useCallback } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const MODEL        = "gemini-2.0-flash";
const GEMINI_URL   = k => `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${k}`;
const LS_KEY       = "sbb_key_v5";
const LS_HIST      = "sbb_history_v5";
const MAX_HIST     = 3;
const TIMEOUT_MS   = 30000;

// ── STEPS ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id:0, label:"World",      icon:"◈", title:"World Rules",       msg:"Forging the world...",              pk:"world"    },
  { id:1, label:"Characters", icon:"◉", title:"Characters",        msg:"Breathing life into characters...", pk:"chars"    },
  { id:2, label:"Conflict",   icon:"◆", title:"Conflict & Themes", msg:"Weaving conflict and theme...",     pk:"conflict" },
  { id:3, label:"Arc",        icon:"◐", title:"Story Arc",         msg:"Charting the arc...",               pk:"arc"      },
  { id:4, label:"Visual DNA", icon:"◇", title:"Visual & Tone DNA", msg:"Crystallising the visual soul...", pk:"visual"   },
];

// ── GENRES ───────────────────────────────────────────────────────────────────
const GENRES = [
  "Divine Bureaucracy Dark Comedy",
  "Cosmic Horror Philosophical Sci-Fi",
  "Sacred Games-Style Crime Drama",
  "Mythpunk Urban Fantasy",
  "Body Horror Sci-Fi",
  "Noir Revenge Thriller",
  "Literary Magical Realism",
  "Dystopian Survival Drama",
  "Psychological Folk Horror",
  "Heist Caper Comedy",
];

// ── SYSTEM PROMPT (Claude-engineered) ─────────────────────────────────────────
const SYS = `You are a master story bible writer with the sensibility of a literary author and the structural precision of a screenwriter.

UNBREAKABLE RULES:
- Every detail must be SPECIFIC. "A city that never sleeps" is forbidden. "A city where the traffic police take bribes in exact change" is permitted.
- Show power through what people fear to say aloud, not what they proudly proclaim.
- Every character must have something they want AND something they lie to themselves about. These are never the same thing.
- Settings must feel used, not described. What has decayed, been repaired badly, smells wrong.
- FORBIDDEN: chosen ones, ancient prophecies, reluctant heroes, mysterious strangers, love interests whose only trait is being supportive.
- Each world rule must have an internal contradiction. The world's own logic must betray itself.
- Themes are questions, never answers. The story interrogates. It never concludes.

FORMAT:
- Begin each section with **LABEL:** on its own line.
- No preamble, no "Here is...", no "Certainly!". Start immediately with content.
- Be vivid. Be ruthless. Cut the merely decorative.
- Max 480 tokens per response.`;

// ── SEED ─────────────────────────────────────────────────────────────────────
const seed = d =>
  `"${d.t}" (${d.g}): ${d.p}, set in ${d.s}. Concept: ${d.c.slice(0,140)}.${d.tone ? " Tone: " + d.tone + "." : ""}`;

// ── PROMPTS ───────────────────────────────────────────────────────────────────
const PROMPTS = {
  world: d => `${seed(d)}

Write the WORLD RULES section of this story bible.

**SETTING OVERVIEW:**
3 sentences. Make the reader smell it, feel the temperature, sense who is unwelcome here. Zero tourism language.

**THE THREE LAWS OF THIS WORLD:**
3 rules that govern this world. Each must contain an internal contradiction — the world's own logic must betray itself. Not magic systems. The uncomfortable truths everyone lives around.

**POWER ANATOMY:**
Who holds power? What do they sacrifice to keep it? What do they pretend not to know?

**THE WOUND BENEATH THE SURFACE:**
What happened here that no one discusses? What is the collective lie this society tells itself every morning?`,

  chars: d => `${seed(d)}

Write the CHARACTERS section of this story bible.

**PROTAGONIST:**
Name, role in this world, what they want most, the lie they tell themselves about why they want it, their defining flaw (not a quirk — a flaw that will cost them something real), one physical detail that reveals character.

**ANTAGONIST:**
Name, role, core belief — and critically, why they are RIGHT from within their own logic. Must be someone a reader could follow in a different story.

**THE FOIL:**
One character who embodies what the protagonist becomes if they succeed or fail completely. Name, function, one line of dialogue that defines them.

**THE WILDCARD:**
One character whose allegiance is unclear — even to themselves. Name, surface role, what they are actually searching for.

**THE CENTRAL DYNAMIC:**
The emotional and philosophical tension between protagonist and antagonist. One precise sentence. Not a plot summary.`,

  conflict: d => `${seed(d)}

Write the CONFLICT AND THEMES section of this story bible.

**THE ENGINE:**
The external plot mechanism in one sharp sentence. What situation forces movement?

**THE REAL FIGHT:**
The internal conflict the protagonist is actually having — which the external plot merely illuminates. Must feel uncomfortably personal.

**CORE THEME:**
The single question this story keeps asking but refuses to answer. Phrase as a question. A reasonable person must be able to answer it either way.

**SHADOW THEMES:**
Two secondary themes that complicate (not reinforce) the core theme.

**THE LINE NO ONE SAYS:**
The one line of dialogue that could end the story immediately — if any character were honest enough to speak it.`,

  arc: d => `${seed(d)}

Write the STORY ARC section for a comic series or serialised narrative.

**ACT ONE — THE RUPTURE:**
What is the protagonist's false equilibrium? What specific event shatters it — and why is this the worst possible moment?

**ACT TWO — THE DESCENT:**
The protagonist tries old strategies; they fail. What do they lose? What were they wrong about?

**ACT THREE — THE CRUCIBLE:**
What must the protagonist destroy in themselves to reach the final confrontation? What is the cost of winning?

**THE SERIES SPINE:**
The larger question one story cannot contain. What must readers wait seasons to understand?

**ENDING REGISTER:**
Tragedy, pyrrhic victory, dark triumph, or something that refuses categorisation? One honest sentence.`,

  visual: d => `${seed(d)}

Write the VISUAL AND TONE DNA section — what an artist reads before drawing a single line.

**COLOUR PALETTE:**
4 colours. Format: [Name] — [what it means in THIS world, not in general].

**PANEL RHYTHM:**
Dense/claustrophobic (6-8 panels, no air) or sparse/cinematic (2-3 panels, silence as tool)? When does the rhythm break — and what does that signal?

**THE RECURRING MOTIF:**
One visual symbol that appears throughout, transformed by context each time. What does it mean at the start? What has it become by the end?

**LIGHT PHILOSOPHY:**
Not just "dark". The specific quality: sodium orange of wet asphalt, blue-white of a screen in a dark room, afternoon light through dirty glass.

**THREE REFERENCE TOUCHSTONES:**
Three works (film, comic, painting) this story is in conversation with. One sentence each on what specific quality it shares — not plot, feeling.

**ARTIST BRIEF:**
One paragraph. Include: what to AVOID drawing, the texture of surfaces, the one image that if drawn correctly makes this world instantly recognisable.`,
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&family=IM+Fell+English:ital@0;1&display=swap');

  .sbb-wrap * { box-sizing: border-box; margin: 0; padding: 0; }

  .sbb-wrap {
    min-height: 100vh;
    background: #0a0705;
    color: #d4c9b8;
    font-family: 'IM Fell English', Georgia, serif;
    -webkit-font-smoothing: antialiased;
    position: relative;
  }

  /* back button */
  .sbb-back {
    position: fixed; top: 14px; left: 16px; z-index: 200;
    background: rgba(10,7,5,0.85); border: 1px solid rgba(201,168,76,0.25);
    color: #7a6230; font-family: 'Cinzel', serif; font-size: 10px;
    letter-spacing: 2px; text-transform: uppercase; padding: 7px 14px;
    border-radius: 6px; cursor: pointer; transition: all 0.2s;
    backdrop-filter: blur(6px);
  }
  .sbb-back:hover { color: #c9a84c; border-color: rgba(201,168,76,0.5); }

  .sbb-inner {
    max-width: 680px; margin: 0 auto;
    padding: 56px 16px 60px;
  }

  /* HEADER */
  .sbb-header { text-align: center; margin-bottom: 28px; }
  .sbb-eyebrow { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 4px; color: #7a6230; text-transform: uppercase; margin-bottom: 10px; }
  .sbb-h1 { font-family: 'Cinzel Decorative', serif; font-size: clamp(22px, 6vw, 38px); color: #f0ead8; line-height: 1.15; text-shadow: 0 0 40px rgba(139,26,26,0.5); margin-bottom: 6px; }
  .sbb-h1 span { color: #c0392b; }
  .sbb-sub { font-style: italic; color: #7a7060; font-size: 14px; }
  .sbb-divider { display: flex; align-items: center; gap: 10px; margin: 18px 0; }
  .sbb-divider::before, .sbb-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(to right, transparent, #7a6230, transparent); }
  .sbb-div-glyph { color: #8b1a1a; font-size: 15px; }

  /* ONBOARDING */
  .sbb-onboard { background: #1a1410; border: 1px solid rgba(201,168,76,0.3); border-radius: 10px; padding: 22px 18px; margin-bottom: 18px; }
  .sbb-onboard-title { font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 2px; color: #c9a84c; text-transform: uppercase; margin-bottom: 5px; }
  .sbb-onboard-desc { font-size: 13px; color: #7a7060; font-style: italic; line-height: 1.6; margin-bottom: 18px; }
  .sbb-guide { display: flex; flex-direction: column; gap: 9px; margin-bottom: 18px; }
  .sbb-guide-step { display: flex; align-items: flex-start; gap: 11px; padding: 10px 12px; background: #120e0a; border-radius: 6px; border: 1px solid rgba(201,168,76,0.1); }
  .sbb-guide-num { width: 21px; height: 21px; min-width: 21px; background: #8b1a1a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Cinzel', serif; font-size: 10px; color: #f0ead8; font-weight: 600; }
  .sbb-guide-text { font-size: 13px; color: #d4c9b8; line-height: 1.5; padding-top: 1px; }
  .sbb-guide-text strong { color: #c9a84c; }
  .sbb-btn-studio { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: linear-gradient(135deg,#1a3a6a,#0d2040); border: 1px solid #2a5a9a; color: #8ab4f8; border-radius: 6px; padding: 12px; font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 1px; cursor: pointer; text-decoration: none; transition: all 0.2s; margin-bottom: 16px; }
  .sbb-btn-studio:hover { background: linear-gradient(135deg,#1e4a8a,#102850); }
  .sbb-key-divider { display: flex; align-items: center; gap: 10px; margin-bottom: 13px; }
  .sbb-key-divider::before, .sbb-key-divider::after { content: ''; flex: 1; height: 1px; background: rgba(201,168,76,0.15); }
  .sbb-key-divider span { font-size: 11px; color: #7a7060; font-style: italic; }
  .sbb-key-row { display: flex; gap: 7px; margin-bottom: 8px; }
  .sbb-key-input { flex: 1; background: #120e0a; border: 1px solid rgba(201,168,76,0.25); border-radius: 6px; padding: 11px 12px; color: #f0ead8; font-family: 'Courier New', monospace; font-size: 13px; outline: none; transition: border-color 0.2s; min-width: 0; }
  .sbb-key-input:focus { border-color: #c9a84c; }
  .sbb-key-input::placeholder { color: #7a7060; opacity: 0.6; }
  .sbb-key-toggle { background: transparent; border: 1px solid rgba(201,168,76,0.2); border-radius: 6px; padding: 11px; color: #7a7060; cursor: pointer; font-size: 14px; line-height: 1; transition: all 0.2s; }
  .sbb-key-toggle:hover { color: #c9a84c; }
  .sbb-btn-save { background: #8b1a1a; color: #f0ead8; border: none; border-radius: 6px; padding: 11px 16px; font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 1px; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
  .sbb-btn-save:hover { background: #c0392b; }
  .sbb-key-status { font-size: 12px; font-style: italic; min-height: 16px; margin-bottom: 4px; }
  .sbb-key-status.ok { color: #5aaa5a; }
  .sbb-key-status.err { color: #c0392b; }
  .sbb-key-warn { font-size: 11px; color: #c9a030; font-style: italic; padding: 7px 11px; background: rgba(201,160,48,0.08); border: 1px solid rgba(201,160,48,0.2); border-radius: 6px; margin-bottom: 6px; }
  .sbb-key-note { font-size: 11px; color: #7a7060; font-style: italic; line-height: 1.5; padding: 8px 12px; background: #120e0a; border-radius: 6px; border-left: 2px solid #7a6230; }

  /* KEY BANNER */
  .sbb-banner { display: flex; align-items: center; gap: 10px; background: #1a1410; border: 1px solid rgba(90,170,90,0.2); border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; }
  .sbb-banner-icon { color: #5aaa5a; font-size: 13px; }
  .sbb-banner-text { flex: 1; font-size: 13px; color: #d4c9b8; }
  .sbb-banner-text span { color: #7a7060; font-style: italic; font-size: 11px; }
  .sbb-btn-change { background: transparent; border: 1px solid #7a6230; color: #7a6230; border-radius: 6px; padding: 5px 10px; font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 1px; cursor: pointer; text-transform: uppercase; transition: all 0.2s; }
  .sbb-btn-change:hover { color: #c9a84c; border-color: #c9a84c; }

  /* HISTORY */
  .sbb-hist-label { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 2px; color: #7a6230; text-transform: uppercase; margin-bottom: 7px; }
  .sbb-hist-list { display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px; }
  .sbb-hist-item { display: flex; align-items: center; gap: 9px; padding: 8px 12px; background: #1a1410; border: 1px solid rgba(201,168,76,0.12); border-radius: 6px; cursor: pointer; transition: border-color 0.2s; }
  .sbb-hist-item:hover { border-color: rgba(201,168,76,0.35); }
  .sbb-hist-title { flex: 1; font-size: 13px; color: #d4c9b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sbb-hist-genre { font-size: 10px; color: #7a7060; font-style: italic; flex-shrink: 0; }
  .sbb-hist-del { color: #7a7060; font-size: 14px; padding: 0 4px; cursor: pointer; transition: color 0.15s; flex-shrink: 0; line-height: 1; background: none; border: none; }
  .sbb-hist-del:hover { color: #c0392b; }

  /* FORM */
  .sbb-form { background: #1a1410; border: 1px solid rgba(201,168,76,0.15); border-radius: 10px; padding: 18px 15px; margin-bottom: 14px; }
  .sbb-form-title { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 3px; color: #7a6230; text-transform: uppercase; margin-bottom: 13px; display: flex; align-items: center; gap: 8px; }
  .sbb-form-title::after { content: ''; flex: 1; height: 1px; background: rgba(201,168,76,0.15); }
  .sbb-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
  .sbb-field:last-child { margin-bottom: 0; }
  .sbb-label { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 2px; color: #c9a84c; text-transform: uppercase; }
  .sbb-req { color: #c0392b; margin-left: 3px; }
  .sbb-input, .sbb-select, .sbb-textarea { background: #120e0a; border: 1px solid rgba(201,168,76,0.2); border-radius: 6px; padding: 10px 12px; color: #f0ead8; font-family: 'IM Fell English', Georgia, serif; font-size: 15px; outline: none; transition: border-color 0.2s; width: 100%; resize: vertical; }
  .sbb-input:focus, .sbb-select:focus, .sbb-textarea:focus { border-color: #c9a84c; }
  .sbb-input::placeholder, .sbb-textarea::placeholder { color: #7a7060; font-style: italic; }
  .sbb-select option { background: #120e0a; }
  .sbb-row { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
  @media(max-width:420px) { .sbb-row { grid-template-columns: 1fr; } }
  .sbb-char { font-size: 10px; color: #7a7060; font-style: italic; text-align: right; }
  .sbb-char.warn { color: #c0392b; }
  .sbb-tone-hint { font-size: 11px; color: #7a7060; font-style: italic; margin-top: 3px; line-height: 1.4; }
  .sbb-tone-hint strong { color: #7a6230; font-style: normal; }

  /* GENERATE BUTTON */
  .sbb-btn-gen { width: 100%; background: linear-gradient(135deg,#8b1a1a,#5a0f0f); color: #f0ead8; border: 1px solid rgba(139,26,26,0.6); border-radius: 10px; padding: 15px; font-family: 'Cinzel Decorative', serif; font-size: 14px; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .sbb-btn-gen:hover:not(:disabled) { background: linear-gradient(135deg,#c0392b,#8b1a1a); box-shadow: 0 4px 20px rgba(139,26,26,0.4); transform: translateY(-1px); }
  .sbb-btn-gen:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
  .sbb-btn-spin { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff; border-radius: 50%; animation: sbb-spin 0.7s linear infinite; }
  .sbb-token-note { font-size: 11px; color: #7a7060; font-style: italic; text-align: center; margin-bottom: 16px; }

  /* PROGRESS */
  .sbb-track { display: flex; gap: 3px; margin-bottom: 8px; }
  .sbb-pill { flex: 1; height: 3px; background: rgba(201,168,76,0.1); border-radius: 2px; transition: background 0.4s; }
  .sbb-pill.done { background: #7a6230; }
  .sbb-pill.active { background: #c0392b; animation: sbb-pulse 0.8s infinite alternate; }
  .sbb-step-labels { display: flex; gap: 3px; margin-bottom: 12px; }
  .sbb-step-lbl { flex: 1; font-family: 'Cinzel', serif; font-size: 8px; color: #7a7060; text-align: center; text-transform: uppercase; transition: color 0.3s; }
  .sbb-step-lbl.done { color: #7a6230; }
  .sbb-step-lbl.active { color: #c9a84c; }
  .sbb-step-disp { background: #1a0e08; border: 1px solid #8b1a1a; border-radius: 6px; padding: 12px 14px; display: flex; align-items: center; gap: 11px; margin-bottom: 16px; }
  .sbb-step-spinner { width: 17px; height: 17px; border: 2px solid rgba(139,26,26,0.25); border-top-color: #c0392b; border-radius: 50%; animation: sbb-spin 0.75s linear infinite; flex-shrink: 0; }
  .sbb-step-txt { font-style: italic; color: #d4c9b8; font-size: 14px; line-height: 1.4; }

  /* ERROR */
  .sbb-error { background: rgba(139,26,26,0.12); border: 1px solid rgba(139,26,26,0.5); border-radius: 6px; padding: 12px 14px; color: #d4c9b8; font-style: italic; font-size: 14px; line-height: 1.6; margin-bottom: 14px; }

  /* OUTPUT */
  .sbb-out-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 13px; gap: 11px; flex-wrap: wrap; }
  .sbb-out-title { font-family: 'Cinzel Decorative', serif; font-size: clamp(13px,4vw,17px); color: #c9a84c; line-height: 1.3; flex: 1; }
  .sbb-out-title span { display: block; font-size: 10px; color: #7a7060; font-family: 'Cinzel', serif; letter-spacing: 2px; font-style: normal; margin-top: 3px; }
  .sbb-out-actions { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
  .sbb-btn-act { background: transparent; border: 1px solid #7a6230; color: #7a6230; border-radius: 6px; padding: 6px 11px; font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; text-transform: uppercase; }
  .sbb-btn-act:hover { background: #7a6230; color: #f0ead8; }
  .sbb-btn-act.danger { border-color: #8b1a1a; color: #8b1a1a; }
  .sbb-btn-act.danger:hover { background: #8b1a1a; color: #f0ead8; }

  /* BIBLE CARD */
  .sbb-card { background: #1a1410; border: 1px solid rgba(201,168,76,0.15); border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
  .sbb-card-hdr { padding: 12px 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; background: #120e0a; border-bottom: 1px solid rgba(201,168,76,0.1); user-select: none; }
  .sbb-card-hdr:active { opacity: 0.8; }
  .sbb-card-icon { color: #8b1a1a; font-size: 13px; flex-shrink: 0; }
  .sbb-card-title { font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 2px; color: #c9a84c; text-transform: uppercase; flex: 1; }
  .sbb-card-actions { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
  .sbb-btn-redo { background: transparent; border: 1px solid rgba(139,26,26,0.4); color: #c0392b; border-radius: 4px; padding: 3px 8px; font-family: 'Cinzel', serif; font-size: 8px; letter-spacing: 0.5px; cursor: pointer; text-transform: uppercase; transition: all 0.2s; white-space: nowrap; }
  .sbb-btn-redo:hover:not(:disabled) { background: rgba(139,26,26,0.2); border-color: #c0392b; }
  .sbb-btn-redo:disabled { opacity: 0.35; cursor: not-allowed; }
  .sbb-card-chev { color: #7a7060; font-size: 10px; transition: transform 0.25s; flex-shrink: 0; }
  .sbb-card-chev.collapsed { transform: rotate(-90deg); }
  .sbb-card-body { padding: 14px; line-height: 1.85; color: #d4c9b8; font-size: 14px; }
  .sbb-card-body.regen { opacity: 0.4; }
  .sbb-bible-label { display: block; color: #c9a84c; font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 12px; margin-bottom: 3px; }
  .sbb-bible-label:first-child { margin-top: 0; }

  /* FOOTER */
  .sbb-footer { text-align: center; margin-top: 36px; }
  .sbb-footer-brand { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 3px; color: #7a6230; text-transform: uppercase; margin-bottom: 3px; }
  .sbb-footer-note { font-size: 11px; color: #7a7060; font-style: italic; }

  @keyframes sbb-spin    { to { transform: rotate(360deg); } }
  @keyframes sbb-pulse   { from { opacity: 0.5; } to { opacity: 1; } }
  @keyframes sbb-fadeup  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
`;

// ── HELPERS ───────────────────────────────────────────────────────────────────
function formatContent(raw) {
  return raw
    .replace(/\*\*([^*\n]{1,60}):\*\*/g, '<span class="sbb-bible-label">$1</span>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong style="color:#f0ead8">$1</strong>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<span class="sbb-bible-label">$1</span>')
    .trim();
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(LS_HIST) || "[]"); } catch { return []; }
}

function saveHistory(d, res) {
  let hist = getHistory().filter(h => h.title !== d.t);
  hist.unshift({ id: Date.now(), title: d.t, genre: d.g, input: d, results: { ...res } });
  if (hist.length > MAX_HIST) hist = hist.slice(0, MAX_HIST);
  try { localStorage.setItem(LS_HIST, JSON.stringify(hist)); } catch {}
}

// ── GEMINI CALL ───────────────────────────────────────────────────────────────
async function callGemini(prompt, key) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(GEMINI_URL(key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYS }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.88, topP: 0.93, maxOutputTokens: 500 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === "AbortError") throw new Error("Step timed out after 30s. Check your connection and retry.");
    throw new Error("Network error — check your connection.");
  }
  clearTimeout(timer);

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.error?.message || msg; } catch {}
    if (res.status === 429) throw new Error("Rate limit reached. Wait 60 seconds and retry.");
    if (res.status === 403) throw new Error("API key invalid or expired. Tap Change to update it.");
    if (res.status === 400) throw new Error("Bad request: " + msg);
    throw new Error(msg);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  if (!candidate)                              throw new Error("No response from Gemini. Try again.");
  if (candidate.finishReason === "SAFETY")     throw new Error("Content blocked by safety filter. Rephrase your concept.");
  if (candidate.finishReason === "RECITATION") throw new Error("Recitation filter triggered. Adjust your inputs.");
  const text = candidate.content?.parts?.[0]?.text?.trim() || "";
  if (!text || text.length < 40)               throw new Error("Empty response. Please try again.");
  return text;
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function App() {
  // Key state
  const [apiKey,      setApiKey]      = useState(() => localStorage.getItem(LS_KEY) || "");
  const [keyInput,    setKeyInput]    = useState(() => localStorage.getItem(LS_KEY) || "");
  const [keyVisible,  setKeyVisible]  = useState(false);
  const [keyStatus,   setKeyStatus]   = useState({ msg: "", ok: true });
  const [keyActive,   setKeyActive]   = useState(() => !!localStorage.getItem(LS_KEY));
  const [showKeyWarn, setShowKeyWarn] = useState(false);

  // Form state
  const [title,    setTitle]    = useState("");
  const [genre,    setGenre]    = useState(GENRES[0]);
  const [prot,     setProt]     = useState("");
  const [setting,  setSetting]  = useState("");
  const [concept,  setConcept]  = useState("");
  const [tone,     setTone]     = useState("");

  // Generation state
  const [running,    setRunning]    = useState(false);
  const [stepIdx,    setStepIdx]    = useState(-1);
  const [stepMsg,    setStepMsg]    = useState("");
  const [pills,      setPills]      = useState(Array(5).fill("idle")); // idle | active | done
  const [results,    setResults]    = useState({});
  const [currentD,   setCurrentD]   = useState(null);
  const [error,      setError]      = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [collapsed,  setCollapsed]  = useState({});
  const [regenning,  setRegenning]  = useState({});

  // History
  const [history,    setHistory]    = useState(() => getHistory());

  const outputRef  = useRef(null);
  const progressRef = useRef(null);

  // Char counters
  const rem = (val, max) => max - val.length;
  const charCls = (val, max) => "sbb-char" + (rem(val, max) < 20 ? " warn" : "");

  // ── KEY SAVE ────────────────────────────────────────────────────────────────
  function handleSaveKey() {
    const k = keyInput.trim();
    if (!k)                   return setKeyStatus({ msg: "Paste your key first.", ok: false });
    if (!k.startsWith("AIza")) return setKeyStatus({ msg: 'Key should start with "AIza" — copy it again.', ok: false });
    if (k.length < 30)         return setKeyStatus({ msg: "Key looks too short — try again.", ok: false });
    const isNew = !localStorage.getItem(LS_KEY);
    localStorage.setItem(LS_KEY, k);
    setApiKey(k);
    setKeyActive(true);
    setKeyStatus({ msg: "Key saved ✦", ok: true });
    if (isNew) setShowKeyWarn(true);
  }

  function handleChangeKey() {
    setKeyActive(false);
    setKeyStatus({ msg: "", ok: true });
    setShowKeyWarn(false);
  }

  // ── VALIDATE ────────────────────────────────────────────────────────────────
  function validate() {
    if (!title.trim())   return "Story title is required.";
    if (!prot.trim())    return "Protagonist is required.";
    if (!setting.trim()) return "Setting is required.";
    if (!concept.trim()) return "Core concept is required.";
    if (!tone.trim())    return "Tone / Influences is required — name a real work.";
    const k = localStorage.getItem(LS_KEY) || keyInput.trim();
    if (!k)              return "Save your Gemini API key first.";
    if (!k.startsWith("AIza")) return "Invalid API key format.";
    return null;
  }

  // ── STEP RUNNER ─────────────────────────────────────────────────────────────
  const runStep = useCallback(async (idx, prompt, key, localResults, setLocalResults) => {
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setStepIdx(idx);
        setStepMsg(STEPS[idx].msg);
        setPills(p => p.map((v,i) => i === idx ? "active" : v));
        const out = await callGemini(prompt, key);
        setPills(p => p.map((v,i) => i === idx ? "done" : v));
        return out;
      } catch (e) {
        if (attempt === maxRetries) throw e;
        setStepMsg(e.message.includes("timed out") ? e.message : `Step ${idx + 1}: retrying...`);
        await new Promise(r => setTimeout(r, attempt === 0 ? 2500 : 6000));
      }
    }
  }, []);

  // ── MAIN GENERATION ─────────────────────────────────────────────────────────
  async function startGeneration() {
    const err = validate();
    if (err) { setError(err); return; }
    if (running) return;

    const d = { t: title.trim(), g: genre, p: prot.trim(), s: setting.trim(), c: concept.trim(), tone: tone.trim() };
    const key = localStorage.getItem(LS_KEY) || keyInput.trim();

    setRunning(true);
    setError("");
    setShowOutput(false);
    setResults({});
    setPills(Array(5).fill("idle"));

    setTimeout(() => progressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);

    try {
      const res = {};
      res[0] = await runStep(0, PROMPTS.world(d),    key);
      res[1] = await runStep(1, PROMPTS.chars(d),    key);
      res[2] = await runStep(2, PROMPTS.conflict(d), key);
      res[3] = await runStep(3, PROMPTS.arc(d),      key);
      res[4] = await runStep(4, PROMPTS.visual(d),   key);

      setResults(res);
      setCurrentD(d);
      saveHistory(d, res);
      setHistory(getHistory());
      setShowOutput(true);
      setCollapsed({});
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
      setStepIdx(-1);
    }
  }

  // ── REGEN SINGLE STEP ───────────────────────────────────────────────────────
  async function regenStep(idx) {
    if (running || !currentD) return;
    const key = localStorage.getItem(LS_KEY) || keyInput.trim();
    setRunning(true);
    setError("");
    setRegenning(r => ({ ...r, [idx]: true }));
    setPills(p => p.map((v,i) => i === idx ? "idle" : v));

    try {
      const pk  = STEPS[idx].pk;
      const out = await runStep(idx, PROMPTS[pk](currentD), key);
      setResults(r => {
        const updated = { ...r, [idx]: out };
        saveHistory(currentD, updated);
        setHistory(getHistory());
        return updated;
      });
    } catch (e) {
      setError(e.message);
      setPills(p => p.map((v,i) => i === idx ? "done" : v));
    } finally {
      setRunning(false);
      setRegenning(r => ({ ...r, [idx]: false }));
      setStepIdx(-1);
    }
  }

  // ── LOAD HISTORY ────────────────────────────────────────────────────────────
  function loadHistory(h) {
    setTitle(h.input.t);
    setGenre(h.input.g);
    setProt(h.input.p);
    setSetting(h.input.s);
    setConcept(h.input.c);
    setTone(h.input.tone || "");
    setResults(h.results);
    setCurrentD(h.input);
    setShowOutput(true);
    setPills(Array(5).fill("done"));
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function deleteHistory(id, e) {
    e.stopPropagation();
    const updated = getHistory().filter(h => h.id !== id);
    try { localStorage.setItem(LS_HIST, JSON.stringify(updated)); } catch {}
    setHistory(updated);
  }

  // ── EXPORT ──────────────────────────────────────────────────────────────────
  function getFullText() {
    const d = currentD || { t: title, g: genre, p: prot, s: setting, c: concept, tone };
    const sep = "=".repeat(56);
    let out = `STORY BIBLE\n${sep}\nTitle: ${d.t}\nGenre: ${d.g}\nProtagonist: ${d.p}\nSetting: ${d.s}\nConcept: ${d.c}\n`;
    if (d.tone) out += `Tone: ${d.tone}\n`;
    out += `\n${sep}\n\n`;
    STEPS.forEach((step, i) => {
      out += `[ ${step.title.toUpperCase()} ]\n${"-".repeat(40)}\n`;
      out += (results[i] || "").replace(/\*\*/g, "").trim() + "\n\n\n";
    });
    out += `${sep}\nJanardhan Labs - Story Bible Builder\n`;
    return out;
  }

  function copyAll() {
    navigator.clipboard.writeText(getFullText()).catch(() => {});
  }

  function downloadTxt() {
    const d    = currentD || { t: title };
    const name = (d.t || "story").replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    const blob = new Blob([getFullText()], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: `${name}_StoryBible.txt` });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ── NAVIGATE BACK ────────────────────────────────────────────────────────────
  function goBack() {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div className="sbb-wrap">
        <button className="sbb-back" onClick={goBack}>← Labs</button>

        <div className="sbb-inner">

          {/* HEADER */}
          <header className="sbb-header">
            <div className="sbb-eyebrow">Janardhan Labs · Original IP Studio</div>
            <h1 className="sbb-h1">Story <span>Bible</span> Builder</h1>
            <p className="sbb-sub">Five sacred steps. One complete world.</p>
            <div className="sbb-divider"><span className="sbb-div-glyph">✦</span></div>
          </header>

          {/* ONBOARDING */}
          {!keyActive && (
            <div className="sbb-onboard">
              <div className="sbb-onboard-title">First — Your Free Gemini Key</div>
              <p className="sbb-onboard-desc">This tool runs on Google's Gemini AI using your own key. Free, takes under a minute.</p>
              <div className="sbb-guide">
                {[
                  "Tap below to open Google AI Studio in a new tab",
                  "Sign in with any Google account",
                  <span>Click <strong>"Create API Key"</strong> — copy it</span>,
                  <span>Paste below and tap <strong>"Save Key"</strong></span>,
                ].map((txt, i) => (
                  <div className="sbb-guide-step" key={i}>
                    <div className="sbb-guide-num">{i + 1}</div>
                    <div className="sbb-guide-text">{txt}</div>
                  </div>
                ))}
              </div>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="sbb-btn-studio">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                Open Google AI Studio — Get Free Key
              </a>
              <div className="sbb-key-divider"><span>paste your key here</span></div>
              <div className="sbb-key-row">
                <input
                  type={keyVisible ? "text" : "password"}
                  className="sbb-key-input"
                  placeholder="AIza..."
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value.trim())}
                  autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                />
                <button className="sbb-key-toggle" onClick={() => setKeyVisible(v => !v)}>
                  {keyVisible ? "🙈" : "👁"}
                </button>
                <button className="sbb-btn-save" onClick={handleSaveKey}>Save Key</button>
              </div>
              {keyStatus.msg && (
                <div className={`sbb-key-status ${keyStatus.ok ? "ok" : "err"}`}>{keyStatus.msg}</div>
              )}
              {showKeyWarn && (
                <div className="sbb-key-warn">Save your key somewhere safe — clearing browser storage will remove it.</div>
              )}
              <div className="sbb-key-note">Your key stays in this browser only. Free tier: 1,500 runs/day.</div>
            </div>
          )}

          {/* KEY BANNER */}
          {keyActive && (
            <div className="sbb-banner">
              <span className="sbb-banner-icon">✦</span>
              <div className="sbb-banner-text">
                Gemini key active<br />
                <span>{apiKey.slice(0,8)}....{apiKey.slice(-4)}</span>
              </div>
              <button className="sbb-btn-change" onClick={handleChangeKey}>Change</button>
            </div>
          )}

          {/* HISTORY */}
          {history.length > 0 && (
            <div>
              <div className="sbb-hist-label">Recent Bibles</div>
              <div className="sbb-hist-list">
                {history.map(h => (
                  <div className="sbb-hist-item" key={h.id} onClick={() => loadHistory(h)}>
                    <span className="sbb-hist-title">{h.title}</span>
                    <span className="sbb-hist-genre">{h.genre.split(" ")[0]}</span>
                    <button className="sbb-hist-del" onClick={e => deleteHistory(h.id, e)} title="Delete">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FORM */}
          <div className="sbb-form">
            <div className="sbb-form-title">Your Story</div>

            <div className="sbb-row">
              <div className="sbb-field">
                <label className="sbb-label">Title<span className="sbb-req">*</span></label>
                <input className="sbb-input" placeholder="e.g. The God Who Got Fired"
                  value={title} onChange={e => setTitle(e.target.value)} maxLength={60} />
                <div className={charCls(title,60)}>{rem(title,60)}</div>
              </div>
              <div className="sbb-field">
                <label className="sbb-label">Genre<span className="sbb-req">*</span></label>
                <select className="sbb-select" value={genre} onChange={e => setGenre(e.target.value)}>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="sbb-row">
              <div className="sbb-field">
                <label className="sbb-label">Protagonist<span className="sbb-req">*</span></label>
                <input className="sbb-input" placeholder="Name + who they are"
                  value={prot} onChange={e => setProt(e.target.value)} maxLength={100} />
                <div className={charCls(prot,100)}>{rem(prot,100)}</div>
              </div>
              <div className="sbb-field">
                <label className="sbb-label">Setting<span className="sbb-req">*</span></label>
                <input className="sbb-input" placeholder="Place + era"
                  value={setting} onChange={e => setSetting(e.target.value)} maxLength={80} />
                <div className={charCls(setting,80)}>{rem(setting,80)}</div>
              </div>
            </div>

            <div className="sbb-field">
              <label className="sbb-label">Core Concept<span className="sbb-req">*</span></label>
              <textarea className="sbb-textarea" rows={3}
                placeholder="One sentence: who, what breaks, what's at stake."
                value={concept} onChange={e => setConcept(e.target.value)} maxLength={300} />
              <div className={charCls(concept,300)}>{rem(concept,300)}</div>
            </div>

            <div className="sbb-field">
              <label className="sbb-label">Tone / Influences<span className="sbb-req">*</span></label>
              <input className="sbb-input"
                placeholder="e.g. Terry Pratchett meets Sacred Games — absurdist but grounded"
                value={tone} onChange={e => setTone(e.target.value)} maxLength={150} />
              <div className={charCls(tone,150)}>{rem(tone,150)}</div>
              <div className="sbb-tone-hint">This field drives quality. <strong>Name real works.</strong></div>
            </div>
          </div>

          {/* GENERATE */}
          <button className="sbb-btn-gen" onClick={startGeneration} disabled={running}>
            {running && <div className="sbb-btn-spin" />}
            <span>{running ? "Forging..." : "✦ Forge the Bible ✦"}</span>
          </button>
          <div className="sbb-token-note">Gemini 2.0 Flash · ~2,500 tokens per run · Janardhan Labs</div>

          {/* PROGRESS */}
          {running && (
            <div ref={progressRef}>
              <div className="sbb-track">
                {pills.map((p, i) => <div key={i} className={`sbb-pill ${p}`} />)}
              </div>
              <div className="sbb-step-labels">
                {STEPS.map((s, i) => (
                  <div key={i} className={`sbb-step-lbl ${pills[i]}`}>{s.label}</div>
                ))}
              </div>
              <div className="sbb-step-disp">
                <div className="sbb-step-spinner" />
                <div className="sbb-step-txt">{stepMsg}</div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {error && <div className="sbb-error">! {error}</div>}

          {/* OUTPUT */}
          {showOutput && (
            <div ref={outputRef}>
              <div className="sbb-out-header">
                <div className="sbb-out-title">
                  "{escHtml(currentD?.t || title)}"
                  <span>Story Bible</span>
                </div>
                <div className="sbb-out-actions">
                  <button className="sbb-btn-act" onClick={copyAll}>Copy</button>
                  <button className="sbb-btn-act" onClick={downloadTxt}>Save</button>
                  <button className="sbb-btn-act danger" onClick={() => { setShowOutput(false); setResults({}); setCurrentD(null); setPills(Array(5).fill("idle")); window.scrollTo({top:0,behavior:"smooth"}); }}>New</button>
                </div>
              </div>

              {STEPS.map((step, i) => (
                <div className="sbb-card" key={i}>
                  <div className="sbb-card-hdr" onClick={() => setCollapsed(c => ({ ...c, [i]: !c[i] }))}>
                    <span className="sbb-card-icon">{step.icon}</span>
                    <span className="sbb-card-title">{step.title}</span>
                    <div className="sbb-card-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="sbb-btn-redo"
                        disabled={running}
                        onClick={() => regenStep(i)}
                      >
                        {regenning[i] ? "..." : "Redo"}
                      </button>
                    </div>
                    <span className={`sbb-card-chev ${collapsed[i] ? "collapsed" : ""}`}>▼</span>
                  </div>
                  {!collapsed[i] && (
                    <div
                      className={`sbb-card-body ${regenning[i] ? "regen" : ""}`}
                      dangerouslySetInnerHTML={{ __html: formatContent(results[i] || "") }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <footer className="sbb-footer">
            <div className="sbb-footer-brand">Janardhan Labs</div>
            <div className="sbb-footer-note">Story Bible Builder · v5</div>
          </footer>

        </div>
      </div>
    </>
  );
}
