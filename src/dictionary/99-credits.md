## Colophon

The Agent's Dictionary is a static site that serves clean, opinionated markdown for coding agents to read before they build. One markdown source drives both these human pages and the raw files agents fetch. No backend, no database, no client-side rendering.

It follows the [llms.txt](https://llmstxt.org) convention for agent-readable indexes, and the AGENTS.md / SKILL.md conventions for agent instructions.

### What dates fastest here

Most of this dictionary is durable, but a few things rot and need a periodic check (the source carries `<!-- REVIEW -->` flags on each):

- Platform names, pricing, and free tiers (Railway, Render, Netlify, Cloudflare Pages).
- Version-pinned client behaviour (for example, PgBouncer and Prisma connection-flag guidance).
- Specific law and standard versions (the WCAG level, the consent regimes named in Privacy).

The capability rulings ("use a managed pooler", "use object storage", "use a transactional email provider") don't rot. Only the named examples do, so when refreshing, update the flagged lines and leave the rulings alone. Historical facts that were true stay true (uuidv7 landed in Postgres 18; the privacy settlements named in that section); they are illustrations, not a live tally.

### Credits

It builds on others' work:

- **Matt Pocock** and others, for the idea of getting the agent to slow down and think before it writes.
- **Andrej Karpathy**, for the early observations on how AI coding goes wrong.
- **Jeremy Howard**, for the llms.txt convention this site uses.

Built by Chris Northfield. If something's wrong or mis-credited, tell me and I'll fix it.
