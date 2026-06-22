## 4. Auth & access control

### Auth: provider vs roll-your-own

**Do:** Use a managed auth provider (Cognito, Clerk, Auth0, Supabase Auth, WorkOS). Let it own login, password reset, MFA, email verification, and session management.
**Never:** Hand-roll login, password reset, MFA, or session logic for a new app.
**Why:** "Simple" auth has dozens of subtle ways to be insecure (timing attacks, token replay, reset-link reuse, account enumeration), and you will not maintain it as well as a provider.
**Escape hatch:** Essentially none for a new app. Self-host an existing battle-tested system (e.g. Keycloak) only if a hard compliance or air-gap requirement forbids SaaS, still not custom code.

### Token / session storage

**Do:** Keep the session token in an `httpOnly`, `Secure`, `SameSite=Lax` cookie. For SPAs, hold the short-lived access token in memory (a JS variable, not web storage) and the refresh token in an `httpOnly` cookie. Because `httpOnly` cookies are auto-sent, add CSRF protection (a custom header the server requires, or double-submit token).
**Never:** Store session, access, or refresh tokens in `localStorage` or `sessionStorage`. Never set `SameSite=None` without `Secure`, and never rely on the browser's default `SameSite`.
**Why:** Any XSS can read web storage; `httpOnly` cookies are unreadable from JS, which contains the blast radius. The trade-off is CSRF, which `SameSite` plus a required custom header closes.
**Escape hatch:** A native mobile app uses the platform secure keystore (Keychain / Keystore), not web storage rules. Use `SameSite=Strict` when no cross-site navigation needs the cookie (defaults to `Lax` otherwise).

### CSRF

**Do:** If auth uses cookies, protect every unsafe method (POST/PUT/PATCH/DELETE) against CSRF: `SameSite` cookies plus a server-required custom header or a double-submit token (see Token / session storage).
**Never:** Treat CORS as CSRF protection. It isn't: a CORS policy, even a correct one, does nothing to stop a form-based cross-site POST.
**Why:** The browser sends your cookie automatically, so any other site can make a state-changing request as your logged-in user unless you require something it can't forge.

### Password handling

