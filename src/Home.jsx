/**
 * Janardhan Labs — Portfolio Home
 * The landing page. Shows all apps, links to each.
 */
import { useState, useEffect } from "react";
import { supabase, signOut } from "./shared/lib/supabase-client";

const APPS = [
  { id:"visualmind",          name:"VisualMind",         tagline:"Turn notes into visual understanding",          path:"/visualmind",          icon:"🧠", tag:"Study" },
  { id:"feedback-translator", name:"FeedbackTranslator", tagline:"Decode what feedback actually means",           path:"/feedback-translator", icon:"💬", tag:"Communication" },
  { id:"debate-coach",        name:"DebateCoach",        tagline:"Master both sides of any argument",             path:"/debate-coach",        icon:"⚔️", tag:"Thinking" },
  { id:"gift-intelligence",   name:"GiftIntelligence",   tagline:"The perfect gift for every person",            path:"/gift-intelligence",   icon:"🎁", tag:"Personal" },
  { id:"exam-simulator",      name:"ExamSimulator",      tagline:"Test yourself before the test tests you",       path:"/exam-simulator",      icon:"📝", tag:"Study" },
  { id:"claim-lens",          name:"ClaimLens",          tagline:"Verify any claim with evidence",                path:"/claim-lens",          icon:"🔍", tag:"Research" },
  { id:"aperture",            name:"Aperture",           tagline:"See research papers through 6 lenses",         path:"/aperture",            icon:"📖", tag:"Research" },
  { id:"style-mirror",        name:"StyleMirror",        tagline:"Extract your voice. Rewrite anything in it.",  path:"/style-mirror",        icon:"✍️", tag:"Writing" },
  { id:"sprint-mind",         name:"SprintMind",         tagline:"PRD + JIRA hierarchy from one sentence",       path:"/sprint-mind",         icon:"🚀", tag:"Product" },
  { id:"contract-scan",       name:"ContractScan",       tagline:"Know what you're signing before you sign it.", path:"/contract-scan",       icon:"📋", tag:"Legal" },
  { id:"skinstack",           name:"SkinStack",          tagline:"Your skin, your stack, no guesswork",          path:"/skinstack",           icon:"✨", tag:"Personal" },
  { id:"story-bible", name:"StoryBibleBuilder", tagline:"Five sacred steps. One complete world.", path:"/story-bible", icon:"📖", tag:"Writing" },
  { id:"pm-studio", name:"PM Studio", tagline:"17 tools for every PM workflow", path:"/pm-studio", icon:"⚡", tag:"Product" },
];

