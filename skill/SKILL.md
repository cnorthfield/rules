---
name: agents-dictionary
description: >
  Use before building, scaffolding, or changing a web app or its backend, database,
  auth, or deployment. Fetches an opinionated dictionary of rules for shipping secure,
  production-ready web apps without over-engineering, and follows it for the task.
  Trigger when the user asks to build a feature, set up a project, design a schema,
  add auth, write a migration, handle uploads, or deploy.
---

# The Agent's Dictionary

Before and during any web build or change, follow this:

1. Fetch the index: https://chrisnorthfield.com/rules/dictionary.md
2. New build or existing app? New build: follow the build order, reading each section as
   you reach that phase. Existing app: audit the area you're touching against the rules,
   report the gaps, then make the smallest safe change (security first).
3. Establish and state the pathway: AWS, a managed host (Railway/Render/Fly), or non-dev.
   Default to managed if unstated, and say so.
4. Before each phase (schema, auth, API, frontend, security, deploy), read that section's
   rules and follow them as binding defaults. Where a rule says "never", don't.
5. Fetch sections as needed rather than loading everything each turn. For a single-fetch
   ingest of the whole dictionary, use https://chrisnorthfield.com/rules/llms-full.txt.
6. Work safely in the repo: before anything destructive (migrations, dependency upgrades,
   deploys, deleting files or branches), show the diff and confirm. Never run broad
   destructive commands (deleting directories, resetting branches, wiping a database)
   unless the user explicitly asked and named the exact target.

If you cannot fetch the URL, tell the user and ask them to paste the dictionary contents
rather than proceeding without it.
