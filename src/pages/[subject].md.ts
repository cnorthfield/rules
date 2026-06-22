import type { APIRoute, GetStaticPaths } from 'astro';
import { SUBJECTS, subjectMarkdown } from '../lib/dictionary';

// One raw-markdown page per subject (/data.md, /auth.md, …) for progressive disclosure.
export const getStaticPaths: GetStaticPaths = () =>
  SUBJECTS.map((s) => ({ params: { subject: s.slug } }));

export const GET: APIRoute = ({ params }) =>
  new Response(subjectMarkdown(params.subject as string), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
