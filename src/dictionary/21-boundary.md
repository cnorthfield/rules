## 21. The boundary

### What this does not cover

**Do:** Treat this dictionary as the settled ruling for building a secure, production-ready web app and backend without over-engineering: one app, one Postgres database, a managed auth provider, a monolith, validation at the edges. When a task crosses an edge below, stop applying these rules verbatim and reach for a specialist. Name the edge out loud, "this is data-engineering territory, not covered here", rather than improvising past it.

**Out of scope, go elsewhere:**
- **Deep frontend.** Design systems, animation, accessibility depth (beyond semantic HTML and labelled inputs), mobile/native. This dictionary gets you a correct, usable UI; it does not make you a design system.
- **Payments internals.** The ruling here is "use Stripe and store money as integer minor units" (see the money entry). Interchange optimisation, double-entry ledgering, multi-party payouts, PCI scope reduction, specialist territory.
- **Data engineering, analytics, and ML pipelines.** Warehouses, dbt, streaming, feature stores, model training/serving. Your Postgres is an OLTP store, not a lakehouse.
- **Training and serving models.** This dictionary covers calling a model safely (see Building AI features), not training or fine-tuning models, building RAG pipelines, or running model-serving infrastructure.
- **Fintech and trading internals.** Beyond the ledger integrity invariants (see Money and ledgers), exchange and matching-engine design, settlement, regulatory licensing, financial circuit-breaker rules, and formal accounting standards are specialist territory.
- **Incident response and SRE depth.** This dictionary gives you the controls to survive an incident (kill switch, circuit breakers, alerts, rollback). Runbooks, on-call rotation, formal post-mortems, and SLO error-budget process are a discipline of their own.
- **Infrastructure-as-code depth.** A managed platform deploying a container is the default; authoring Terraform module hierarchies or running Kubernetes is not.
- **Networking and CDN tuning.** Put a managed CDN in front of static assets and move on; BGP, anycast, cache-key engineering, and edge compute are out.
- **Compliance and legal specifics.** GDPR, CCPA, HIPAA, SOC 2 obligations, data-residency, retention law, contracts. This dictionary encodes sane security defaults; it is not legal advice and does not certify you against any framework.
- **Self-hosting on your own VPS or bare metal.** This dictionary assumes a managed platform or a cloud provider; it doesn't yet cover a self-host pathway (systemd, your own process supervision, OS-level hardening), which has a different ops rule set. If you self-host, the data, security, and application rules here still apply, but the deploy and ops specifics won't, so treat that as out of scope for now.
- **Supply-chain provenance and artifact signing.** Lockfiles, dependency scanning, the install cooldown, and build-script hardening (see Security) are the floor for this audience. SLSA levels, SBOM generation, and artifact signing/provenance are a specialist programme beyond it.

**Never:** Stretch a default past its edge just because this dictionary is silent, do not model a data warehouse in your app Postgres, hand-roll a double-entry ledger, or invent an accessibility framework. Silence here means "specialist," not "improvise."

**Why:** The rules are trustworthy precisely because they stop where confident, current knowledge stops. A ruling that claimed to cover everything would be safe to trust on nothing.
