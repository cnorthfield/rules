## 19. Analytics, privacy & consent

This is not legal advice. Privacy law varies by jurisdiction and changes; a lawyer signs off on the real thing, not you (see The boundary). What follows is the engineering default that keeps you out of trouble across GDPR, ePrivacy, and US state law.

### Minimise
**Do:** Collect the least data the feature actually needs, decide retention before you write the first row, and default every privacy setting to the more private option. If you can't name the feature that consumes a field, don't capture it.
**Never:** Log "everything just in case" or hoover up full request bodies, IPs, and device fingerprints because they might be useful later.
**Why:** Data you never collected can't leak, can't be subpoenaed, and isn't a deletion liability. Minimisation and privacy-by-default are GDPR obligations, not nice-to-haves.

### Consent
**Do:** Block non-essential cookies and trackers until the user opts in. Consent must be freely given, specific, informed, and unambiguous, which means no pre-ticked boxes, and "reject all" must be one click on the same layer with the same prominence (size, colour weight, position) as "accept all". Essential cookies (session, security, load balancing) need no consent, and that category is narrow, so analytics and ads don't qualify.
**Never:** Drop the analytics or ad pixel on page load and ask for consent after, bury "reject" behind a "manage preferences" layer, or re-prompt the moment someone rejects. Those are dark patterns and EU regulators (the CNIL among them) are actively sweeping for them.
**Why:** A banner that doesn't actually gate the scripts is theatre; under ePrivacy the tracker firing before consent is the violation, regardless of what the banner says.
**Escape hatch:** Strictly essential cookies and genuinely first-party, aggregate, non-identifying measurement can run without a prompt, but be honest about what "essential" means.

### Honour opt-out signals
**Do:** Detect Global Privacy Control (the `Sec-GPC` header and `navigator.globalPrivacyControl`) and treat it as a binding opt-out of selling and sharing. Under California's CCPA rules (the revised regulations in force since 1 January 2026) and roughly a dozen other US state laws, GPC is a legally valid opt-out on its own, must apply immediately, and California now expects you to surface that you honoured it (an "Opt-Out Request Honored" style acknowledgement). Make opting out as easy as opting in.
**Never:** Ignore GPC because "it's just a browser setting", or require the user to also click your banner after their browser already signalled a preference.
**Why:** This has teeth. For example, the Sephora settlement ($1.2M) was for a site that wasn't even configured to detect GPC, California, Colorado and Connecticut have run coordinated GPC enforcement sweeps, and the Disney settlement ($2.75M, February 2026) was for not fully effectuating opt-outs across devices. Under GDPR the model is different (consent and withdrawal, not sale opt-out), so respect both frameworks rather than assuming one covers the other.

### PII
**Do:** Keep PII out of logs, traces, error reports, and analytics events. Redact at the boundary, encrypt sensitive fields and data at rest and in transit, and write down a retention period and a deletion path for every data class (see Data). Tokenise where you can so the raw value never spreads.
**Never:** Log a full user object, an email, a token, or a card number into your observability stack, or paste production PII into a third-party debugger or LLM. Once it's in your log pipeline it's replicated everywhere and you can't honour a deletion request (see Observability).
**Why:** Logs are the most common accidental PII leak, and they're usually retained longer and access-controlled less than your actual database.

### Analytics
**Do:** Prefer privacy-respecting, cookieless analytics (Plausible, Fathom, or a self-hosted equivalent) that report aggregate metrics without per-user profiles. If you must use Google Analytics or similar, run it behind consent and configure IP anonymisation and the strictest data-sharing settings.
**Never:** Pipe user identifiers, emails, or raw URLs containing tokens into a third-party analytics or ad platform, and never join behavioural data back to a named user without a lawful basis and consent.
**Why:** Sending PII to a third party is a transfer you're liable for, and most "free" analytics is free because it monetises that data.
**Escape hatch:** Product analytics that genuinely needs user-level events (funnels, cohorts) is fine, but pseudonymise the identifier, get consent, and keep it in a tool you control.

### Rights
**Do:** Build data export and deletion as first-class features, not manual one-offs. A user (or a regulator on their behalf) can demand a copy of their data or its erasure, so know every store that holds their records, including backups, caches, logs, and third-party processors, and have a defined turnaround.
**Never:** Treat "delete" as a soft `deleted_at` flag and call it done, or forget the copies sitting in your search index, analytics, and email provider.
**Why:** If you can't enumerate where a user's data lives, you can't actually delete it, and "we lost track of it" is not a defence. Design the deletion fan-out when you design the schema (see Data), not when the first request lands.
