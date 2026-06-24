## Colophon

The Agent's Dictionary is a static site that serves clean, opinionated markdown for coding agents to read before they build. One markdown source drives both these human pages and the raw files agents fetch. No backend, no database, no client-side rendering.

It follows the [llms.txt](https://llmstxt.org) convention for agent-readable indexes, and the AGENTS.md / SKILL.md conventions for agent instructions.

### What dates fastest here

Most of this dictionary is durable, but a few things rot and need a periodic check (the source carries `<!-- REVIEW -->` flags on each):

- Platform names, pricing, and free tiers (Railway, Render, Netlify, Cloudflare Pages).
- Version-pinned client behaviour (for example, PgBouncer and Prisma connection-flag guidance).
- Specific law and standard versions (the WCAG level, the consent regimes named in Privacy).

The capability rulings ("use a managed pooler", "use object storage", "use a transactional email provider") don't rot. Only the named examples do, so when refreshing, update the flagged lines and leave the rulings alone. Historical facts that were true stay true (uuidv7 landed in Postgres 18; the privacy settlements named in that section); they are illustrations, not a live tally.

### Credits and prior art

This isn't the first ruleset for coding agents, and it's better to point at the others than pretend it arrived from nowhere.

- **Matt Pocock's** grill-me and similar skills explore getting an agent to slow down and ask before it writes. This dictionary's "review your work and ask about anything questionable once it's done" step is in that spirit.
- This site uses **Jeremy Howard's** llms.txt convention for agent-readable indexes.

Built by Chris Northfield. If something's wrong or mis-credited, tell me and I'll fix it.
