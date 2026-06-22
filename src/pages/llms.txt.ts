import type { APIRoute } from 'astro';
import { DICTIONARY_URL, LLMS_FULL_URL, CANONICAL } from '../lib/site';
import { SUBJECTS } from '../lib/dictionary';

const subjects = SUBJECTS.map(
  (s) => `- [${s.title}](${CANONICAL}/${s.slug}.md): ${s.summary}`,
).join('\n');

const body = `# The Agent's Dictionary

> Point your coding agent at this before it builds. High-level, opinionated rules for building a secure, production-ready web app without over-engineering it. Fetch only the section pages your task needs, or the full file below.

## Start here
- [Index + how to use](${DICTIONARY_URL}): the routing protocol and links to every subject

## Subjects
${subjects}

## Full
- [Everything in one file](${LLMS_FULL_URL})
`;

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
