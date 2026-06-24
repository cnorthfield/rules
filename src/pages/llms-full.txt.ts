import type { APIRoute } from 'astro';
import { fullMarkdown } from '../lib/dictionary';

// llms.txt convention: the entire dictionary concatenated in one file.
// Same content as /dictionary.md (both serve the full ruleset from the same single
// source); the per-section /<slug>.md pages are the progressive-disclosure option.
export const GET: APIRoute = () =>
  new Response(fullMarkdown, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
