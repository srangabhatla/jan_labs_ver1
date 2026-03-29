# Contributing to Janardhan Labs

## Adding a new app

### 1. Create the app file

```
apps/your-app-slug/App.jsx
apps/your-app-slug/README.md
```

### 2. App file structure

Every app follows this exact pattern:

```jsx
// 1. Imports — shared utilities first
import { callClaude } from "../../shared/lib/api-client";
import AuthWrapper from "../../shared/components/AuthWrapper";
import { useState } from "react";

// 2. Styles — CSS-in-JS string
const STYLES = `...`;

// 3. Constants
const ITEMS = [...];

// 4. Helper components (if needed)
function MyHelper() { ... }

// 5. Main component — named but NOT exported directly
function MyAppApp() {
  // state, handlers, JSX
  return (
    <>
      <style>{STYLES}</style>
      <div className="app">
        <div className="page">
          <header className="site-header">
            <div className="header-brand">
              <span className="header-eyebrow">Janardhan Labs</span>
              <h1 className="header-appname">My<span>App</span></h1>
              <p className="header-tagline">One line tagline</p>
            </div>
          </header>
          <main className="main">
            {/* app content */}
          </main>
          <footer className="site-footer">
            <div className="footer-left">Made with intent by <strong>Sriharsha</strong></div>
            <div className="footer-right">Janardhan Labs © 2026</div>
          </footer>
        </div>
      </div>
    </>
  );
}

// 6. Default export wraps with AuthWrapper
export default function MyApp() {
  return (
    <AuthWrapper appId="my-app">
      <MyAppApp />
    </AuthWrapper>
  );
}
```

### 3. Register in 4 places

**`api/claude.js`** — add to `VALID_APP_IDS`:
```js
const VALID_APP_IDS = new Set([
  ...
  "my-app",
]);
```

**`shared/components/AuthWrapper.jsx`** — add to `APP_THEMES`:
```js
const APP_THEMES = {
  ...
  "my-app": {
    name: "MyApp",
    tagline: "One line tagline",
    bg: "#XXXXXX",
    surface: "#FFFFFF",
    accent: "#XXXXXX",
    accentPale: "#XXXXXX",
    accentText: "#XXXXXX",
    rule: "#XXXXXX",
    ink: "#XXXXXX",
    inkMid: "#XXXXXX",
    fontHead: "'Font Name', sans-serif",
    fontMono: "'Mono Font', monospace",
    gfont: "Font+Name:wght@400;600&family=Mono+Font:wght@400",
    orb: "🎯",
    dark: false, // true if background is dark
  },
};
```

**`src/index.js`** — add import and route:
```js
import MyApp from "../apps/my-app/App";

// in routes object:
"/my-app": <MyApp />,
```

**`src/Home.jsx`** — add card:
```js
const APPS = [
  ...
  { id:"my-app", name:"MyApp", tagline:"One line tagline", path:"/my-app", icon:"🎯", tag:"Category" },
];
```

---

## Code standards

### callClaude usage
- Always pass `appId` as the third argument: `callClaude(prompt, maxTokens, "my-app")`
- max_tokens guidance: simple single output = 1000, medium = 1500, complex multi-section = 2500
- Always snapshot inputs at call time to avoid stale closure bugs

### JSON from Claude
Always normalise every field after parsing:
```js
parsed.myArray = Array.isArray(parsed.myArray) ? parsed.myArray : [];
parsed.myString = typeof parsed.myString === "string" ? parsed.myString.trim() : "";
```

### Palette uniqueness
Every app must have a distinct visual identity. Before choosing colours, check the palette registry in README.md. No two apps share the same background colour or accent.

### No useRef unless necessary
Only import hooks you actually use.

### Error handling
Every callClaude call must be wrapped in try/catch with setError(). The error box must be visible to the user.

### Loading state
Every app must show a loading state while the API call is in flight. The input form must be hidden during loading.

---

## Commit messages

```
feat(skinstack): add conflict checker panel
fix(sprint-mind): raise max_tokens to prevent truncation
chore(infra): update daily token limit to 100k
docs: update README with new app
```
