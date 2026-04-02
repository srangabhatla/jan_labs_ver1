import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";

// ── Lazy load all apps ────────────────────────────────────────────────────
const VisualMind          = lazy(() => import("./apps/visualmind/App"));
const FeedbackTranslator  = lazy(() => import("./apps/feedback-translator/App"));
const DebateCoach         = lazy(() => import("./apps/debate-coach/App"));
const GiftIntelligence    = lazy(() => import("./apps/gift-intelligence/App"));
const ExamSimulator       = lazy(() => import("./apps/exam-simulator/App"));
const ClaimLens           = lazy(() => import("./apps/claim-lens/App"));
const Aperture            = lazy(() => import("./apps/aperture/App"));
const StyleMirror         = lazy(() => import("./apps/style-mirror/App"));
const SprintMind          = lazy(() => import("./apps/sprint-mind/App"));
const ContractScan        = lazy(() => import("./apps/contract-scan/App"));
const SkinStack           = lazy(() => import("./apps/skinstack/App"));
const StoryBible          = lazy(() => import("./apps/story-bible/App"));
const PMStudio            = lazy(() => import("./apps/pm-studio/App"));
const Home                = lazy(() => import("./Home"));

// ── Fallback shown while lazy chunk loads ─────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#F8F9FC", fontFamily:"sans-serif", fontSize:"0.7rem",
      letterSpacing:"0.15em", textTransform:"uppercase", color:"#94A3B8"
    }}>
      Loading…
    </div>
  );
}

// ── Error boundary ────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("App error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight:"100vh", display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", padding:"2rem",
          background:"#F8F9FC", fontFamily:"sans-serif", textAlign:"center", gap:"1rem"
        }}>
          <div style={{ fontSize:"2.5rem" }}>⚠️</div>
          <div style={{ fontSize:"1.1rem", fontWeight:"700", color:"#0F172A" }}>
            Something went wrong
          </div>
          <div style={{ fontSize:"0.85rem", color:"#64748B", maxWidth:"400px", lineHeight:"1.6" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/"; }}
            style={{
              marginTop:"0.5rem", padding:"0.65rem 1.5rem", background:"#2563EB",
              color:"white", border:"none", borderRadius:"6px", cursor:"pointer",
              fontSize:"0.85rem", fontWeight:"600"
            }}
          >
            ← Back to home
          </button>
          <div style={{ fontSize:"0.65rem", color:"#94A3B8", letterSpacing:"0.08em", textTransform:"uppercase" }}>
            Janardhan Labs
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── 404 page ──────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div style={{
      minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"2rem",
      background:"#F8F9FC", fontFamily:"sans-serif", textAlign:"center", gap:"1rem"
    }}>
      <div style={{ fontSize:"3rem" }}>🔍</div>
      <div style={{ fontSize:"1.1rem", fontWeight:"700", color:"#0F172A" }}>
        Page not found
      </div>
      <div style={{ fontSize:"0.85rem", color:"#64748B" }}>
        That route doesn't exist in Janardhan Labs.
      </div>
      <a
        href="/"
        style={{
          marginTop:"0.5rem", padding:"0.65rem 1.5rem", background:"#2563EB",
          color:"white", borderRadius:"6px", textDecoration:"none",
          fontSize:"0.85rem", fontWeight:"600"
        }}
      >
        ← View all apps
      </a>
    </div>
  );
}

// ── Route map ─────────────────────────────────────────────────────────────
const ROUTES = {
  "/":                    <Home />,
  "/visualmind":          <VisualMind />,
  "/feedback-translator": <FeedbackTranslator />,
  "/debate-coach":        <DebateCoach />,
  "/gift-intelligence":   <GiftIntelligence />,
  "/exam-simulator":      <ExamSimulator />,
  "/claim-lens":          <ClaimLens />,
  "/aperture":            <Aperture />,
  "/style-mirror":        <StyleMirror />,
  "/sprint-mind":         <SprintMind />,
  "/contract-scan":       <ContractScan />,
  "/skinstack":           <SkinStack />,
  "/story-bible":         <StoryBible />,
  "/pm-studio":           <PMStudio />,
};

// ── Router ────────────────────────────────────────────────────────────────
function Router() {
  const [path, setPath] = React.useState(() => window.location.pathname);

  React.useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const component = ROUTES[path];

  return (
    <ErrorBoundary key={path}>
      <Suspense fallback={<PageLoader />}>
        {component !== undefined ? component : <NotFound />}
      </Suspense>
    </ErrorBoundary>
  );
}

// ── Navigate helper ───────────────────────────────────────────────────────
export function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
