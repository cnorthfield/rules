## 13. Images & media

### Format & size
**Do:** Serve AVIF with a WebP fallback, sized to the dimensions the image actually renders at (with a 2x variant for high-DPI). Ship `srcset` so each viewport gets the right file.
**Never:** Drop a multi-MB camera or designer original into an `<img>` and let the browser scale it down.
**Why:** A 4000px JPEG squeezed into a 400px slot wastes bandwidth and trashes your LCP (see performance). The pixels you don't show still cost the user.

### Layout stability
**Do:** Give every image an explicit `width` and `height` (or `aspect-ratio` in CSS) so the browser reserves the box before the bytes arrive.
**Never:** Leave images unsized and let content jump when they load.
**Why:** Unsized media is the classic cause of Cumulative Layout Shift. Keep CLS under 0.1.

### Loading
**Do:** Lazy-load offscreen images (`loading="lazy"`) and eager-load only the LCP image, with `fetchpriority="high"` and a preload so it lands first.
**Never:** Lazy-load the hero or above-the-fold image. That delays the very paint Core Web Vitals measures.
**Escape hatch:** For a carousel, eager-load the first slide and lazy-load the rest.

### Pipeline
**Do:** Put images through a CDN or optimizer (Cloudinary, imgix, or your framework's image component) that handles format negotiation, resizing and caching from the source asset.
**Never:** Hand-export a wall of fixed-size files in Photoshop and commit them. They go stale and never cover every device.
**Why:** On-the-fly transforms mean one source of truth and the right variant for every request.

### User uploads
**Do:** Store uploads in object storage (S3 or equivalent), let the client PUT directly via a short-lived signed URL, and run resizing, transcoding and virus scanning asynchronously off the request path. See common features and security.
**Never:** Stream uploads through your app server into a database or local disk, or trust the client-supplied filename, content type or dimensions.
**Why:** Big synchronous uploads tie up workers and a forged content type is a real attack vector. Validate server-side and serve user media from a separate origin so a malicious file can't run in your app's context.
