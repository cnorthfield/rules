// Single source of truth for where the dictionary lives.
// Change these two lines (and astro.config.mjs `site`/`base`) to move it.
export const SITE_ORIGIN = 'https://chrisnorthfield.com';
export const BASE_PATH = '/rules';

/** Absolute canonical root, e.g. https://chrisnorthfield.com/rules */
export const CANONICAL = SITE_ORIGIN + BASE_PATH;

/** The primary URL people point their agent at. */
export const DICTIONARY_URL = `${CANONICAL}/dictionary.md`;
export const LLMS_TXT_URL = `${CANONICAL}/llms.txt`;
export const LLMS_FULL_URL = `${CANONICAL}/llms-full.txt`;

export const SITE_NAME = "The Agent's Dictionary";
export const SITE_TAGLINE = 'AI builds it working. This makes it safe.';

/** Astro BASE_URL, normalised to ALWAYS end in a slash so `base + 'page'` can't
 * collapse to `/rulespage`. (Astro returns BASE_URL without a trailing slash here.) */
export const base = import.meta.env.BASE_URL.replace(/\/?$/, '/'); // "/rules/"
export const link = (path: string) => base.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
