import type { APIRoute } from 'astro';
import { indexMarkdown } from '../lib/dictionary';

// The primary URL people point agents at: a lean index (routing protocol + links to
// each subject page). Progressive disclosure: fetch only the pages a task needs.
// The whole thing in one file is at /llms-full.txt.
export const GET: APIRoute = () =>
  new Response(indexMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
