## 11. Performance & Core Web Vitals

Three metrics, all judged at the 75th percentile of real users: LCP (Largest Contentful Paint) good under 2.5s, INP (Interaction to Next Paint) good under 200ms, CLS (Cumulative Layout Shift) good under 0.1. A page passes only when all three are good at p75. FID is gone, replaced by INP, and INP is the one most sites still fail, so spend your effort there.

### Measure
**Do:** Treat field data (real users, via the Chrome UX Report or a RUM tool) as the source of truth, and use lab tools like Lighthouse only to debug and reproduce. Set a performance budget and fail CI when a build regresses it.
**Never:** Ship a green Lighthouse score and call it done, or report a "fast" average.
**Why:** Lab runs use one device on one network and miss the slow phones and flaky connections that drag your p75 down. Averages hide the tail: a 200ms mean INP can still mean a quarter of your users are over 500ms.
**Escape hatch:** Pre-launch with no traffic you have no field data, so lab numbers plus a synthetic throttled run are all you have. Switch to field data the moment real users arrive.

### Watch the right number
**Do:** Track p75 as the pass/fail line and watch p95 to find who you're hurting. Segment by device and country, because mobile and slow networks are where you fail.
**Never:** Optimise the median and assume the rest follows.
**Why:** The slow tail is real users on real hardware, and Google grades you at p75 regardless of how good your median looks.

### JavaScript
**Do:** Ship less JavaScript. Code-split by route, defer or lazy-load anything not needed for the first interaction, and break up long tasks so the main thread can respond. INP is dominated by main-thread work, so cutting JS is the most direct fix.
**Never:** Hydrate static content, ship a full client-side framework for a brochure page, or pull a heavyweight date or utility library when a few lines do.
**Why:** Every kilobyte of JS is parsed, compiled and executed on the main thread, and hydrating markup the user can already see buys you nothing but blocked interactions and a worse INP.
**Escape hatch:** Genuinely interactive surfaces (editors, dashboards, maps) need their JS. Send it, but split it so the rest of the page doesn't wait, and keep the interactive island small.

### Images & media
**Do:** Serve right-sized images in a modern format (AVIF or WebP), set explicit width and height (or aspect-ratio) on every image and embed, lazy-load everything offscreen, and eager-load only the LCP image. See the images and media section for format and responsive-source detail.
**Never:** Lazy-load the LCP image, ship a 4000px hero to a phone, or omit dimensions.
**Why:** A missing dimension is the classic CLS bug: the box has no reserved space, so content jumps when the asset arrives. Lazy-loading the LCP image is the classic LCP bug: you've told the browser to defer the one thing it's being timed on.
**Escape hatch:** None for dimensions. For the LCP image, if it's a background or CSS image, preload it explicitly so the browser discovers it early.

### Loading
**Do:** Preload the few resources critical to the first paint (the LCP image, a key font), server-render or stream the above-the-fold content so users see it without waiting for JS, and serve static assets from a CDN with long cache lifetimes and content-hashed filenames. Cross-reference api for payload shape and observability for tracing slow responses.
**Never:** Preload everything (it just creates contention and delays the thing that matters), or block first paint on a client-side data fetch that could have rendered on the server.
**Why:** Preload is a priority signal, not a "load faster" button. Preload more than a handful of resources and you've told the browser nothing is important. Content-hashed filenames let you cache static assets effectively forever and bust the cache by changing the name.

### Backend
**Do:** Make the server fast before you make it cached. Index the queries behind your slow endpoints and kill N+1 query patterns first. See data for indexing and query shape, scaling for when caching and read replicas actually earn their keep.
**Never:** Reach for Redis to paper over a query that's slow because it's missing an index or firing once per row.
**Why:** A cache in front of a broken query hides the problem until a cache miss, a stampede or a new code path exposes it, and now you're debugging two systems instead of fixing one query. TTFB feeds straight into LCP: a slow backend caps how fast your page can ever be.
**Escape hatch:** Expensive aggregations and genuinely hot read paths are worth caching once the underlying query is already correct and indexed.
