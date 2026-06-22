## 2. Project setup

### Getting started: where to deploy

**Global (every pathway):**

**Do:** Deploy from a Git repo via CI to a platform that runs your app as a stateless container (or static bundle) next to a managed Postgres. The deploy must be repeatable and one-command; the database must be managed (automatic backups + point-in-time recovery you don't hand-roll). Choose the platform by the pathway, not by hype.
**Never:** Deploy by SSH-ing into a box and editing files, run Postgres on the same disk as the app with no backups, or pick a platform you can't get logs and a one-click rollback from.
**Why:** Where you deploy decides the *how* of half this dictionary (pooling, secrets, storage, email, jobs); fix the pathway up front so every later choice has an answer.

**Pathway: AWS**

**Do:** Run the container on ECS on Fargate (use ECS Express Mode for the simplest single-service path); managed Postgres on RDS (or Aurora); an ALB for TLS and health checks. Define infrastructure as code (CDK/Terraform) once you run more than one service.
**Never:** Start on raw EC2 you patch by hand, or reach for EKS/Kubernetes for a single app.
**Why:** ECS on Fargate gives containers without managing servers; RDS gives the managed-database guarantees. (Avoid App Runner, it stopped taking new customers in 2026; ECS Express Mode is its replacement.)

**Pathway: Managed (Railway / Render / Fly)**

**Do:** Point the platform at your GitHub repo and let it build, run the container, and provision its managed Postgres. Use the `DATABASE_URL` it gives you; it does rolling deploys and health checks for you.
**Never:** Bring your own orchestration here, use what the platform provides.
**Why:** These platforms collapse deploy + database + TLS + rollout into `git push`; that is the whole point of choosing one.

**Pathway: Non-dev (just get it live)**

**Agent:** Put the code in a GitHub repo, provision managed Postgres on the chosen platform, wire `DATABASE_URL`, deploy from the repo, and confirm automatic backups are on.
**Tell the user:** "Go to railway.app (or render.com), sign in with GitHub, click New Project → Deploy from your repo, and add a Postgres database from their menu. It then redeploys automatically every time we push."
**Never** tell the user to copy files onto a server or run something on their own computer to keep the site up.

<!-- REVIEW: Getting-started names AWS services (ECS Fargate/Express Mode/RDS/Aurora/ALB) and platforms (Railway/Render/Fly) + their deploy flows, verify names and steps are current before publish -->

### Which database

**Do:** Default to PostgreSQL for essentially everything: relational data, JSON via `jsonb`, full-text search (`tsvector` + GIN index), geo via PostGIS, and queues at small scale (`SELECT ... FOR UPDATE SKIP LOCKED` over a jobs table with a composite index on `(status, created_at)`).
**Never:** Reach for MongoDB, DynamoDB, Elasticsearch, or a dedicated queue broker as the *first* datastore because the data "feels" document-y or because scale is anticipated.
**Why:** One engine you know deeply beats four you half-know; Postgres covers the long tail (JSON, search, geo, queue) well enough that the second datastore is almost never needed in the first 12 months.
**Escape hatch:** A genuine, specific, *measured* need, heavy document workloads, true high-volume time-series, or a search-first product, justifies a specialised store. Even then, start on Postgres and let measurement force the move (see Source of truth: derived stores must rebuild from Postgres).

### Monolith vs services

**Do:** Ship one deployable monolith, organised internally by domain (see Repo structure). Split only when a concrete force demands it: a hot path that must scale independently, a hard team-ownership boundary, or genuinely divergent runtime/compliance needs.
**Never:** Start with microservices "to be ready to scale."
**Why:** Premature services buy a distributed system's failure modes, network partitions, partial failures, distributed transactions, deploy choreography, without the scale that would justify paying for them.
**Escape hatch:** When you do split, split along one of the named boundaries above, not by technical layer.

### Language / runtime

**Do:** Use the language the team already ships in, pinned to one runtime version across the whole codebase (lock it in the project manifest and CI, e.g. `.nvmrc` / `.python-version` / `go.mod`). No second language without a hard, named reason.
**Never:** Adopt a new or trendy language/runtime for a production system to learn it; run a polyglot stack "because the right tool for the job"; or let local, CI, and prod drift onto different runtime versions.
**Why:** The runtime is the floor everything else stands on, not where you innovate. Version drift between environments is a top source of "works on my machine" bugs, pin it once, everywhere.

### ORM vs raw SQL vs query builder

**Do:** Use a typed data layer for ordinary app CRUD, a typed query builder by default and an ORM when relations and migrations earn it (see "Choosing and configuring your data layer" in Data for the call), and drop to parameterised raw SQL for the few complex or performance-critical queries.
**Never:** Hand-concatenate SQL strings or interpolate user input into a query (injection); never let an ORM silently emit N+1 queries, eager-load or batch instead (see N+1).
**Why:** A typed layer kills boilerplate and keeps parameterisation automatic; raw SQL keeps the hard 5% readable and fast. Use each where it wins. Whatever you pick, its schema defaults won't match the data rules, so override them (see "Choosing and configuring your data layer").
**Escape hatch:** Raw SQL is still parameterised SQL, pass values as bind parameters, never via string formatting, even when you've left the ORM.

### Repo structure

**Do:** Start with one repository, organised by feature/domain (e.g. `billing/`, `accounts/`) rather than by technical layer (`controllers/`, `models/`, `services/`).
**Never:** Split into multiple repos before there is a real team or ownership reason.
**Why:** Feature-first layout keeps a change to one capability in one place; per-layer folders scatter every feature across the tree. Multi-repo adds versioning and cross-repo-change cost you don't need yet.

### Config & environments

**Do:** Read all config from environment variables, keep secrets out of the repo, and maintain separate config per stage (dev/staging/prod). Build the artifact once and promote that *same* artifact through stages; only config differs between them.
**Never:** Commit config or secrets, hardcode per-environment values, or rebuild a separate artifact per stage.
**Why:** Promoting one artifact means the binary you tested in staging is byte-for-byte the one in prod, divergence can only come from config, which is far easier to audit.
**Escape hatch:** Secrets belong in a managed secrets store (your platform's secret manager) injected as env vars at runtime, not in committed `.env` files, commit only a `.env.example` with empty values.

### Source of truth

**Do:** Treat the database as the single source of truth. Caches, search indexes, denormalised tables, and client state are derived copies, and you must always be able to rebuild every one of them from the database.
**Never:** Treat a cache, index, or client-held value as canonical, or let a derived store drift with no rebuild path.
**Why:** When (not if) a derived copy goes stale or corrupt, "rebuild from the source of truth" is the recovery plan. If the copy *is* the only truth, there is no recovery.
