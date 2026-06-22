## 8. Frontend & rendering

### Framework choice

**Do:** React via Next.js for app-like products (auth, dashboards, real-time). Astro for content-first/mostly-static sites (blog, docs, marketing). Pick one, app-wide.
**Never:** Hand-roll a framework, or mix several in one app.
**Why:** A boring, well-trodden framework gives you hiring, docs, and answered questions; a custom one gives you a maintenance burden nobody else understands.
**Escape hatch:** Vue or Svelte if that is already the team's stack, known beats optimal. New project with no existing stack: use the defaults above.

### Rendering

**Do:** Match the rendering mode to the page, not the app. Static/SSG for content; SSR only where SEO or first paint actually matters; client-render only the genuinely interactive islands.
**Never:** Ship a heavy client-side SPA for what is really a content site, or SSR a logged-in dashboard that no crawler will ever see.
**Why:** Sending a megabyte of JS to render an article tanks load time and SEO for no benefit; SSR-ing a private dashboard burns server cost for nothing.

### State management

**Do:** Framework-built-in state (component/context) for UI state. TanStack Query for all server data, caching, refetching, mutations, invalidation. That covers ~90% of real apps.
**Never:** Reach for Redux-style global state until local + server state genuinely cannot cope. Don't store fetched server data in a global store and hand-wire its cache.
**Why:** Most "global state" is really server cache; a query library handles staleness and refetch with far less code than a hand-rolled store.
**Escape hatch:** A small global store (Zustand for one shared blob, Jotai for many independent atoms) for truly cross-cutting *client* state, theme, auth session, a complex editor. Still not Redux ceremony.

### Optimistic UI / perceived speed

**Do:** Update the UI instantly on user action and reconcile with the server in the background. Show skeletons/placeholders, not blank screens or spinners. On server rejection, roll back the optimistic change visibly and surface the error.
**Never:** Block the UI behind a spinner for an action that almost always succeeds, or swallow a failed reconcile so the user believes a write landed when it didn't.
**Why:** Perceived speed is a feature. Instant feedback is the difference between an app that feels alive and one that feels broken, but a silent failed write is worse than a slow one.

---

Deep frontend (component architecture, design systems, animation, accessibility internals) is out of scope here, see **The boundary**.
