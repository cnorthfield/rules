## 3. Data & database

### IDs: UUID vs auto-increment

**Do:** Make every externally-visible identifier (URLs, API payloads) non-sequential. Use a **UUIDv7** (time-ordered) value: either as the primary key directly, or keep an internal `bigint` identity key for joins plus a separate `uuid` external id.
**Never:** Expose raw auto-increment integer PKs in URLs or APIs (`/users/123`). Don't reach for random **UUIDv4** as a PK either, its randomness destroys B-tree index locality, bloating writes and index size.
**Why:** Sequential ids leak row counts and let anyone enumerate your data; UUIDv7 keeps ids opaque while staying index-friendly because the leading bits are time-ordered.
**Escape hatch:** Internal-only tables that are never addressed by an outside caller can stay on plain `bigint identity`, the rule is about what crosses the trust boundary.

**Before (agent cold):**
```sql
CREATE TABLE users (
  id  serial PRIMARY KEY,
  ...
);
-- route: GET /users/123   ← enumerable, leaks "we have ~123 users"
```

**After (this dictionary):**
```sql
-- PG 18+: native uuidv7(); PG 17 or older: pg_uuidv7 extension or app-side gen
CREATE TABLE users (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- internal joins
  external_id  uuid NOT NULL DEFAULT uuidv7() UNIQUE            -- the public id
);
-- route: GET /users/018f3c9a-7e6b-7c41-9a2e-2f1b6d4c8a55  ← opaque, non-sequential
```

### Schema design defaults

**Do:** Normalise first, aim for 3NF. Default columns to `NOT NULL`; allow `NULL` only when "unknown/absent" is a real, meaningful state. Index every foreign key (see Indexing).
**Never:** Reach for JSONB to dodge modelling. Use JSONB only for genuinely schemaless or highly variable data, not as a junk drawer for fields you were too lazy to define.
**Why:** A real schema gives you constraints, types, and query planning; a JSONB blob gives you none of that and silently rots.

### Migrations

**Do:** Treat every schema change as something that must run safely against a live production table with traffic on it. Assume the table is large and in use.
- Adding a column WITH a default is safe on Postgres 11+ (the default is stored in the catalog, applied on read, no table rewrite). Don't avoid defaults out of habit; the old "never add a column with a default" rule is obsolete.
- Make changes additive first. Add new things; never rename or drop in the same step.
- For any rename or type change, use expand-contract across separate deploys: (1) add the new column, (2) backfill in batches, (3) switch the app to read/write the new column, (4) drop the old column in a later deploy once nothing references it.
- Create indexes with CREATE INDEX CONCURRENTLY. If it fails it leaves an INVALID index, drop it and retry.
- Set a short lock_timeout (e.g. 5s) before DDL so a migration fails fast instead of queuing behind a lock and freezing the table.

