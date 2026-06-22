// Build-time internal-link check. Fails the build if any internal href/src in the
// generated HTML does not resolve to a real file in dist/. Catches the base-path
// join bug (/rulesdictionary) and any future broken internal link before deploy.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
const BASE = '/rules'; // keep in sync with astro.config base

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function resolveToFile(url) {
  let u = url.split('#')[0].split('?')[0];
  if (!u.startsWith('/')) return null; // skip relative (none expected) and external
  if (!u.startsWith(BASE)) return `OUTSIDE_BASE`; // an internal link missing the base prefix = the bug
  let rel = u.slice(BASE.length); // path under the deployed root
  if (rel === '' || rel === '/') return join(DIST, 'index.html');
  if (rel.endsWith('/')) return join(DIST, rel, 'index.html');
  if (extname(rel) === '') return join(DIST, rel, 'index.html'); // directory route
  return join(DIST, rel);
}

const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
const broken = [];
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|#|data:)/.test(url)) continue; // external/anchor
    const target = resolveToFile(url);
    if (target === null) continue;
    if (target === 'OUTSIDE_BASE' || !existsSync(target) || !statSync(target).isFile()) {
      broken.push(`${file}  ->  ${url}`);
    }
  }
}

if (broken.length) {
  console.error(`\n✗ link-check: ${broken.length} broken internal link(s):`);
  for (const b of [...new Set(broken)]) console.error('  ' + b);
  process.exit(1);
}
console.log(`✓ link-check: all internal links resolve (${htmlFiles.length} pages scanned)`);
