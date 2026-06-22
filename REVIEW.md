# REVIEW — verify before publish

Every `<!-- REVIEW -->` flag in the dictionary source, in one place. These are platform, product, version, or pricing claims that go stale — confirm each against current docs before treating the site as final. They are HTML comments in the source (hidden on the rendered page, visible in the raw `.md`).

16 flags.

---


## Not a developer? Start here

- [ ] Non-dev shortlist names platforms + pricing reality (Railway no real free tier / ~$5+ floor, Render free web sleeps + free Postgres ~30-day expiry, Netlify/Cloudflare Pages genuine free static) verified June 2026; plans change, re-verify before publish

## 2. Project setup

- [ ] **Getting started: where to deploy** — Getting-started names AWS services (ECS Fargate/Express Mode/RDS/Aurora/ALB) and platforms (Railway/Render/Fly) + their deploy flows, verify names and steps are current before publish

## 3. Data & database

- [ ] **Connection pooling** — Connection-pooling pathways name RDS Proxy behaviour + Supabase transaction port, verify against current provider docs before publish
- [ ] **Choosing and configuring your data layer** — tool names (Kysely, Drizzle, Prisma, TypeORM) and the UUIDv7/PG18 + gen_random_uuid specifics verified June 2026; re-verify before publish, and keep the category language ("typed query builder", "ORM") primary with tools as examples

## 4. Auth & access control

- [ ] **Third-party connection (OAuth) safety** — OAuth/PKCE "where appropriate" guidance is current; keep capability-first, verify before publish

## 5. Security

- [ ] **Secrets** — Secrets pathways name AWS Secrets Manager/SSM, Fly `fly secrets set`, and platform UI paths, verify against current provider docs before publish
- [ ] **Public-form abuse** — challenge-tool names (CAPTCHA / Cloudflare Turnstile) are illustrative examples; keep capability-first, verify before publish
- [ ] **Dependency cooldown** — package-manager cooldown settings are recent and version-specific (npm min-release-age in days, pnpm/Bun minimumReleaseAge, Yarn npmMinimalAgeGate; pnpm default 1440 min in v11); verify names and defaults before publish
- [ ] **Build-script hardening** — package-manager build-script allowlist mechanisms (pnpm allowBuilds [renamed from onlyBuiltDependencies in v11], Yarn dependenciesMeta.built, npm selective approval) verified June 2026; npm scripts-off-by-default lands in v12; these settings move, re-verify before publish

## 6. Building AI features

- [ ] **Cap model spend, hard** — provider budget mechanisms named (AWS Budgets/Bedrock, OpenAI, Anthropic limits); verify current product capabilities before publish
- [ ] **Mind what you send, and pin the model** — provider data-handling/retention terms vary and change; keep capability-first, verify before citing any provider's terms

## 15. Common features

- [ ] **Sending email** — Email pathways name SES sandbox/production-access flow and providers (Resend/Postmark), verify against current provider docs before publish

## 16. Scaling

- [ ] **Queues** — Queues pathways name SQS/EventBridge Scheduler/Fargate and BullMQ, verify service names are current before publish

## 17. Observability & ops

- [ ] **Healthchecks & observability** — Healthcheck pathways name CloudWatch/Container Insights and Sentry, verify product names/tiers are current before publish

## 18. Deployment & CI/CD

- [ ] **Source-control safety** — branch-protection / required-review / CODEOWNERS specifics are platform-named (GitHub/GitLab); keep capability-first, verify before publish
- [ ] **Container and runtime hardening** — base-image and Linux-capability specifics are stable but verify wording before publish

