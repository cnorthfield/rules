## 5. Security

### Input validation

**Do:** Parse all external input at the edge with a schema (zod, Pydantic, class-validator). Reject unknown fields (`.strict()` in zod, `extra="forbid"` in Pydantic); pass typed, trusted data inward.
**Never:** Trust the client, query string, headers, path params, or webhook bodies. Don't sprinkle ad-hoc `if (!x) throw` checks deep in business logic.
**Why:** One validated boundary means everything inside is typed and safe; scattered checks always miss a path.

### SSRF / user-supplied URLs

**Do:** For any feature that fetches a user-supplied URL (scraper, webhook tester, image/avatar proxy, import-from-URL), defend in depth: allowlist schemes (`http`/`https`) and, where you can, hosts; resolve DNS and reject if **any** resolved address is private/loopback/link-local/unique-local/CGNAT for BOTH IPv4 and IPv6, re-resolving after every redirect; disable redirects or re-validate each hop; run the fetcher with least-privilege egress and no ambient credentials, isolated from credentialed infra. Where the platform supports it, also block the metadata endpoint at the network layer (e.g. enforce IMDSv2 with hop limit 1).
**Never:** `fetch(userUrl)` directly; validate the hostname once and then follow redirects blindly; or check only the *first* resolved address.
**Why:** A raw fetch can be pointed at cloud metadata (`169.254.169.254`) to steal task-role credentials, or at internal services behind your perimeter. Hostname-string blocking is bypassed via DNS rebinding, redirects, decimal/hex/octal IPs, IPv4-mapped IPv6, and multi-record DNS, you must block on **every resolved** address, not the name.
**Escape hatch:** If the destination set is fixed and known (e.g. a single partner's API), a strict host allowlist alone is enough.

**Before (agent cold):**
```js
// fetches whatever the user gives us
const res = await fetch(userUrl);
const body = await res.text();
```

**After (this dictionary):**
```js
import { lookup } from "node:dns/promises";
import net from "node:net";

function isBlockedIp(ip) {
  // Normalize IPv4-mapped IPv6 (e.g. ::ffff:a9fe:a9fe or ::ffff:169.254.169.254)
  // down to the embedded IPv4 and re-check it. new URL() may store the hex form,
  // so a string match on "::ffff:" is NOT enough.
  if (net.isIPv6(ip) && ip.toLowerCase().includes("::ffff:")) {
    const tail = ip.slice(ip.lastIndexOf(":") + 1);
    if (net.isIPv4(tail)) return isBlockedIp(tail);          // dotted form
    const hex = ip.toLowerCase().split("::ffff:")[1] || "";  // hex form a9fe:a9fe
    const parts = hex.split(":");
    if (parts.length === 2 && parts.every(p => /^[0-9a-f]{1,4}$/.test(p))) {
      const n = (parseInt(parts[0], 16) << 16) | parseInt(parts[1], 16);
      return isBlockedIp([24, 16, 8, 0].map(s => (n >>> s) & 255).join("."));
    }
  }
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 127 || a === 10 ||                // this-host, loopback, private
      (a === 172 && b >= 16 && b <= 31) ||                    // private
      (a === 192 && b === 168) ||                             // private
      (a === 169 && b === 254) ||                             // link-local + cloud metadata
      (a === 100 && b >= 64 && b <= 127);                     // CGNAT / common k8s pod CIDR
  }
  if (net.isIPv6(ip)) {
    const v6 = ip.toLowerCase();
    return v6 === "::1" || v6 === "::" ||                     // loopback, unspecified
      v6.startsWith("fe80") ||                                // link-local
      v6.startsWith("fc") || v6.startsWith("fd");             // unique-local (incl. fd00:ec2::254, fd20:ce::254)
  }
  return true; // unparseable -> reject
}

async function safeFetch(userUrl) {
  const u = new URL(userUrl);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("scheme not allowed");
  // all:true -> check EVERY A/AAAA record, not just the first (defeats multi-record rebinding)
  const records = await lookup(u.hostname, { all: true });
  if (records.length === 0 || records.some(r => isBlockedIp(r.address))) {
    throw new Error("blocked address");
  }
  // redirect:"error" throws on any 3xx (no redirect-time re-resolution gap); hard timeout; no ambient creds.
  // Run on a restricted-egress worker so a residual bypass can't reach metadata/internal hosts.
  return fetch(u, { redirect: "error", signal: AbortSignal.timeout(5000) });
}
```

> Note: even with this check there is a DNS-rebind TOCTOU window between `lookup` and `fetch`. The load-bearing control is restricted egress on the worker; treat the address check as defence-in-depth, not the sole barrier. If you must follow redirects, re-run `safeFetch` against each `Location` rather than using `redirect: "follow"`.

### Consuming third-party APIs

**Do:** Treat every third-party API response as untrusted input: validate it against a schema, set timeouts, cap retries, handle partial failure, run the SSRF checks above on any URL the provider hands back, and never let provider data flow unchecked into HTML, SQL, file paths, or permission decisions.
**Never:** Trust data from Stripe, Google, or any provider more than you'd trust a user just because it "came from them". Never drop a provider-supplied URL into a fetch without the checks you'd apply to a user's.
**Why:** Developers trust provider data more than user input, and that trust is the hole (OWASP API10, Unsafe Consumption of APIs). "Treat model output as untrusted" (see Building AI features) is a special case of this.

### Secrets

**Global (every pathway):**

**Do:** Keep secrets in the platform secret store (AWS Secrets Manager / SSM Parameter Store, Vault, your host's secret store); inject at runtime as env vars or mounted files; rotate them. Run secret scanning in CI (and ideally pre-commit) so a secret can't reach git unnoticed.
**Never:** Commit secrets to git, bake them into Docker images, or ship them in a client bundle (anything in the browser is public). If a secret does reach git, rotating it is mandatory, deleting the commit is not enough; assume it is already compromised.
**Escape hatch:** Local dev uses a `.env` file that is gitignored and never the source of prod values.

**Pathway: AWS**

**Do:** Store secrets in AWS Secrets Manager (built-in rotation) or SSM Parameter Store (cheaper `SecureString`); grant the task role read on only its own secrets; inject as task-definition secrets at runtime.
**Never:** Put secrets as plain environment variables in the task definition, or grant `secretsmanager:*` on `*`.
**Why:** A scoped task role keeps secrets out of images and out of every other workload's reach (see IAM / least privilege).

**Pathway: Managed (Railway / Render / Fly)**

**Do:** Set secrets in the platform's Environment Variables / Secrets UI (Fly: `fly secrets set`); reference them at runtime.
**Never:** Commit a `.env` with real values or paste secrets into the build command.
**Why:** The platform's secret store injects them into the running process only, the supported, repo-free path.

**Pathway: Non-dev (just get it live)**

**Agent:** Set every key in the platform's Environment Variables / Secrets settings; never in code or committed files.
**Tell the user:** "API keys and passwords go in your platform's 'Variables' / 'Secrets' settings page (Railway: your service → Variables; Render: Environment), never in the code, a screenshot, or a chat message. If a key ever leaks, rotate it: create a new one, delete the old."

<!-- REVIEW: Secrets pathways name AWS Secrets Manager/SSM, Fly `fly secrets set`, and platform UI paths, verify against current provider docs before publish -->

### IAM / least privilege

**Do:** Scope every role to the specific actions and resources it needs, one narrowly-scoped role per workload.
**Never:** `"Action": "*"` or `"Resource": "*"` in a production policy.
**Why:** A wildcard role turns any app compromise into account compromise; see SSRF for how a leaked task role gets exfiltrated.

### SQL injection

**Do:** Use parameterised queries / bound parameters for every value.
**Never:** Build SQL by concatenating or interpolating user input, including "just this once" in a raw query. Note that table/column names can't be bound; allowlist those against a fixed set, never interpolate from input.
**Why:** ORMs and query builders parameterise for you; the risk reappears the instant you drop to raw SQL.

### XSS / output encoding

**Do:** Rely on your framework's automatic template escaping (React, Jinja, ERB, etc.). If you must render user-supplied HTML, sanitise it with DOMPurify (use `isomorphic-dompurify` for SSR) before rendering. Set a restrictive `Content-Security-Policy`.
**Never:** Concatenate user data into HTML, or pass it to `innerHTML` / `dangerouslySetInnerHTML` unsanitised.
**Why:** Auto-escaping is on by default, the only XSS you ship is the escaping you deliberately bypass.

### Security headers

**Do:** Set a baseline on every response: HSTS, `X-Content-Type-Options: nosniff`, a sensible `Referrer-Policy`, a `Content-Security-Policy` (including `frame-ancestors` to control who can frame you), and `Secure`/`httpOnly`/`SameSite` cookie flags. Don't allow your app to be iframed unless you explicitly need it.
**Never:** Ship with only the framework's default headers and no CSP, or leave `frame-ancestors` unset so any site can frame you (clickjacking).
**Why:** These are cheap, set-once defence in depth. The CSP is your XSS backstop (see XSS / output encoding); the rest close downgrade, MIME-sniffing, referrer-leak, and clickjacking holes.

### Cache-control for sensitive responses

**Do:** Set `Cache-Control: no-store` on authenticated pages and sensitive API responses unless there's a deliberate, reviewed reason not to. If a per-user response is genuinely cacheable, make the cache key vary safely by auth, session, or tenant.
**Never:** Let a CDN or proxy cache per-user data (dashboards, invoices, exports, profiles) without a tenant- or auth-scoped key. Never assume "it's behind login" means "it won't be cached".
**Why:** A cached authenticated response leaks one user's data to another through a shared cache or CDN. Easy to cause, hard to notice. This is the security side of the caching setting in Performance & Core Web Vitals.

### CORS

**Do:** Default to same-origin. If cross-origin is required, allowlist specific known origins and echo back only a match.
**Never:** Reflect an arbitrary `Origin` header, and never combine `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`.
**Why:** Reflecting the origin (or `*` with credentials) lets any site make authenticated requests as your user, it's same-origin policy with the lock taped open.

### Rate limiting

**Do:** Rate-limit at the edge (gateway/CDN/proxy), then add per-identity limits on expensive or abuse-prone endpoints (login, signup, password reset, search, write APIs). Return `429` when exceeded.
**Never:** Rely on client-side throttling, or leave auth endpoints unlimited.
**Escape hatch:** Brute-forceable endpoints (login, OTP, reset) need per-account *and* per-IP limits even if global edge limits exist.

### Public-form abuse

**Do:** Any unauthenticated public form (signup, contact, funnel, comment) needs abuse controls: rate limits, duplicate suppression, a honeypot or a challenge where appropriate, email or domain blocking where needed, and moderation before user-generated content goes public.
**Never:** Expose a public form with no abuse controls. It will get spammed.
**Why:** Authenticated rate limits don't help the anonymous front door. The durable core is rate-limit plus duplicate-suppression plus honeypot plus moderate-before-public; named challenge tools (a CAPTCHA, Cloudflare Turnstile) are just examples of the challenge step.
<!-- REVIEW: challenge-tool names (CAPTCHA / Cloudflare Turnstile) are illustrative examples; keep capability-first, verify before publish -->

### Resource budgets (limit every dimension)

**Do:** Put a ceiling on every dimension a caller can inflate: request body size, upload size, page size and max `limit`, query and search cost, export size, webhook payload size, concurrent jobs per account, a timeout on every outbound call, and a cap on rows touched by bulk or admin actions. Fail closed when a limit is exceeded.
**Never:** Ship an endpoint that lets the caller choose an unbounded amount of work (no max page size, no body cap, no outbound timeout).
**Why:** CPU, memory, storage, and paid provider calls (email, SMS, AI) get abused or accidentally burned, and rate limiting alone won't stop one expensive request (OWASP API4, Unrestricted Resource Consumption). Rate limiting, model spend caps, and keyset pagination are all instances of this one rule.

### User-influenced state is an abuse surface

**Do:** When one user's input can change another user's state or shared state (votes, reports, flags, reactions, ratings, challenges), design for abuse from the start: rate-limit per actor, keep any single actor's action bounded in effect, require authorisation for it, prefer reversible and auditable changes over instant irreversible ones, and make outsized effects (a demote, a ban, a takedown) need more than one signal or a review step.
**Never:** Let a single unverified actor trigger an outsized or irreversible effect on shared or another user's state in one action. Never assume inputs are honest because most are.
**Why:** Any user-influenced state change is an abuse surface: one bad actor with one action shouldn't be able to grief, brigade, or destroy. This is rate limiting and authorisation applied to multi-user actions (see Rate limiting, and Authorization / RBAC in Auth).
**Boundary:** Full vote-integrity, Sybil resistance, proof-of-uniqueness, and content-moderation system design are specialist fields beyond this dictionary (see The boundary). This is the general principle, not a trust-and-safety platform.

### File uploads

**Do:** Validate type by actual content (magic bytes), not the extension or `Content-Type`; enforce a size cap; generate your own filename; store uploads in object storage off the app server; serve and accept via signed URLs.
**Never:** Trust the supplied extension/`Content-Type`, keep the client's filename, or write uploads into a web-served or executable path.
**Why:** A `.jpg` that is really a `.php`/`.html` dropped in a public directory becomes remote code execution or stored XSS.

### Serving user files (downloads)

**Do:** Serve user-uploaded files from a separate media or download origin, not your app origin; force a safe `Content-Type`; set `Content-Disposition: attachment` for anything you don't fully trust; and serve via short-lived signed URLs.
**Never:** Serve user uploads from your app's own origin, or let the browser sniff or inline an uploaded file as HTML or JavaScript.
**Why:** Serving uploads from the app origin turns a file upload into stored XSS and cookie theft on your real domain. This pairs with the upload-validation rules above.

### Dependencies / supply chain

**Do:** Commit a lockfile, pin versions, install only from official registries, and run automated dependency/vulnerability scanning (Dependabot/Renovate plus an `npm audit`/`pip-audit` step) in CI.
**Never:** Add a dependency for a few lines you can write yourself, or `install` from an arbitrary git URL/tarball.
**Why:** Every dependency is code you run with your privileges; fewer, pinned, scanned deps shrink the attack surface.

### Dependency cooldown

**Do:** Don't install brand-new releases the moment they publish. Enforce a release-age cooldown so a version must be a few days old before it's installable: `min-release-age` (npm), `minimumReleaseAge` (pnpm, Bun), or `npmMinimalAgeGate` (Yarn). A week is the cautious setting, a day is the practical floor. Keep committing lockfiles, use `npm ci` or frozen installs, and consider disabling install scripts in CI.
**Never:** Auto-adopt the latest release the instant it publishes, especially via an agent that silently bumps versions.
**Why:** Most malicious releases of popular packages are caught and pulled within hours, so even a one-day delay filters them out at the install layer. Agent-written code makes this worse, because it's hard to track which versions got pulled in.
**Escape hatch:** Fast-track a genuine emergency security fix past the cooldown for that one package; the cooldown is for routine upgrades.
<!-- REVIEW: package-manager cooldown settings are recent and version-specific (npm min-release-age in days, pnpm/Bun minimumReleaseAge, Yarn npmMinimalAgeGate; pnpm default 1440 min in v11); verify names and defaults before publish -->

### Build-script hardening

**Do:** Know that most modern package managers now disable dependency build and lifecycle scripts by default (pnpm, Yarn, and Bun do; npm still runs them by default for now), which is good hardening. When a legitimate package genuinely needs its build step (native modules, engine downloads, bundler binaries), allowlist exactly those trusted packages rather than re-enabling scripts globally, via the package manager's allowlist (pnpm `allowBuilds`, Yarn `dependenciesMeta`, npm's selective approval).
**Never:** Globally re-enable all build scripts to fix one package's failed install, that throws the hardening away for every dependency. Never disable the cooldown or age-gate to rush a routine upgrade.
**Why:** Install-time build scripts are the main way a malicious package runs code on your machine, so disabling them by default is right. But it silently breaks packages that really need a build step, and the lazy fix (re-enable everything) reopens the hole. Allowlist the few you trust.
<!-- REVIEW: package-manager build-script allowlist mechanisms (pnpm allowBuilds [renamed from onlyBuiltDependencies in v11], Yarn dependenciesMeta.built, npm selective approval) verified June 2026; npm scripts-off-by-default lands in v12; these settings move, re-verify before publish -->
