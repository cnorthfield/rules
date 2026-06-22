import type { APIRoute } from 'astro';
import { fullMarkdown } from '../lib/dictionary';

// llms.txt convention: the entire dictionary concatenated in one file.
// The whole dictionary in one file: same single source as the per-section pages and
// the /dictionary.md index (which serves only the lean index, not this full text).
export const GET: APIRoute = () =>
  new Response(fullMarkdown, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
