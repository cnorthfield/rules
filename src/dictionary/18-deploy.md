## 18. Deployment & CI/CD

### What "production-ready" means

**Do:** Treat "production-ready" as a concrete checklist, not a vibe. Ship only when all of these hold: it deploys repeatably from CI with zero manual steps; secrets are external (see Secrets in deploy); it has a healthcheck, structured logs, error tracking, and a few key metrics with alerts (see Healthchecks & observability, Monitoring / alerting); migrations run safely and reversibly (see Migrations); backups exist AND a restore has been tested (see Backups); and a fast rollback exists (see Rollback plan).
**Never:** Equate "production-ready" with "feature-complete" or "perfect." It is the operational floor that lets you survive your own mistakes.
**Why:** Every item on this list is something you cannot retrofit calmly at 3am during an incident.

### Source-control safety

**Do:** Protect main. Require CI to pass before merge, and require human review on the risky areas: auth, billing, migrations, IAM, secrets, infrastructure, and data deletion. Hold an agent to the same gates as a person, no direct pushes to main, no production change that skips CI or review.
**Never:** Let an agent (or anyone) push straight to main or deploy to production without the gates that protect everyone else.
**Why:** The whole pitch is "point your agent at this and let it build", so the dictionary has to say the agent doesn't get to bypass the safeguards. Risky areas need a human in the loop even when the code was machine-written.
<!-- REVIEW: branch-protection / required-review / CODEOWNERS specifics are platform-named (GitHub/GitLab); keep capability-first, verify before publish -->

### Secrets in deploy

**Do:** Inject secrets at runtime from the platform secret store (env vars or mounted secret files) so they exist only in the running process's memory (see Secrets).
**Never:** Bake secrets into the image, commit them to the repo, or pass them as Docker build args, build args are recorded in image history (`docker history`) and CI logs forever. If a secret is needed at build time, use a BuildKit secret mount (`RUN --mount=type=secret`), which never lands in a layer.
**Escape hatch:** Build-time public config (API base URLs, feature flags) is fine as a build arg; anything that grants access is a runtime secret.

### Container and runtime hardening

**Do:** Run containers as a non-root user, from a minimal base image, with build tools kept out of the runtime image. Drop unnecessary Linux capabilities, use a read-only filesystem where practical, and never mount the Docker socket into a container.
**Never:** Ship a root container with build tooling and a mounted Docker socket exposed to the internet.
**Why:** Agents generate Dockerfiles that run, not Dockerfiles you'd safely expose; these few defaults shrink the blast radius of any app compromise. (Full Kubernetes and runtime-security tooling stay out of scope, see The boundary.)
<!-- REVIEW: base-image and Linux-capability specifics are stable but verify wording before publish -->

### Env parity

**Do:** Keep dev, staging, and prod as similar as possible, same database engine and major version, same runtime major version, and use containers to kill "works on my machine."
**Never:** Use SQLite in dev and Postgres in prod, or run different Postgres major versions across envs. Differences in SQL dialect, types, transactions, collation, and constraints surface only in production.
**Escape hatch:** Staging can run smaller instances and fewer replicas; keep the engines and major versions identical even when sizing differs.

### Zero-downtime deploys

**Global (every pathway):**

**Do:** Roll out with rolling or blue-green deploys behind a load balancer that uses the readiness check to gate traffic. Pair every rollout with backward-compatible expand-contract migrations so in-flight requests on the old code keep working through the rollout window (see Migrations, Rollback plan).
**Never:** Stop the old version before the new version passes readiness, or apply a breaking schema change mid-rollout while both versions are live.
**Escape hatch:** A brief, announced maintenance window is acceptable for a genuinely unavoidable destructive migration, keep it rare.

**Pathway: AWS**

**Do:** ECS rolling deploys (or blue/green via CodeDeploy) behind the ALB, gated on the readiness check; keep migrations expand-contract.
**Never:** Set the ECS minimum-healthy-percent to 0 during a deploy.

**Pathway: Managed (Railway / Render / Fly)**

**Do:** Let the platform's built-in rolling deploy handle it, it starts the new version, waits for the health check, then shifts traffic. Your job is expand-contract migrations.
**Never:** Disable the health check to "speed up" a deploy.

**Pathway: Non-dev (just get it live)**

**Tell the user:** "Your platform already deploys with no downtime, it starts the new version, checks it's healthy, then switches over. You don't need to do anything except let the agent keep database changes backward-compatible."

### Feature flags and gradual rollout

**Do:** Gate risky new behaviour behind a flag and roll it out gradually (internal users, then a small percentage, then everyone), with a documented kill path. This is expand-contract for behaviour, the partner to the migration rule in Data.
**Never:** Ship risky logic to 100% of users in one step with no way to turn it off short of a rollback deploy.
**Why:** You already avoid irreversible schema changes; behaviour deserves the same. A flag turns "deploy and pray" into "roll out and watch."

### Rollback plan

**Do:** Make every deploy revertible in one fast action, with the previous version always one click/command away. Decouple rollback from the database with backward-compatible expand-contract migrations, so old and new code both run against the current schema (see Migrations).
**Never:** Ship a migration that drops or renames a column in the same deploy as the code that depends on it, you can no longer roll back the code without also reverting the schema, and that is the trap that turns a small bug into an outage.
**Why:** Fast rollback is your real safety net; an irreversible schema change quietly removes it.
