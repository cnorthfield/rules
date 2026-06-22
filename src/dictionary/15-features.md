## 15. Common features

### Sending email

**Global (every pathway):**

**Do:** Send through a provider (Amazon SES, Postmark, Resend, SendGrid). Configure SPF, DKIM, and DMARC on the sending domain. Send from a background job, not the request cycle, and make sends idempotent (dedupe on a message key so a retry does not double-send).
**Never:** Run your own SMTP server. Block the HTTP request waiting on the provider's API.
**Why:** Self-hosted SMTP lands in spam, IP reputation and the SPF/DKIM/DMARC trifecta are the whole game; transactional providers solve it for you.
**Escape hatch:** Postmark for transactional (best inbox placement, but ~10x SES at scale); SES when you are already deep in AWS and want the lowest cost; Resend if you want React-based templates and a modern API and don't need extreme scale.

**Pathway: AWS**

**Do:** Use SES, cheapest at scale and native on AWS; verify the domain and set SPF/DKIM/DMARC; request production access to leave the sandbox before launch.
**Never:** Forget the sandbox, a new SES account can only send to verified addresses until you request production access.

**Pathway: Managed (Railway / Render / Fly)**

**Do:** Use Resend or Postmark, simplest API and onboarding; they walk you through SPF/DKIM/DMARC. Store the API key as a platform secret.
**Never:** Send mail over SMTP straight from the platform's IPs.

**Pathway: Non-dev (just get it live)**

**Agent:** Integrate Resend or Postmark by API key (stored as a secret); send from a background job.
**Tell the user:** "Sign up at resend.com or postmarkapp.com, add your domain (they show the exact DNS records to paste so mail doesn't go to spam), and give the agent the API key. Don't try to send email from your own server, it lands in spam."

<!-- REVIEW: Email pathways name SES sandbox/production-access flow and providers (Resend/Postmark), verify against current provider docs before publish -->

### Bulk and marketing email

**Do:** Separate transactional email from marketing or bulk email. Bulk email needs an unsubscribe link, a suppression list, bounce and complaint handling, consent and source tracking, and its own rate limits.
**Never:** Let a user upload a CSV and blast it with no suppression, consent, or unsubscribe handling.
**Why:** Outbound bulk email with no guardrails wrecks your sending reputation and can be illegal. **Boundary:** the detailed consent law (GDPR, CAN-SPAM specifics) and deliverability operations are specialist (see The boundary); this is the guardrails, not the discipline.

### File storage

**Global (every pathway):**

**Do:** Use object storage (S3, Cloudflare R2, GCS). Keep buckets private by default. Upload and download directly between client and bucket using time-limited pre-signed URLs, so bytes never stream through your app server.
**Never:** Write user uploads to the app server's local disk.
**Why:** Local disk is ephemeral (gone on redeploy/restart) and not shared across instances, so a file written by one replica is invisible to the next request. Proxying bytes through the app wastes its memory and bandwidth.
**Escape hatch:** R2 when egress cost matters (zero egress fees, S3-compatible pre-signed URLs); S3 otherwise.

**Pathway: AWS**

**Do:** S3 with private buckets and presigned URLs for up/download; scope the task role to the one bucket; put CloudFront in front for public-read assets.
**Never:** Make the bucket public to "make it work," or grant `s3:*` on `*`.

**Pathway: Managed (Railway / Render / Fly)**

**Do:** Use Cloudflare R2 or S3 (these platforms have no durable local disk either); private buckets, presigned URLs. R2 if egress cost matters.
**Never:** Write uploads to the container's disk, it's wiped on every deploy.

**Pathway: Non-dev (just get it live)**

**Agent:** Set up Cloudflare R2 (or S3) with presigned URLs; never the app's local disk.
**Tell the user:** "Uploaded files must go to a storage service (Cloudflare R2 or Amazon S3), not 'the server', files saved on the server disappear every time the app restarts. The agent sets this up."

### Search

**Do:** Start in Postgres. Use `ILIKE` for trivial substring matching; use full-text search (a `tsvector` column with a GIN index) for real search. Only when you measure that Postgres FTS falls short, relevance tuning, faceting, typo tolerance, or scale, reach for a dedicated engine (Typesense or Meilisearch for simple, fast, typo-tolerant app search; Elasticsearch or its fork OpenSearch for heavy aggregations and log-scale needs, pick OpenSearch if you are on AWS).
**Never:** Stand up Elasticsearch on day one for a search box over one table.
**Why:** A dedicated engine is a second datastore to sync, secure, and keep consistent, real operational weight you should not pay before Postgres demonstrably can't cope.

### Webhooks (receiving)

