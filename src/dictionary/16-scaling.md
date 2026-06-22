## 16. Scaling

### Caching

**Global (every pathway):**

**Do:** Ship with NO cache. When a specific, MEASURED query or endpoint is the bottleneck, fix it in this order: (1) optimise it, add the right index, rewrite the query; (2) add in-process memoisation or HTTP caching (`Cache-Control` / `ETag`); (3) reach for a shared cache (Redis/Memcached) only when the cached value must be shared across instances.
**Never:** Add Redis on day one for imagined load.
**Why:** A cache doubles your moving parts and hands you a cache-invalidation and consistency problem you did not have. Most "slow" endpoints are a missing index (see Read replicas, same discipline: index first).
**Escape hatch:** A genuinely shared, expensive-to-compute, read-heavy value across N instances (e.g. a rate limiter or session store) justifies Redis early, but name the value and the metric first.

**Before (agent cold):**
```ts
// docker-compose: app + postgres + redis, on day one
import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL);

async function getUser(id: string) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);
  const user = await db.user.findUnique({ where: { id } });
  await redis.set(`user:${id}`, JSON.stringify(user), "EX", 60);
  return user;
  // now: stale users after edits, an extra service to run,
  // and a cache-invalidation bug waiting on every write path
}
```

**After (this dictionary):**
```ts
// app + postgres. one query, correctly indexed.
async function getUser(id: string) {
  return db.user.findUnique({ where: { id } }); // PK lookup, already fast
}
// Add caching only when a metric (p95 latency, DB CPU) demands it,
// and only after the index/query is already optimal.
```

**Pathway: AWS**

**Do:** When a metric (not a guess) demands a shared cache, use ElastiCache (Redis/Valkey) or MemoryDB. Index and query-tune first.
**Never:** Provision ElastiCache pre-emptively "because AWS has it."

**Pathway: Managed (Railway / Render / Fly)**

**Do:** Add the platform's Redis add-on only when a measured shared-cache need appears; use its connection string.
**Never:** Enable the Redis add-on by default, it's another bill and another moving part.

**Pathway: Non-dev (just get it live)**

**Tell the user:** "You almost certainly don't need a cache (Redis) yet, skip it. If pages get slow later, the first fix is nearly always a database index, not a cache."

### Background jobs / async

**Do:** Run slow work (email, image/video processing, third-party API calls) inline in the request to start, but put it behind a single function/interface (e.g. `enqueueX()`) that runs inline now and can be swapped to a real queue later without touching call sites.
**Never:** Build a queue + worker before you need one, and never inline slow work as a raw call you will have to hunt down and rewrite later.
**Why:** The interface is the cheap insurance; the infrastructure is the expensive part you defer. Move to a queue + worker (see Queues) when requests get slow, the work needs retries, or you must absorb spikes.

### Queues

**Global (every pathway):**

**Do:** Start with a database-backed queue: a `jobs` table polled by a worker using `SELECT ... FOR UPDATE SKIP LOCKED`. Add a real queue only when you have a genuine async need, retries with backoff, decoupling producers from consumers, rate-smoothing, or scheduled fan-out.
**Never:** Add a queue before one of those needs is real and observed.
**Why:** A DB-backed queue is a perfectly good first queue, one less piece of infrastructure, and it shares your existing transaction and backup story. Graduate to SQS (managed, durable, built-in DLQ + retry) or a Redis-backed queue (e.g. BullMQ) only when throughput or fan-out outgrows the DB, or you already run that infrastructure.
**Escape hatch:** If you are already on AWS and want zero queue ops, SQS from the start is defensible, but it is still infrastructure, so name the async need first.

**Pathway: AWS**

**Do:** When the DB-backed queue is outgrown, use SQS (managed, at-least-once, built-in retries + dead-letter queue) with workers on Fargate; EventBridge Scheduler for scheduled fan-out.
**Never:** Build a bespoke broker on EC2.

**Pathway: Managed (Railway / Render / Fly)**

**Do:** Run a separate worker service (the platform supports a worker process) backed by the DB-as-queue, or its Redis add-on (e.g. BullMQ) when you need it.
**Never:** Run a long-lived worker inside the web process, give it its own service.

**Pathway: Non-dev (just get it live)**

**Agent:** Use the database-as-queue (a `jobs` table + `SKIP LOCKED` worker); don't add separate queue infrastructure.
**Tell the user:** "No separate 'queue' service needed yet, your app's database does this job."

<!-- REVIEW: Queues pathways name SQS/EventBridge Scheduler/Fargate and BullMQ, verify service names are current before publish -->

### Read replicas

**Do:** Add a read replica late, only when reads measurably saturate the primary AND you have already indexed the slow queries and added caching (see Caching).
**Never:** Add a replica as a default "for scale," or to mask a missing index.
**Why:** Most apps never need one. Vertical scaling plus good indexes goes a very long way.
**Escape hatch:** Replicas are also legitimate for isolating heavy analytics/reporting from OLTP, but mind replication lag: route reads that must reflect a just-completed write (read-your-own-writes) back to the primary.

### Sharding

**Do:** Don't. Scale vertically, add good indexes, and at most add one read replica, that covers all but the very largest systems.
**Never:** Shard a 12-month-old app, or design for sharding "in case."
**Why:** Sharding forfeits cross-shard joins, transactions, and uniqueness, and is a permanent tax on every query.
**Escape hatch:** If you genuinely think you need it, gather more evidence first, exhaust the biggest instance, partition tables within one Postgres, and only then revisit.

### Statelessness

**Do:** Keep the app process stateless so you can run N copies behind a load balancer. Push state to Postgres (sessions/data), object storage (uploads), or the auth provider (tokens). Coordinate via the database, not in-memory.
**Never:** Hold sessions, uploaded files, or locks in process memory tied to one instance, or rely on sticky sessions.
**Why:** In-memory state silently breaks the moment you add the second instance, and horizontal scaling is the whole point of staying stateless.
**Escape hatch:** Caches and ephemeral compute may live in memory (see Caching), provided losing an instance only costs a recompute, never correctness.