const TAG_COLORS = {
  "Study":         { bg:"#EFF6FF", color:"#2563EB", border:"#BFDBFE" },
  "Communication": { bg:"#F0FDF4", color:"#16A34A", border:"#BBF7D0" },
  "Thinking":      { bg:"#FDF4FF", color:"#9333EA", border:"#E9D5FF" },
  "Personal":      { bg:"#FFF7ED", color:"#EA580C", border:"#FED7AA" },
  "Research":      { bg:"#F0FDFA", color:"#0D9488", border:"#99F6E4" },
  "Writing":       { bg:"#FAF5FF", color:"#7C3AED", border:"#DDD6FE" },
  "Product":       { bg:"#EFF6FF", color:"#1D4ED8", border:"#BFDBFE" },
  "Legal":         { bg:"#F0FDF4", color:"#15803D", border:"#BBF7D0" },
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --bg:      #F8F9FC;
    --surface: #FFFFFF;
    --rule:    #E2E6F0;
    --ink:     #0F172A;
    --ink-mid: #475569;
    --ink-dim: #94A3B8;
    --blue:    #2563EB;
    --blue-pale:#EFF6FF;
    --font:    'Instrument Sans', sans-serif;
    --mono:    'Fira Code', monospace;
  }
  html,body { height:100%; background:var(--bg); color:var(--ink); font-family:var(--font); }

  @keyframes riseIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }

  .home { min-height:100vh; display:flex; flex-direction:column; }

  /* ── NAV ── */
  .nav {
    background:var(--surface); border-bottom:2px solid var(--blue);
    padding:0.85rem 2rem; display:flex; align-items:center;
    justify-content:space-between; gap:1rem; flex-wrap:wrap;
    position:sticky; top:0; z-index:100;
  }
  .nav-brand { display:flex; align-items:baseline; gap:0.5rem; }
  .nav-name  { font-size:1.15rem; font-weight:700; color:var(--ink); letter-spacing:-0.02em; }
  .nav-name span { color:var(--blue); }
  .nav-tag   { font-family:var(--mono); font-size:0.52rem; letter-spacing:0.14em;
                text-transform:uppercase; color:var(--ink-dim); }
  .nav-right { display:flex; align-items:center; gap:0.75rem; }
  .nav-user  { font-family:var(--mono); font-size:0.58rem; color:var(--ink-dim); }
  .nav-user strong { color:var(--blue); }
  .nav-signout {
    font-family:var(--mono); font-size:0.55rem; letter-spacing:0.08em;
    text-transform:uppercase; background:none; border:1px solid var(--rule);
    border-radius:100px; color:var(--ink-dim); padding:0.25rem 0.7rem;
    cursor:pointer; transition:all 0.15s;
  }
  .nav-signout:hover { border-color:var(--blue); color:var(--blue); }

  /* ── HERO ── */
  .hero { padding:4rem 2rem 3rem; max-width:860px; margin:0 auto; width:100%;
          animation:fadeIn 0.5s ease; }
  .hero-eyebrow { font-family:var(--mono); font-size:0.6rem; letter-spacing:0.2em;
                   text-transform:uppercase; color:var(--blue); margin-bottom:0.85rem; }
  .hero-title { font-size:clamp(2rem, 5vw, 3rem); font-weight:700; color:var(--ink);
                letter-spacing:-0.03em; line-height:1.1; margin-bottom:1rem; }
  .hero-title span { color:var(--blue); }
  .hero-sub { font-size:1rem; color:var(--ink-mid); line-height:1.65;
               max-width:540px; margin-bottom:2rem; }
  .hero-stats { display:flex; gap:2rem; flex-wrap:wrap; }
  .stat { display:flex; flex-direction:column; gap:0.15rem; }
  .stat-num { font-size:1.5rem; font-weight:700; color:var(--blue); line-height:1; }
  .stat-label { font-family:var(--mono); font-size:0.55rem; letter-spacing:0.1em;
                 text-transform:uppercase; color:var(--ink-dim); }

  /* ── FILTER ── */
  .filter-row { padding:0 2rem 1.5rem; max-width:860px; margin:0 auto; width:100%;
                display:flex; gap:0.4rem; flex-wrap:wrap; }
  .filter-chip {
    padding:0.3rem 0.85rem; border:1.5px solid var(--rule); border-radius:100px;
    font-family:var(--mono); font-size:0.62rem; letter-spacing:0.05em;
    cursor:pointer; color:var(--ink-dim); background:var(--surface);
    transition:all 0.15s; user-select:none;
  }
  .filter-chip:hover { border-color:var(--blue); color:var(--blue); }
  .filter-chip.on { background:var(--blue); border-color:var(--blue); color:white; }

  /* ── APP GRID ── */
  .app-grid { padding:0 2rem 4rem; max-width:860px; margin:0 auto; width:100%;
              display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));
              gap:1rem; }

  .app-card {
    background:var(--surface); border:1px solid var(--rule); border-radius:12px;
    padding:1.5rem; cursor:pointer; transition:all 0.2s;
    text-decoration:none; color:inherit; display:flex; flex-direction:column;
    gap:1rem; animation:riseIn 0.4s ease both;
    box-shadow:0 1px 4px rgba(15,23,42,0.04);
  }
  .app-card:hover {
    border-color:var(--blue); transform:translateY(-2px);
    box-shadow:0 4px 20px rgba(37,99,235,0.1);
  }
  .app-card-top { display:flex; align-items:center; justify-content:space-between; }
  .app-icon { font-size:1.75rem; line-height:1; }
  .app-tag {
    font-family:var(--mono); font-size:0.52rem; font-weight:600;
    letter-spacing:0.08em; text-transform:uppercase;
    padding:0.2rem 0.55rem; border-radius:100px;
    border:1px solid;
  }
  .app-name { font-size:1rem; font-weight:700; color:var(--ink); letter-spacing:-0.01em; }
  .app-tagline { font-size:0.8rem; color:var(--ink-mid); line-height:1.5; flex:1; }
  .app-arrow {
    font-family:var(--mono); font-size:0.6rem; letter-spacing:0.08em;
    text-transform:uppercase; color:var(--blue); margin-top:auto;
    opacity:0; transition:opacity 0.15s;
  }
  .app-card:hover .app-arrow { opacity:1; }

  /* ── FOOTER ── */
  .home-footer { margin-top:auto; border-top:1px solid var(--rule);
    padding:1rem 2rem; display:flex; align-items:center;
    justify-content:space-between; gap:1rem; flex-wrap:wrap;
    background:var(--surface);
  }
  .home-footer-left { font-family:var(--mono); font-size:0.52rem;
                       letter-spacing:0.08em; color:var(--ink-dim); }
  .home-footer-left strong { color:var(--blue); }
  .home-footer-right { font-family:var(--mono); font-size:0.52rem;
                        letter-spacing:0.08em; color:var(--ink-dim); }

  @media(max-width:600px) {
    .hero { padding:2.5rem 1.25rem 2rem; }
    .filter-row, .app-grid { padding-left:1.25rem; padding-right:1.25rem; }
    .hero-stats { gap:1.25rem; }
  }
