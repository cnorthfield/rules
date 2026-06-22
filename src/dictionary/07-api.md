## 7. APIs

### REST defaults

**Do:** Use plural resource-noun URLs (`/v1/orders`, `/v1/orders/{id}`), HTTP verbs for action (GET read, POST create, PUT/PATCH update, DELETE remove), and JSON request/response bodies. Return the right status: 200 OK (read/update), 201 Created (with `Location` header pointing to the new resource), 204 No Content (delete or genuinely empty body); 400 malformed (unparseable JSON, bad Content-Type, broken HTTP), 401 unauthenticated, 403 authenticated-but-forbidden, 404 not found, 409 conflict (duplicate, version/optimistic-lock clash), 422 syntactically valid but semantically rejected (field-level validation failure); 500 server fault. Version from the very first endpoint with a `/v1` URL prefix. Paginate every list endpoint (see Pagination).
**Never:** Verbs in URLs (`/getOrders`, `/createOrder`), 200-with-`{ "error": ... }`, or shipping unversioned so the first breaking change forces a scramble. Don't blur 400 and 422, 400 is "I couldn't parse this", 422 is "I parsed it and it's wrong".
**Why:** Verbs and status codes are the contract; clients, proxies, and caches act on them without reading your prose. A `/v1` you never break is free; retrofitting versioning onto a live unversioned API is not.
**Escape hatch:** A genuinely non-CRUD action (`POST /v1/orders/{id}/refund`) may be a POST to a sub-resource verb, that is the documented exception, not licence to verb everything.

### API inventory and deprecation

**Do:** Keep an inventory of your public endpoints, webhooks, admin routes, cron endpoints, and any debug or test endpoints. Every deprecated endpoint needs an owner, a removal date, monitoring, and the same auth as the live ones until it's gone.
**Never:** Leave debug, test, or staging endpoints exposed or unauthenticated, or let old API versions linger unowned and unmonitored.
**Why:** Shadow and forgotten endpoints are a leading breach surface (OWASP API9, Improper Inventory Management): the route nobody remembers is the one nobody secured.

### Error handling

**Do:** Return one consistent error envelope on every failure path, `{ "error": { "code": "string_slug", "message": "human readable", "request_id": "..." } }`, with the matching HTTP status (see REST defaults). Log full detail (stack, SQL, params) server-side keyed to the same correlation/request id, and return that id to the client.
**Never:** Leak stack traces, SQL, exception class names, file paths, or raw ORM errors to clients. Never return a bare string or a different shape per endpoint.
**Why:** A stable, machine-readable `code` lets clients branch without parsing prose; the request id turns "it broke" into a one-line log lookup. Leaked internals are both a support nightmare and an attacker's map.
**Escape hatch:** If you want a ratified standard instead of a house envelope, use RFC 9457 Problem Details (`application/problem+json`, with `type`/`title`/`status`/`detail`/`instance`), it obsoletes RFC 7807. Pick one shape and use it everywhere; do not mix.

### Idempotency

**Do:** For unsafe, retryable operations (POST that charges, signs up, or creates), require a client-supplied `Idempotency-Key` header (a client-generated UUID). On first request, persist `key -> (status, response body)` in Postgres inside the same transaction as the side effect, with a `UNIQUE` constraint on the key; on any replay of the same key, return the stored result instead of re-executing. Scope keys per endpoint and per authenticated user, and expire them (24h is typical). Handle the concurrent-replay race: a second in-flight request with the same key must block or return 409, not run in parallel.
**Never:** Assume the network won't double-deliver. A client that times out WILL retry, and a non-idempotent charge endpoint double-charges. Never store the key only after the side effect succeeds, a crash in between leaves it replayable.
**Why:** Timeouts and retries are normal, not edge cases; the key is the only thing that makes "did my POST land?" answerable safely.
**Escape hatch:** Naturally idempotent verbs (GET, PUT to a known id, DELETE) need no key.

### Request validation

**Do:** Validate the full request, body, path params, and query string, against a schema at the boundary, before any business logic or DB call runs (see Input validation). Reject unknown/extra fields. On failure return 422 with field-level errors: `{ "error": { "code": "validation_failed", "fields": { "email": "must be a valid email" } } }`.
**Never:** Trust the client, reach into `req.body.whatever` ad hoc deep in a handler, or silently ignore unexpected fields (mass-assignment risk).
**Why:** One boundary check means business logic only ever sees well-formed input; rejecting unknown fields stops clients from quietly setting columns you never exposed.
**Framework note:** the schema library is stack-specific, zod (Express / Hono / Fastify / Next.js), class-validator DTOs + `ValidationPipe({ whitelist: true })` (NestJS), Pydantic models (FastAPI). See the framework page for the exact wiring.

### Minimal response fields

**Do:** Return only the fields the client needs. Define an explicit output shape per endpoint (a serializer / DTO / response schema / column `select`) and map to it; default to excluding everything until you deliberately add it.
**Never:** Serialize a raw ORM entity or `SELECT *` straight to JSON. That leaks internal columns (password hashes, internal flags, soft-delete timestamps, other rows' foreign keys) the instant someone adds a column, and bloats payloads.
**Why:** An allowlisted output shape *cannot* accidentally leak a newly-added sensitive column; a "return the row" handler leaks it the day the column lands.
**Framework note:** Node/Next.js, map to a plain object or a zod `.pick()` output schema; NestJS, a response DTO + `ClassSerializerInterceptor` with `@Expose`/`@Exclude`; FastAPI, a Pydantic `response_model`. See the framework page.

### Shared types between frontend and API

**Do:** Make the API the single source of truth for its types and derive the client's types from it; derive request/response types from the same schema that validates them.
**Never:** Hand-maintain a second copy of the response shape in the frontend, it silently drifts from the server the first time a field changes.
**Why:** One definition turns a breaking API change into a compile error in the frontend, not a runtime surprise in production.
**Framework note:** Strongest in Node/TypeScript, weaker elsewhere. TS monorepo, share a types package, or use tRPC (end-to-end inference, no codegen) when one team owns both ends. Cross-language or public APIs, generate clients from an OpenAPI spec the server emits (FastAPI emits OpenAPI automatically; add a generator for Node). See the framework page.
