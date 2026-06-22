## 1. Foundations

### Build order (starting from an idea)

For a new build, work in this order, reading each section as you reach it. Earlier choices constrain later ones, so don't skip ahead.

1. Pathway and the data-architecture questions: establish where it runs and what data is in play. These drive everything, so answer them before writing a line of schema.
2. Data & database: model the data, pick IDs, plan migrations.
3. Auth & access control: provider, sessions, RBAC, tenancy.
4. APIs: endpoints, validation, error shape, idempotency.
5. Frontend & rendering, then UI, forms & UX: only what the product needs.
6. Security pass: walk Security against everything you have built (validation, SSRF if you fetch URLs, secrets, IAM, uploads). This is not optional polish.
7. Deployment & CI/CD plus Observability: the production-ready checklist is the gate to ship.
8. Accessibility, SEO, performance, privacy: apply as the surfaces they cover get built, don't bolt them on at the end.

Don't add anything from Scaling yet. Those are deferred until a measured need appears.

### Working on an existing app

When the code already exists, you are not rebuilding it to match this dictionary. You are making the smallest safe change that moves it toward the rulings, security first.

**Do:**
- Audit before you touch anything. Check the area you're working in against the relevant sections and list the gaps, especially security: secrets in code, missing validation, SQL built by string, public buckets, sequential IDs in URLs, no rate limiting on auth.
- Report the gaps and let the user pick what to fix, rather than silently rewriting.
- Fix security gaps first. Those are the ones that hurt; style and structure gaps are optional.
- Make the smallest diff that closes the gap. Match the codebase's existing patterns where they are sound, and don't reformat or re-architect working code as a side effect.
- For anything risky (schema changes, auth changes, swapping a dependency), use the safe paths already in this dictionary: expand-contract migrations, backward-compatible deploys, a tested rollback. Assume the table is large and live.

**Never:**
- Rewrite a working module to "bring it up to standard" when the user asked for one change.
- Apply a ruling in a way that breaks current behaviour. A rule that takes the app down is worse than the gap it closed.
- Introduce a breaking schema or API change in one step. Expand-contract, always.

**Why:** Existing apps have users, data, and working behaviour. The dictionary's value here is catching real risks and closing them without becoming the thing that broke production.

### Which pathway are you on?

**Do:** Before building, establish the deployment pathway and state it. Ask the user: "Where will this run, AWS, a managed host (Railway/Render/Fly), or do you just want it live with the least fuss (you're not a developer)?" If they don't answer or don't know, default to the Managed platform pathway and say so. For each topic, read the Global ruling (always) plus the single Pathway block matching the chosen path, and ignore the other pathways.
**Never:** Guess the pathway silently, or apply one platform's specifics (such as AWS RDS Proxy) on a different platform.
**Why:** The rulings are universal, but secrets, storage, email, pooling, queues, and deploy differ by platform. Applying the wrong platform's specifics is as bad as ignoring the rule.
**Escape hatch:** A user who names their stack overrides everything. The default is only for when they don't.

### Before you build anything, the data-architecture questions

**Do:** Before writing any schema or CRUD, answer these for the data in play (and where it will run), and let the answers drive the model:
1. Do we even NEED to store this at all? (The cheapest data is the data you don't keep.)
2. What is the data, and what shape?
3. How much, and at what growth rate?
4. Who owns the truth, what is the system of record?
5. How available must it be?
6. How sensitive is it, PII, secrets, regulated?
7. Can we trust it, where and how is it validated? (See the edge-validation rule.)
8. Who can read it, and who can write it?
9. How long is it kept, retention and deletion?
10. How does it get IN and OUT, ingest and export?
11. Where will this run, AWS, a managed platform (Railway/Render/Fly), or non-dev (just get it live)? This selects the pathway (see "Which pathway are you on?").
**Never:** Jump straight to a table plus generated CRUD because the entity "obviously" needs storing.
**Why:** Schema, indexes, access control, and retention are nearly impossible to retrofit cleanly once data exists; these answers are the design, not paperwork before it.

**Before (agent cold):**
```sql
-- "We have users, so:"
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT,
  password TEXT,
  ssn TEXT,
  created_at TIMESTAMP DEFAULT now()
);
-- + auto-generated create/read/update/delete for every column
```

**After (this dictionary):**
```text
Q1 Need it? Yes, system of record for accounts.
Q4 Owner: us. Q6 Sensitivity: email = PII; SSN = regulated, do we even need it? No. Drop it.
Q7 Trust: email validated at the API edge. Q8 Access: user reads own row; only auth service writes credentials.
Q9 Retention: delete 30 days after account closure.
```
```sql
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT uuidv7(),  -- time-ordered PK; PG 18+ (see note)
  email         citext NOT NULL UNIQUE,             -- PII, validated at edge
  password_hash text   NOT NULL,                    -- never store plaintext
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz                         -- soft-delete drives 30-day retention job
);
-- No SSN column: the question "do we need it?" removed an entire liability.
-- uuidv7() is built in on PostgreSQL 18+ (GA Sep 2025) and is time-ordered, so it stays
-- index-friendly as a primary key. On PG < 18 use gen_random_uuid() (UUIDv4, built in since
-- PG 13, no extension), correct but randomly distributed, which fragments the PK index.
```

### The boring-tech default

**Do:** Choose proven, widely-deployed technology with well-understood failure modes over new or clever technology. Default to Postgres, a monolith, and a managed auth provider.
**Never:** Reach for the novel database/framework/runtime because it's interesting or benchmarks well in a blog post.
**Why:** Novelty is a real cost paid in unknown failure modes, thin documentation, and a small pool of people (and answers) when it breaks at 2am.
**Escape hatch:** Adopt the new thing only when the boring option provably cannot do the job, measured, not assumed.