**Never:**
- ALTER COLUMN ... SET NOT NULL directly on a populated table, it scans the whole table under an ACCESS EXCLUSIVE lock. Instead: ADD CONSTRAINT ... CHECK (col IS NOT NULL) NOT VALID (instant), then VALIDATE CONSTRAINT (doesn't block reads/writes), then SET NOT NULL (no scan on PG12+).
- Rename a column in one step, it breaks every query using the old name. Use expand-contract.
- Drop a column the current app version still reads. Deploy the code that stops using it first.
- A single UPDATE backfilling millions of rows. Batch it.
- Add an index without CONCURRENTLY in production.

**Why:** A migration that locks a busy table is an outage.
**Escape hatch:** At 0 users / empty tables, do the simple thing. The moment real data is in the table, these rules apply.

**Before (agent cold):** `ALTER TABLE users ALTER COLUMN email SET NOT NULL;`, scans the whole table under an exclusive lock, blocks all reads and writes, downtime on a large table.
**After (this dictionary):** `ALTER TABLE users ADD CONSTRAINT users_email_nn CHECK (email IS NOT NULL) NOT VALID;` then `ALTER TABLE users VALIDATE CONSTRAINT users_email_nn;` then `ALTER TABLE users ALTER COLUMN email SET NOT NULL;`, no blocking lock, no downtime.

### Money / decimals

**Do:** Store money as integer minor units (pence/cents) or as exact `NUMERIC`/`DECIMAL`. Store the currency code (ISO 4217) alongside every amount.
**Never:** `float` or `double` for money, binary floating point cannot represent `0.10` exactly and rounding errors compound.

### Timestamps & timezones

**Do:** Store every timestamp as `timestamptz`. Store and compute in UTC; convert to a local timezone only at the display/reporting edge. When a query means "today" or "this month" in a user's local zone, truncate in that zone with the 3-arg `date_trunc(field, ts, zone)` (PG 16+), which returns a `timestamptz` you can compare directly.
**Never:** Store naive (`timestamp` without tz) values, and never filter date ranges with `created_at::date = current_date`, that casts to the server's local day and is off by a day whenever the server zone differs from the user's.
**Why:** UTC storage with edge conversion is the only model that survives DST shifts, multi-region servers, and users in different zones.

**Before (agent cold):**
```sql
created_at  timestamp,                -- naive, ambiguous zone
-- "orders today" using server-local time:
SELECT * FROM orders
WHERE created_at::date = current_date; -- wrong unless server tz == user tz
```

**After (this dictionary):**
```sql
created_at  timestamptz NOT NULL DEFAULT now(),
-- "orders today" for a user in America/New_York (PG 16+ 3-arg date_trunc):
SELECT * FROM orders
WHERE created_at >= date_trunc('day', now(), 'America/New_York')
  AND created_at <  date_trunc('day', now(), 'America/New_York') + interval '1 day';
```

### Soft delete vs hard delete

**Do:** Default to hard delete, backed by foreign-key integrity (see Foreign keys & cascades) and reliable backups.
**Never:** Add a `deleted_at` column reflexively. Use soft delete only when you genuinely need recovery, audit, or legal retention, and when you do, enforce "exclude deleted" globally via a view or default scope, never per-query.
**Why:** The first place someone forgets the `WHERE deleted_at IS NULL` filter is a data leak that ships deleted rows to a user.

### Enums

**Do:** Use a lookup table (foreign key) for value sets that may change or carry metadata. Use a `CHECK` constraint for tiny, fixed sets (e.g. `status IN ('active','inactive')`).
**Never:** Use native Postgres `ENUM` types. Adding a value means `ALTER TYPE ... ADD VALUE` (which can't be used in the same transaction it's added in), reordering is impossible, and a value can never be removed.

### Foreign keys & cascades

**Do:** Always declare foreign keys and let the database enforce integrity. Choose `ON DELETE` deliberately: `CASCADE` only where the child truly cannot exist without the parent; otherwise `RESTRICT`/`NO ACTION` (the default) or `SET NULL`.
**Never:** Sprinkle `ON DELETE CASCADE` for convenience, one deleted parent row can silently wipe out half the database.
**Why:** Cascade is irreversible and invisible until it fires; `RESTRICT` fails loudly and safely instead.

### Indexing

**Do:** Index the columns you filter, join, and sort on, and every foreign key. For multi-column filters use a composite index, and remember column order matters (leftmost-prefix wins). Confirm with `EXPLAIN (ANALYZE)` that the planner actually uses it.
**Never:** Index every column. Each index taxes every write and consumes storage; unused indexes are pure overhead.

### N+1 queries

**Do:** Load related data in one query, a join, an eager load, or a batched `WHERE id IN (...)`.
**Never:** Issue one query per row inside a loop. The classic trap is an ORM lazily loading a relation inside a `.map`/`forEach`.
**Why:** Query count that scales with row count turns a 1-query page into a 1000-query page under real data.
**Escape hatch:** Detect it by logging query count per request and alerting when the count grows with the result set.

### Pagination

**Do:** Use keyset (cursor) pagination for large or unbounded lists, page on an indexed `WHERE (created_at, id) < (:last_ts, :last_id) ORDER BY created_at DESC, id DESC LIMIT n`.
**Never:** Use `OFFSET` for deep or unbounded paging, it scans and discards every skipped row and drifts (skips/repeats rows) under concurrent writes.
**Escape hatch:** `OFFSET`/`LIMIT` is fine for small, bounded admin lists where deep pages never happen.

### Connection pooling

**Global (every pathway):**

**Do:** Put a connection pooler in front of Postgres (PgBouncer, RDS Proxy, or your framework's built-in pool). Default to **transaction-pooling mode**, it gives the best connection reuse. Serverless/Lambda multiplies raw connections, so pool externally there.
**Never:** Assume transaction mode is "fire and forget." It still doesn't carry true session state across statements: `LISTEN`/`NOTIFY`, session-level advisory locks (`pg_advisory_lock`), and a `SET` meant to persist across a request all break or silently pin. Switch to **session mode** only for the connections that genuinely need those.
**Why:** Postgres connections are heavyweight; without pooling a burst of clients exhausts `max_connections` and the database stops accepting work.
**Escape hatch:** Prepared statements work in transaction mode on PgBouncer 1.21+ (named prepared statements landed there; set `max_prepared_statements > 0`), which is also when you can drop Prisma's legacy `?pgbouncer=true` flag. With PgBouncer 1.22.0+ and Prisma Client 5.10+ you additionally no longer need a separate direct connection URL for `prisma migrate`; on older versions you keep the flag. RDS Proxy multiplexes the extended-query protocol but pins on `SET` and session-level prepared statements.

**Pathway: AWS**

**Do:** Use RDS Proxy as the managed pooler in front of RDS/Aurora, it multiplexes connections and rides out failovers. Reach for your own PgBouncer only if you need transaction-pooling behaviour RDS Proxy doesn't provide.
**Never:** Open a fresh connection per Lambda invocation straight to Postgres, that exhausts `max_connections`; put RDS Proxy in between.
**Why:** RDS Proxy is the AWS-native answer to serverless connection storms (it pins on `SET` and session-level prepared statements, so keep those off the hot path).

**Pathway: Managed (Railway / Render / Fly)**

**Do:** Use the platform's pooled connection string (e.g. Supabase's transaction-mode port, or the platform's pooled URL); default to transaction mode.
**Never:** Run your own PgBouncer next to a platform that already pools for you.
**Why:** The pooled URL is the supported path; transaction mode carries the same session-state caveats as the Global block.

**Pathway: Non-dev (just get it live)**

**Agent:** Use the platform's provided (pooled) `DATABASE_URL`; do not deploy a separate pooler.
**Tell the user:** "Your platform handles database connections for you, nothing to set up here."

<!-- REVIEW: Connection-pooling pathways name RDS Proxy behaviour + Supabase transaction port, verify against current provider docs before publish -->

### Choosing and configuring your data layer

The data rules below are non-negotiable whatever tool you pick. The tool is a choice; these are not:
- Native `timestamptz`, never a naive timestamp (see Timestamps & timezones).
- Index every foreign key; most tools don't do this for you (see Indexing).
- A native database id type (prefer UUIDv7 on Postgres 18+, or `gen_random_uuid()` below that), not a string-id default (see IDs).
- Avoid native database enums; use a checked text column or a lookup table (see Enums).

Whatever you choose, its defaults will not follow these. Override them, and pin the overrides in your schema and migrations so they're explicit and survive regeneration.

**Do:** Pick along a spectrum, with a default. If you (or the person you're building for) are comfortable in SQL and want minimal abstraction, default to a typed query builder (e.g. Kysely or Drizzle): full type safety from your schema, the SQL stays legible, and there's no hidden lazy-loading or N+1 surprises sitting between you and the database. Reach for a full ORM (e.g. Prisma, TypeORM) when you specifically want relations, migrations, and schema generation handled for you, or when you're building for a non-technical user who can't write SQL. The convenience is real; you're just taking on the weight and the defaults that fight the rules above.
**Never:** Reach for a heavy ORM by reflex on a simple, SQL-shaped app; that's abstraction you'll pay for in hidden queries and fought-against defaults. And never assume any tool's generated schema follows good Postgres practice; it optimises for portability and onboarding, not for the rules here.
**Why:** A query builder and an ORM solve different amounts of problem. Most apps that are basically typed SQL with good migrations don't need an ORM's relation-mapping and lazy-loading, and a typed query builder gives the type safety without the abstraction, which is why it's the better default when you know SQL. An ORM earns its weight when relations and schema-driven migrations save more than the abstraction costs, or when the builder isn't an option because no one on the project writes SQL.
**Escape hatch:** Raw SQL with a thin driver is fine for small or performance-critical paths; you still own the data rules and you give up compile-time safety, so reserve it for where that trade is worth it.
<!-- REVIEW: tool names (Kysely, Drizzle, Prisma, TypeORM) and the UUIDv7/PG18 + gen_random_uuid specifics verified June 2026; re-verify before publish, and keep the category language ("typed query builder", "ORM") primary with tools as examples -->

### Designing derived and recomputed state

**Do:** Derive computed state (counters, aggregates, projections, status rollups, anything denormalised) from an ordered, authoritative source: the base tables or an append-only log. Make the recompute deterministic and idempotent, so running it twice gives the same result, and able to rebuild the derived value from scratch at any time (it's a cache, not a source of truth). Reconcile periodically: recompute from source, compare to the stored value, and alert on drift.
**Never:** Mutate a derived value in place as a side effect and treat it as authoritative. Never let derived state be the only record of something: if you can't rebuild it from the source, it isn't derived, it's unbacked.
**Why:** Derived values drift. A missed update, a race, or a partial failure, and the cached count or status no longer matches reality, with no way to tell which is right. Deterministic, rebuildable recompute makes drift detectable and fixable, because you can always recompute the truth.
**Escape hatch:** A trivial value you can compute on read doesn't need a pipeline. Compute it on read until that's too slow, then cache it with this pattern.

### State-transition integrity under concurrency

**Do:** Any state transition that can fire twice, or from two actors at once, needs a guard: a transaction, a uniqueness constraint, an optimistic lock (version column), an advisory lock, or `SELECT ... FOR UPDATE`. This covers accepting invites, claiming coupons, moving pipeline stages, seat and stock counts, creating subscriptions, spending credits, and send-once emails.
**Never:** Assume "read, check, then write" is safe because it works in the demo. Under real concurrency the check and the write race.
**Why:** This is the classic "works in the demo, breaks under load" bug: double-spends, double-bookings, duplicate records. The database constraint or lock makes it correct, not the app-level check (see Idempotency in APIs).
