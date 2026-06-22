## 12. SEO & metadata

### Crawlability
**Do:** Server-render the content you want ranked so it's in the initial HTML response, and return real status codes (404 for gone, 301 for moved).
**Never:** Hide primary content behind client JS, tabs, accordions, or "load more", or ship a 200 "soft 404".
**Why:** Crawlers index what's in the HTML they fetch; content that only appears after hydration or a click may never be seen.

### Metadata
**Do:** Give every page a unique title (lead with the subject, not the brand) and a unique meta description, and set a canonical URL to collapse query-param, trailing-slash, and protocol duplicates.
**Never:** Reuse one boilerplate title or description site-wide, or chase keyword density. The keywords meta tag is dead.

### Structure
**Do:** Use one h1 stating what the page is, nest h2/h3 by meaning, and write link text that says where it goes.
**Never:** Pick heading levels for font size (style with CSS), or use "click here" / "read more" as link text.

### Social & discovery
**Do:** Add Open Graph and X (Twitter) card tags with a correctly sized share image, publish a sitemap.xml of canonical indexable URLs referenced from robots.txt, and add Schema.org JSON-LD where it fits (articles, products, breadcrumbs).
**Never:** Disallow your whole site by accident in robots.txt, use robots.txt to hide secrets (see security), or mark up structured data for content that isn't actually on the page.
**Escape hatch:** Skip structured data entirely if no schema cleanly matches the page; wrong or invented markup is worse than none.

### Fundamentals
**Do:** Treat speed and mobile as ranking factors (indexing is mobile-first, see performance), serve over HTTPS, and use clean lowercase hyphenated URLs that stay permanent.
**Never:** Bury text in images, or change URLs without a 301 redirect.
**Why:** Core Web Vitals and a responsive layout feed ranking directly; broken URLs leak the link equity you already earned.