**Do:** If you must store passwords, hash with Argon2id (OWASP's default: m=64 MiB, t=3, p=1, tuned to ~100ms/hash on your hardware). bcrypt at cost ≥12 is an acceptable fallback. See "Auth: provider vs roll-your-own", a provider should own this entirely.
**Never:** Store plaintext, and never use fast/general-purpose hashes (MD5, SHA-1, SHA-256, plain HMAC) for passwords. Never feed bcrypt inputs over 72 bytes without pre-hashing, it silently truncates.
**Why:** Fast hashes are trivially brute-forced; password hashing must be deliberately slow and memory-hard.

### Authorization / RBAC

**Do:** Model roles and permissions explicitly. Enforce authorization server-side on every request, in a centralised middleware/policy layer, and deny by default.
**Never:** Rely on a hidden UI element, a disabled button, or any client-side check as the access control. Never trust an `is_admin`/role claim sent from the client, derive it server-side from the authenticated identity.
**Why:** The client is attacker-controlled; the only enforcement that exists is the one on the server.

### Object-level authorization (IDOR)

**Do:** Every endpoint that takes an object id must prove the current user and tenant may access that exact object: scope the query by ownership and tenant (`WHERE id = ? AND tenant_id = ?`), don't fetch by id and check afterwards. Apply it at three levels: object (can they touch this row, OWASP API1), property (can they read or write these fields, API3, the mass-assignment and over-exposure trap), and function (can they call this action at all, API5).
**Never:** Trust an id from the user because they're logged in or hold a role. "Authenticated" and "authorised for this object" are different checks. Never bind a whole request body straight onto your model; allowlist the fields a user may set.
**Why:** Changing an id in a URL or body to read someone else's record is the most common and damaging API flaw (OWASP API1, Broken Object Level Authorization). Agents write `findById(id)` and forget the ownership scope cold.

**Before (agent cold):**
```js
const project = await db.project.findUnique({ where: { id } });
```
**After (this dictionary):**
```js
const project = await db.project.findFirst({ where: { id, tenantId: ctx.tenantId } });
if (!project) return notFound();   // scoped to owner; don't leak existence
```

### Row-level security + connection pooler

**Do:** When combining Postgres RLS with per-request tenant context, set the context as transaction-local with `SET LOCAL` (or `set_config(..., true)`) inside an explicit transaction, and verify isolation under the real pooler.
**Never:** `SET app.current_tenant` (session-level) on a connection drawn from a transaction-mode pooler (PgBouncer `pool_mode = transaction`, Supabase's transaction port, RDS Proxy pinning aside). Never use statement-mode pooling with session GUCs at all, even `SET LOCAL` can land on a different connection.
**Why:** Pooled connections are reused across requests; a session-level variable can leak from one tenant's request to the next, turning the isolation feature into a cross-tenant data leak. `SET LOCAL` is discarded at `COMMIT`/`ROLLBACK`, so it cannot outlive the transaction that owns the pooled connection.
**Escape hatch:** Session-level `SET` is only safe if the connection is exclusively held for the request's lifetime (e.g. a dedicated, non-transaction-pooled connection, or `pool_mode = session`) and reset on checkout, confirm, don't assume.

**Before (agent cold):**
```sql
-- per request, on a transaction-pooled connection (e.g. Supabase/PgBouncer)
SET app.current_tenant = '42';
SELECT * FROM invoices;  -- relies on RLS using app.current_tenant
-- connection returns to pool STILL set to '42'; next tenant inherits it
```
**After (this dictionary):**
```sql
BEGIN;
SET LOCAL app.current_tenant = '42';   -- scoped to this transaction only
SELECT * FROM invoices;                 -- RLS sees the correct tenant
COMMIT;                                  -- variable is discarded with the txn
```

### Multi-tenancy

**Do:** Default to a shared database with a `tenant_id` column on every tenant-owned row, enforced in every query and ideally backed by RLS (see "Row-level security + connection pooler").
**Never:** Reach for a separate database or schema per tenant by default.
**Why:** Per-tenant databases multiply migration and operational cost linearly with customers.
**Escape hatch:** Use a separate database/schema per tenant only when hard isolation or a specific compliance requirement demands it.

### Step-up auth for dangerous actions

**Do:** Require MFA for owners and admins, and re-verify (step up) for high-risk actions: changing email, disabling MFA, adding API keys, exporting data, deleting the account, changing billing, rotating webhooks, or creating admin users. When changing email, verify the new address before it becomes the login identity, and notify the old one. Make password reset and account recovery non-enumerating: return the same response whether or not the email is registered.
**Never:** Let a long-lived session perform an irreversible or high-risk action with no re-verification.
**Why:** A hijacked session shouldn't be able to quietly drain or take over an account. This is practical, not enterprise theatre (your managed provider gives you the MFA primitives, see "Auth: provider vs roll-your-own").

### Revoke access on privilege change

**Do:** When a user is disabled, removed from a tenant, downgraded, resets their password, or rotates or revokes an API key, invalidate everything that could preserve the old access: active sessions, refresh tokens, and any cached permissions.
**Never:** Assume that changing a role or removing a user in the database ends their access. The UI saying "removed" while the old token still works is the bug.
**Why:** Granting access is easy; revoking it is the part everyone forgets. A downgrade that leaves a live session with the old rights is a silent privilege hole (see Step-up auth for dangerous actions, Token / session storage, and the security audit log in Observability & ops).

### Impersonation ("log in as user")

**Do:** Any support or admin "view as customer" feature must be explicit, time-limited, permission-gated, clearly visible in the UI while active, and audited (start and stop in the security log, see Observability & ops). Block billing, password, data-export, and destructive actions under impersonation unless separately authorised.
**Never:** Add a silent or unlogged "log in as user", or let impersonation inherit full account power by default.
**Why:** Impersonation is enormously useful and a loaded gun: unaudited, it's an undetectable account takeover built into your own product.

### Third-party connection (OAuth) safety

**Do:** For app-built "connect X" flows, verify the `state` parameter, use PKCE where appropriate, allowlist redirect URIs, validate the token's audience and issuer, request the minimum scopes, and store refresh tokens only in the secret store or an encrypted database field.
**Never:** Skip `state` or redirect-URI validation, request broad scopes "to be safe", or store refresh tokens in plaintext.
**Why:** A "connect Google / Stripe / GitHub" flow can work end to end and still be wide open to an open redirect, token theft, or scope creep. This is distinct from using a managed provider for your own login.
<!-- REVIEW: OAuth/PKCE "where appropriate" guidance is current; keep capability-first, verify before publish -->