**Do:** Verify the HMAC signature on every inbound webhook and reject anything unsigned or invalid. Dedupe on the provider's event id and make the handler idempotent, providers retry and resend duplicates. Acknowledge fast with a 2xx, then do the real work asynchronously (see Cron / scheduled work for the job runner).
**Never:** Trust the payload because it "came from Stripe." Do slow work before returning the 2xx, the provider times out and retries, multiplying the load.
**Why:** Without signature verification anyone who learns the URL can forge events; without idempotency, normal provider retries cause double-processing.
**Escape hatch:** If the payload contains URLs you then fetch, treat it as SSRF-prone, allowlist destinations and block internal/metadata addresses.

### Webhooks (sending)

**Do:** Sign every outbound payload with HMAC over `timestamp + body` (and reject stale timestamps on the receiver to stop replay) so receivers can verify it. Include an idempotency key / event id. Retry on failure with exponential backoff plus jitter, cap the attempts, then dead-letter. Use short connect/read timeouts. Make the signing secret rotatable: support an overlap window where both the old and new secret verify, then retire the old one.
**Never:** Retry in a tight loop with no jitter (you stampede a recovering endpoint), or retry forever (you wedge the queue behind one dead consumer).
**Why:** Receivers' endpoints are flaky and slow; jittered backoff plus a dead-letter cap is the contract that keeps both sides healthy.

### Cron / scheduled work

**Do:** Run scheduled jobs on a managed scheduler, cloud scheduler, platform cron, or a durable job runner. Make every job idempotent and safe to overlap. For "this scheduled job must run on exactly one instance," elect a single runner with a Postgres advisory lock (`pg_try_advisory_lock`). For "many workers pull distinct jobs off a queue," use `SELECT ... FOR UPDATE SKIP LOCKED`.
**Never:** Hand-roll an in-process `setInterval`/background timer for scheduled work.
**Why:** An in-process timer dies silently when the instance restarts, and double-fires once you run more than one replica, two instances both wake at midnight and run the job twice.

### Real-time / websockets

**Do:** Reach for real-time only when polling genuinely won't do. For one-way server-to-client streams (notifications, progress, token streaming), prefer Server-Sent Events, plain HTTP, built-in reconnection, no extra infra. Use websockets only when the client must also push to the server; they are stateful and don't fit a stateless app tier, so terminate them on a managed service (Pusher, Ably) or a separate horizontally-scalable layer, and never pin a client to one app instance.
**Never:** Hold long-lived websocket connections directly on the same instances that serve HTTP requests, sticky-routed to one box.
**Why:** Stateful connections on the app tier break deploys, autoscaling, and load balancing, every restart drops every socket, and you can't scale out without sticky routing.

### Payments

**Do:** Use Stripe (or an equivalent PSP). Drive the card flow through the provider's **hosted Checkout** (or a fully provider-hosted iframe) so the browser tokenizes the card directly with the provider and your pages never serve the card form; your server only ever sees the token. Reconcile payment state from idempotent, signature-verified webhooks (see Webhooks (receiving)), not from the redirect/success callback.
**Never:** Accept, log, or store a raw card number, CVV, or full PAN anywhere, not even "temporarily." Treat the success redirect as proof of payment.
**Why:** The one rule, card data never touches your servers. The moment a PAN hits your infrastructure you are in full PCI-DSS scope. Fully hosted Checkout keeps you in the simplest tier (SAQ A); embedded Elements/Stripe.js served from your own page usually lands in SAQ A-EP (more controls, scripts must be inventoried), so prefer hosted Checkout unless a product need forces embedded fields. The redirect can be forged or interrupted; the webhook is the source of truth.
**Escape hatch:** Use embedded Elements when the checkout UX requirement is non-negotiable, accept the SAQ A-EP obligations (script/integrity monitoring) that come with it.

### Money and ledgers

**Do:** For anything with balances, orders, or a ledger (credits, wallets, accounting, trading), enforce: integer minor units (see Money in Data); writes made idempotent with a client-supplied key; an append-only or double-entry ledger rather than balances mutated in place; reconciliation against the external source of truth (the PSP, the bank, the exchange); and an immutable audit trail.
**Never:** Represent money as floats, place a charge or order without an idempotency key, mutate a balance with no audit record, or treat your own database as the source of truth for funds held somewhere else.
**Why:** Ledgers and order systems fail differently from card checkout. The risks are double-spends, lost writes, and un-auditable drift, none of which hosted Checkout covers.
**Boundary:** Exchange and trading-engine internals, regulatory and licensing requirements, and formal accounting standards are out of scope (see The boundary). This entry is the integrity invariants, not a fintech course.
