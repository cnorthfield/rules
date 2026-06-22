# The Agent's Dictionary

A static site whose product is a **markdown dictionary that coding agents read before they build**.
Point an agent at `https://chrisnorthfield.com/rules/dictionary.md` and it looks up opinionated,
correct recipes for shipping a secure, production-ready web app — without over-engineering it.

The site practises what the dictionary preaches: a static Astro build serving clean markdown.
No backend, no database, no client framework, no analytics, no signup.

## How it works

- **Single source of truth:** plain markdown files in `src/dictionary/*.md` (sorted by filename).
  They are authored once and drive both the human pages and the raw `.md`/`.txt` endpoints — no duplication.
- **Human pages** (`/`, `/dictionary`, `/skill`, `/credits`): Astro + Tailwind, rendered from the same markdown.
- **Machine files** (raw markdown, no HTML wrapper):
  - `/dictionary.md` — the lean index (routing protocol + preamble + a link to each subject page); the primary URL to give an agent, for progressive disclosure
  - `/llms.txt` — the llms.txt index
  - `/llms-full.txt` — the whole dictionary in one file (not identical to `/dictionary.md`, which serves only the index)
- All content is in server-returned HTML (static generation); nothing relies on client JS to render text.
  The only JS on the whole site is a tiny inline clipboard-copy on the landing page.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321/rules/
npm run build    # outputs to dist/
npm run preview  # serve the build locally
```

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds the site and publishes it under `/rules` with a custom-domain apex.

It assembles the Pages artifact so the built files live under `/rules/` (to match the `base`),
writes a `CNAME` of `chrisnorthfield.com`, and redirects the apex `/` to `/rules/`.

**Repository setup:**
1. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Settings → Pages → Custom domain: `chrisnorthfield.com` (and configure DNS as GitHub instructs).
3. Push to `main` — the workflow builds and deploys.

**If your topology differs:** the deploy location is configured in two places —
`astro.config.mjs` (`site` + `base`) and `src/lib/site.ts` (`SITE_ORIGIN` + `BASE_PATH`).
- Using the default `username.github.io/<repo>` URL (no custom domain)? Set `base`/`BASE_PATH` to `/<repo>`,
  remove the `CNAME` line and the `/rules` nesting from the workflow.
- Reverse-proxying `/rules` from an existing site to a Pages project? Keep `base: '/rules'`,
  drop the `CNAME` and apex redirect.

### Known host limitation (Content-Type)

GitHub Pages serves files by extension and does not support per-file headers:
- `/dictionary.md` → `text/markdown; charset=utf-8` ✅ (this is the advertised URL)
- `/llms.txt`, `/llms-full.txt` → `text/plain; charset=utf-8` (conventional for `.txt`; body is identical markdown)

The spec asks for `text/markdown` on `/llms-full.txt`; that is not achievable on GitHub Pages.
If `text/markdown` on those `.txt` URLs is required, host on Cloudflare Pages / Netlify with a `_headers` file.

## Editing entries

Entries live in `src/dictionary/*.md`, one file per section, sorted by filename. Edit the markdown,
`npm run build`, and push — the deploy workflow redeploys. The same source feeds the human pages and
the raw `/dictionary.md`, `/llms.txt`, and `/llms-full.txt` outputs, so there is nothing to keep in sync.

## Structure: Global + Pathways

A routing protocol (`## How to use this reference`) at the top tells an agent to pick a **pathway** —
AWS, a **managed platform** (Railway/Render/Fly), or **non-dev** — then, per topic, read the Global
block plus its own pathway block.

Inside each entry:

- `#### Global — applies to every pathway` — the universal ruling (every entry has one).
- `#### Pathway: AWS` / `#### Pathway: Managed platform (Railway / Render / Fly)` / `#### Pathway: Non-dev (just get it live)` —
  added **only** where the platform actually changes the answer. Most entries are Global-only; don't add
  pathway blocks as padding.

The human page renders Global/Pathway blocks as tinted callouts (render-only; the raw markdown is plain
headings). `<!-- REVIEW: ... -->` comments mark platform/version/pricing claims to re-verify before
publish; `REVIEW.md` collects them all.
