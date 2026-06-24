import type { APIRoute } from 'astro';
import { fullMarkdown } from '../lib/dictionary';

// The primary URL people point agents at: serve the FULL ruleset in one fetch, so a
// visiting agent gets the actual rules, not an index to summarise or a second URL to
// guess. Same content as /llms-full.txt, from the same single source. The per-section
// /<slug>.md pages remain the progressive-disclosure option.
export const GET: APIRoute = () =>
  new Response(fullMarkdown, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