`;

// FIX: import navigate from router so all navigation goes through the same popstate dispatcher
function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
}

export default function Home() {
  const [user, setUser]         = useState(null);
  const [activeTag, setActiveTag] = useState("All");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  const tags       = ["All", ...Array.from(new Set(APPS.map(a => a.tag)))];
  const filtered   = activeTag === "All" ? APPS : APPS.filter(a => a.tag === activeTag);

  return (
    <>
      <style>{STYLES}</style>
      <div className="home">
        {/* ── NAV ── */}
        <nav className="nav">
          <div className="nav-brand">
            <span className="nav-name">Janardhan <span>Labs</span></span>
            <span className="nav-tag">AI Utility Apps</span>
          </div>
          {user && (
            <div className="nav-right">
              <span className="nav-user">Signed in as <strong>{user.email}</strong></span>
              <button className="nav-signout" onClick={() => signOut().then(() => window.location.reload())}>
                Sign out
              </button>
            </div>
          )}
        </nav>

        {/* ── HERO ── */}
        <div className="hero">
          <div className="hero-eyebrow">// Janardhan Labs Portfolio</div>
          <h1 className="hero-title">AI tools built with<br /><span>intent</span>.</h1>
          <p className="hero-sub">
            11 production-grade AI utility apps — each solving a real problem,
            each designed for the person who actually has that problem.
            Built by Sriharsha.
          </p>
          <div className="hero-stats">
            <div className="stat"><span className="stat-num">11</span><span className="stat-label">Apps</span></div>
            <div className="stat"><span className="stat-num">7</span><span className="stat-label">Categories</span></div>
            <div className="stat"><span className="stat-num">1</span><span className="stat-label">API key</span></div>
            <div className="stat"><span className="stat-num">0</span><span className="stat-label">Compromises</span></div>
          </div>
        </div>

        {/* ── FILTER ── */}
        <div className="filter-row">
          {tags.map(t => (
            <button
              key={t}
              className={`filter-chip ${activeTag === t ? "on" : ""}`}
              onClick={() => setActiveTag(t)}
            >{t}</button>
          ))}
        </div>

        {/* ── APP GRID ── */}
        <div className="app-grid">
          {filtered.map((app, i) => {
            const tc = TAG_COLORS[app.tag] || { bg:"#F1F5F9", color:"#475569", border:"#CBD5E1" };
            return (
              <div
                key={app.id}
                className="app-card"
                style={{ animationDelay:`${i * 0.04}s` }}
                onClick={() => navigate(app.path)}
              >
                <div className="app-card-top">
                  <span className="app-icon">{app.icon}</span>
                  <span
                    className="app-tag"
                    style={{ background:tc.bg, color:tc.color, borderColor:tc.border }}
                  >{app.tag}</span>
                </div>
                <div className="app-name">{app.name}</div>
                <div className="app-tagline">{app.tagline}</div>
                <div className="app-arrow">Open app →</div>
              </div>
            );
          })}
        </div>

        {/* ── FOOTER ── */}
        <footer className="home-footer">
          <div className="home-footer-left">Made with intent by <strong>Sriharsha</strong></div>
          <div className="home-footer-right">Janardhan Labs © 2026</div>
        </footer>
      </div>
    </>
  );
}
