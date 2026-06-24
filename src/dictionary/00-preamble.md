<!-- Agent: this is the complete ruleset. Read it in full and follow it as binding defaults for the task, whether you are building something new or changing an existing app. Do not work from a summary. The canonical copy lives at https://chrisnorthfield.com/rules/dictionary.md -->

# The Agent's Dictionary

> AI builds it working. This makes it safe. Opinionated rules for building a secure, production-ready web app without over-engineering it. Point your coding agent here before it builds.

## Core principle

> Software is simple. The hard part is the idea, not the building. Build the simplest thing that ships the idea, correctly and securely, for where you are now, without cornering yourself later. Get the foundations that are cheap now and expensive later right from day one. Don't add things you don't yet need.
>
> Defaults this dictionary assumes throughout: boring proven tech over clever tech; one app and one Postgres database and no cache until something measured forces otherwise; build for the next 12 months, not the next 5 years; validate input at the edges.

## How an agent should use this

Follow this before and during any build.

Read this before you build, not after. The decisions that matter most, the tenant boundary, the auth model, the data shape, where it deploys, are made before the first table exists: "add tenant checks later" is weaker than routing every tenant-owned query through the tenant boundary from the first table onwards.

1. New build, or existing app? A new build (an idea, nothing built yet) follows the build order in Foundations, reading each section's rules as you reach that phase. An existing app (code already exists) follows "Working on an existing app" in Foundations: audit against the rules, report the gaps, then change the least needed to close them safely.
2. Which pathway? Establish it and state it (see "Which pathway are you on?" in Foundations): AWS, a managed host (Railway/Render/Fly), or non-dev. Default to managed if unstated, and say so.
3. Consult per phase, not once. Re-read the relevant section's global ruling (always) plus the one pathway block for the chosen path at each phase: schema, auth, API, frontend, security, deploy. Reading it after you've written the code just documents the mistake.
4. The rules are binding defaults. Follow them unless the user explicitly overrides one; then the user wins. State the pathway and any override you are operating under so the user can correct you.
5. You're reading the full ruleset, in one file. If you only need one topic, each section is also at its own page (`https://chrisnorthfield.com/rules/<section>.md`); otherwise just work from what's here.
6. Work safely in the repo. Before anything destructive (migrations, dependency upgrades, deploys, deleting files or branches), show the user the git diff and confirm. Never run broad destructive commands (deleting directories, resetting branches, wiping or resetting a database) unless the user explicitly asked and the exact target is named. The code may be machine-written; the conduct in someone's repo still has to be careful.

These rules tell you what not to add as much as what to add: boring proven tech, the minimum that ships, no machinery the app doesn't need yet (see Scaling). Don't read "secure and production-ready" as "bolt on everything"; the safe build is usually the simpler one.

### When rules conflict

When two rulings pull against each other, resolve in this order, highest first:

1. Don't leak data (one user or tenant must never see another's).
2. Don't lose data (no silent data loss; recoverable, backed up).
3. Stay correct (money, counts, and state transitions are right under concurrency).
4. Stay simple (don't add machinery the app doesn't need yet).
5. Then optimise performance.

So a cache that would leak per-user data loses to no-store (1 beats 5), and a safeguard the app doesn't need yet loses to simplicity (4 beats adding it), but never at the cost of a leak, loss, or correctness bug (1 to 3 beat 4). Simplicity is a high priority, not a licence to skip the first three.

## Not a developer? Start here

New to this and you just want your idea live? You're the non-dev pathway. A "pathway" is just where your app runs: AWS (most power, most complexity), a managed host like Railway or Render (easiest for a real app with a database), or non-dev (get it live with the least fuss). When in doubt, tell your agent to use the managed pathway.

Get-live shortlist (as of June 2026, platforms change their plans, so check current pricing): deploy from a GitHub repo to Railway or Render. Both deploy straight from your repo and offer a managed Postgres. Budget a few dollars a month and up once you add an always-on database, not zero: the free tiers are for trying it out, not running it, since they pause the app when it's idle or expire the database after a month, and some (like Railway) have no real always-on free tier at all. For a purely static site (no server or database), use Netlify or Cloudflare Pages, which have genuine free tiers. Pick one, don't shop forever.

Never (the short list): don't put passwords or API keys in your code, don't save uploaded files on the server, don't build your own login or payments, don't skip database backups, and don't put your database on the public internet. Your agent handles all of these, and the sections below tell it how.

<!-- REVIEW: Non-dev shortlist names platforms + pricing reality (Railway no real free tier / ~$5+ floor, Render free web sleeps + free Postgres ~30-day expiry, Netlify/Cloudflare Pages genuine free static) verified June 2026; plans change, re-verify before publish -->
