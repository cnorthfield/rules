import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import { CANONICAL, LLMS_FULL_URL } from './site';

// Single source of truth: the plain markdown files under src/dictionary/.
// Author once here; render for humans AND serve raw at .md routes. No duplication.
const modules = import.meta.glob('/src/dictionary/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const orderedKeys = Object.keys(modules).sort();

/** The whole dictionary as one markdown string (drives /dictionary.md and /llms-full.txt). */
export const fullMarkdown =
  orderedKeys.map((k) => modules[k].replace(/\s+$/, '')).join('\n\n') + '\n';

/** Raw markdown of a single file, found by filename fragment (e.g. "99-credits"). */
export function getFile(fragment: string): string {
  const key = orderedKeys.find((k) => k.includes(fragment));
  if (!key) throw new Error(`dictionary file not found: ${fragment}`);
  return modules[key];
}

/** One subject = one section file, served as its own page for progressive disclosure. */
export interface Subject {
  slug: string;
  fragment: string;
  title: string;
  summary: string;
}

export const SUBJECTS: Subject[] = [
  { slug: 'foundations', fragment: '01-foundations', title: 'Foundations', summary: 'Answer the data questions first; build the minimum; boring tech; one source of truth.' },
  { slug: 'setup', fragment: '02-setup', title: 'Project setup', summary: 'Deploy target, Postgres, monolith-first, language, data access, repo, config.' },
  { slug: 'data', fragment: '03-data', title: 'Data & database', summary: 'IDs, schema, migrations, money, timestamps, indexing, N+1, pagination, pooling.' },
  { slug: 'auth', fragment: '04-auth', title: 'Auth & access control', summary: 'Use a provider; token storage; passwords; RBAC; multi-tenancy.' },
  { slug: 'security', fragment: '05-security', title: 'Security', summary: 'Validation, SSRF, secrets, least privilege, SQLi, XSS, CORS, rate limits, uploads, headers.' },
  { slug: 'ai', fragment: '06-ai', title: 'Building AI features', summary: 'Treat model output as untrusted; not an auth boundary; prompt injection; cap spend; pin the model.' },
  { slug: 'api', fragment: '07-api', title: 'APIs', summary: 'Naming, validation, minimal responses, errors, idempotency, shared types.' },
  { slug: 'frontend', fragment: '08-frontend', title: 'Frontend & rendering', summary: 'Framework, rendering mode, state, data fetching, perceived speed, bundle size.' },
  { slug: 'forms', fragment: '09-forms', title: 'UI, forms & UX', summary: 'Form validation, submission, empty/loading/error states, inputs, feedback.' },
  { slug: 'a11y', fragment: '10-a11y', title: 'Accessibility', summary: 'Semantic HTML, keyboard, labels, contrast, motion; target WCAG AA.' },
  { slug: 'performance', fragment: '11-performance', title: 'Performance & Core Web Vitals', summary: 'Measure CWV, ship less JS, optimise images, cache and CDN, fast backend.' },
  { slug: 'seo', fragment: '12-seo', title: 'SEO & metadata', summary: 'Crawlable content, per-page metadata, structure, social cards, sitemaps.' },
  { slug: 'media', fragment: '13-media', title: 'Images & media', summary: 'Modern formats, responsive sizing, lazy-load, image CDN, user uploads.' },
  { slug: 'i18n', fragment: '14-i18n', title: 'Internationalisation', summary: 'Externalise strings, locale formatting, routing, RTL, no format assumptions.' },
  { slug: 'features', fragment: '15-features', title: 'Common features', summary: 'Email, file storage, search, webhooks, cron, real-time, payments.' },
  { slug: 'scaling', fragment: '16-scaling', title: 'Scaling', summary: "Don't add it yet: caching, jobs, queues, replicas, statelessness." },
  { slug: 'observability', fragment: '17-observability', title: 'Observability & ops', summary: 'Structured logs, health, error tracking, alerting, kill switch, tested backups.' },
  { slug: 'deploy', fragment: '18-deploy', title: 'Deployment & CI/CD', summary: 'CI pipeline, automated deploys, secrets, parity, feature flags, zero-downtime, rollback.' },
  { slug: 'privacy', fragment: '19-privacy', title: 'Analytics, privacy & consent', summary: 'Minimise data, consent, PII handling, privacy-respecting analytics, user rights.' },
  { slug: 'testing', fragment: '20-testing', title: 'Testing', summary: 'Test the risky logic; unit/integration/E2E; run in CI; real Postgres.' },
  { slug: 'boundary', fragment: '21-boundary', title: 'The boundary', summary: 'What this dictionary does not cover.' },
];

/** Raw markdown for one subject page (section body + a short orientation header). */
export function subjectMarkdown(slug: string): string {
  const s = SUBJECTS.find((x) => x.slug === slug);
  if (!s) throw new Error(`unknown subject: ${slug}`);
  const body = getFile(s.fragment).replace(/^\s+/, '');
  return (
    `# ${s.title}\n\n` +
    `> Part of The Agent's Dictionary. Index: ${CANONICAL}/dictionary.md · Everything in one file: ${LLMS_FULL_URL}\n\n` +
    body
  );
}

/** The lean index: the front matter (core principle + how to use) + links to every subject. */
export function indexMarkdown(): string {
  const preamble = getFile('00-preamble').replace(/\s+$/, '');
  const sections = SUBJECTS.map(
    (s) => `- [${s.title}](${CANONICAL}/${s.slug}.md): ${s.summary}`,
  ).join('\n');
  return (
    `${preamble}\n\n` +
    `## Sections\n\nFetch the page(s) your task needs:\n\n${sections}\n\n` +
    `## Everything in one file\n\n- [Full dictionary](${LLMS_FULL_URL})\n`
  );
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface TocItem {
  level: number;
  slug: string;
  title: string;
}

/** Render markdown to HTML and collect an h2/h3 table of contents in one pass. */
export function render(markdown: string = fullMarkdown): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
  // Only autolink real schemed URLs (https://…); never "SKILL.md", "AGENTS.md", "github.com".
  md.linkify.set({ fuzzyLink: false, fuzzyEmail: false, fuzzyIP: false });
  md.use(anchor, {
    level: [2, 3],
    slugify,
    callback: (token: { tag: string }, info: { slug: string; title: string }) => {
      toc.push({ level: Number(token.tag.slice(1)), slug: info.slug, title: info.title });
    },
  });
  return { html: md.render(markdown), toc };
}
