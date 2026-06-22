## 17. Observability & ops

### Healthchecks & observability

**Global (every pathway):**

**Do:** Expose separate liveness and readiness endpoints (e.g. `/livez` and `/readyz`) that the orchestrator and load balancer poll. Wire error tracking (Sentry, or GlitchTip self-hosted) and structured logs (see Logging) from the first deploy, and watch the three signals that matter: latency, error rate, saturation.
**Never:** Launch blind and plan to "add monitoring later," or collapse liveness and readiness into one endpoint. You cannot operate, debug, or roll back what you cannot see.
**Why:** Readiness gates traffic; liveness gates restarts. If liveness checks a dependency, a slow database triggers a restart loop that turns a degradation into an outage.
**Escape hatch:** Readiness may check the database and critical dependencies; keep liveness cheap, in-process, and dependency-free.

**Pathway: AWS**

**Do:** Point the ALB/ECS health check at `/readyz`; ship logs and metrics to CloudWatch; add Sentry for error tracking; use Container Insights for saturation.
**Never:** Point the ALB health check at a `/` that does heavy work or hits the database.

**Pathway: Managed (Railway / Render / Fly)**

**Do:** Use the platform's built-in health check (point it at `/readyz`) and log stream; add Sentry for errors.
**Never:** Rely on the platform dashboard alone, add Sentry so you're told when something breaks.

**Pathway: Non-dev (just get it live)**

**Agent:** Expose `/readyz`, set the platform's health check to use it, and add Sentry.
**Tell the user:** "Your platform shows logs and uptime in its dashboard. Add Sentry (sentry.io) so you get emailed when something breaks instead of hearing it from a user."

<!-- REVIEW: Healthcheck pathways name CloudWatch/Container Insights and Sentry, verify product names/tiers are current before publish -->

### Logging

**Do:** Emit structured JSON logs to stdout and let the platform collect them. Attach a correlation/request id to every log line and thread it through the call stack (AsyncLocalStorage in Node, a context object elsewhere) so a single request is traceable end to end.
**Never:** String-concatenate console spew, write logs to local files the container will lose on restart, or log secrets, tokens, passwords, or PII.
**Why:** Without a per-request id you cannot reconstruct what happened to one user among thousands of interleaved log lines.

### Security audit log

**Do:** Keep a security audit log of the business actions that matter: login success and failure, password reset, MFA change, role or permission change, invite accepted, export created, destructive admin action, impersonation start and stop, billing or payment change, and webhook signature failure. Make it append-only, queryable, tenant-scoped, and redacted (no tokens, passwords, or PII bodies).
**Never:** Rely on app debug logs to answer "who did what", or write the sensitive payload itself (tokens, passwords) into the audit trail.
**Why:** When something goes wrong you need a trustworthy, queryable record of security-relevant decisions, separate from the noisy debug stream. This is distinct from structured logging above (see also the money and ledger audit trail).

### Backups

**Do:** Run automated, regular database backups with point-in-time recovery, AND test a real restore on a schedule. Write down your RPO (how much data you can lose) and RTO (how fast you must be back), and confirm your backup cadence and retention actually meet them. Back up every source of truth, not just the database: object storage (turn on bucket versioning and lifecycle rules), secrets and config, and critical provider state, and test restoring a deleted object too.
**Never:** Trust a backup you have never restored. An untested backup is not a backup, it is a hope. Never treat the database backup as the whole backup when files live in object storage.
**Why:** Backups fail silently (wrong scope, corrupt dump, expired credentials, retention too short for your RPO); the restore drill is the only proof they work. And you can restore the database perfectly and still have lost every uploaded file.

### Monitoring / alerting

**Do:** Alert on symptoms users actually feel, error rate, latency (p95/p99), availability, queue depth. Make every alert actionable and route it to a specific on-call person. Start with a minimal set and add alerts only after a real incident reveals the gap.
**Never:** Page on causes and internal noise (CPU at 80%, individual log lines) that wake people without telling them what to do. Alert fatigue means the real page gets ignored.
**Why:** An alert nobody can act on is noise; noise trains people to silence the pager.

### Operational safety: kill switch and circuit breakers

**Do:** Give every system that takes real-world action (money movement, sending, trading, deploying, any irreversible external call) two things. First, a one-flip safe mode (stop / close-only / read-only) that halts side effects instantly without a deploy, reachable fast, with documented access. Second, an automatic circuit breaker that trips on anomaly (an error-rate spike, a spend or loss cap breached, a reconciliation mismatch, a latency cliff) and fails safe by halting the risky action rather than barrelling on. Persist the tripped state (write it through to the database) and re-engage it on startup; a restart, crash-loop, or redeploy must never silently clear the stop, and if the state can't be read on boot, fail safe and start in safe mode. Write down who can pull the manual stop and what trips the automatic one. Test that it actually trips and holds: trip the breaker in a test, restart the process, and confirm it's still tripped, the same way you test a restore and not just the backup.
**Never:** Ship a side-effecting system whose only off switch is a code deploy or tearing down infrastructure. Never let a breaker fail open, that is, keep acting when the safety signal itself is broken. Never hold the stop only in memory; a process that comes back up with side effects silently re-enabled is the protection undoing itself at the worst possible moment.
**Why:** When something goes wrong in a system that acts on the world, the first need is to stop the bleeding instantly, before you understand why. This is the thing you reach for at 3am, and it matters most for autonomous, tool-calling agents (see Building AI features): autonomy without a stop is how a bug becomes a disaster. A kill switch exists for when things are going wrong, which is exactly when processes restart and deploys happen, so if the tripped state doesn't survive a restart, a crash or a deploy becomes the thing that re-arms the danger.
**Escape hatch:** A purely read-only system needs monitoring, not a kill switch. The moment it can act, it needs the stop. (Trading-engine breaker internals and financial circuit-breaker regulation are specialist, see The boundary.)

**Before (agent cold):** a bad signal fires; the on-call scrambles to write and deploy a hotfix while the damage compounds.
**After (this dictionary):** flip safe mode in one action, the system stops acting, then diagnose calmly.
