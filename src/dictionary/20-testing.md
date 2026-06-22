## 20. Testing

### What to test

**Do:** Test the risky and the core: money paths, auth and permissions, data integrity, and anything with real branching logic. Cover the unhappy paths (invalid input, expired tokens, concurrent writes, partial failures), because those are what break in production. Assert on observable behaviour (outputs and side effects), not private internals.
**Never:** Chase 100% coverage, or write a test that can never fail. A test that asserts something always true (or just restates the implementation) tests nothing and rots into noise. Don't write tests for throwaway spikes or trivial glue.
**Why:** Coverage tells you what's untested, it isn't a target; a green bar over the wrong assertions is worse than an honest gap, because it buys false confidence on exactly the code (see security, auth, data) that hurts most when it's wrong.
**Escape hatch:** Prototype you'll delete next week? Skip the tests. The moment it's load-bearing, it earns them.

### Levels

**Do:** Unit-test pure logic (calculations, validation, state machines, parsers) in isolation and lean on these for the bulk of your suite. Run data-layer and query logic as integration tests against a real Postgres (Testcontainers or a disposable instance, not SQLite standing in). Keep a handful of end-to-end tests for flows that must never break (signup, login, checkout) and stop there.
**Never:** Mock away the database in tests that exist to verify data logic. A mocked query layer asserts that your mocks behave like your mocks; it never catches a wrong join, a missing constraint, a cascade, or SQL the real planner rejects.
**Why:** The bugs that reach production live in the seams (your SQL against real constraints, your code against the real schema), and an in-memory substitute lies about all of it. Push detail down to fast unit tests, keep the slow broad tests thin; invert that ratio and the suite gets slow and flaky and people stop trusting it.
**Escape hatch:** Mock at the true edges only (third-party HTTP, payment providers, the clock), never your own core logic.

### Cross-tenant isolation tests

**Do:** For every tenant-owned resource, write at least one test proving tenant A cannot read, update, delete, export, or even infer the existence of tenant B's data. Run it in CI like any other test.
**Never:** Add the `tenant_id` column and RLS and assume isolation holds without a test that tries to cross the boundary.
**Why:** Multi-tenant isolation is the assumption your whole SaaS rests on, and it's exactly the thing that silently breaks (a missing `WHERE tenant_id`, an RLS gap). For any multi-tenant app these are among the highest-value tests you can have (see Multi-tenancy and Object-level authorization in Auth).

### Permission-matrix tests

**Do:** For every role and permission, write tests that prove both what it can do and what it cannot. Test the denied actions as deliberately as the allowed ones.
**Never:** Ship a permission system with only happy-path tests. A permission system without deny-case tests is wishful thinking.
**Why:** Agents test that the manager can do manager things; they don't test that the manager can't touch owner-only billing. The deny cases are where the real bugs hide (see Authorization / RBAC and Object-level authorization in Auth, and Cross-tenant isolation tests above).

### Discipline

**Do:** Run the full suite in CI on every PR, with a red suite blocking merge so nothing reaches the main branch unproven (see CI/CD, observability). Keep feedback to minutes: parallelise, and split a slow heavy tier from the fast tier when the wait starts to hurt. For every bug, write a failing test that reproduces it first, watch it fail, then fix it.
**Never:** Fix a bug without a test that would have caught it, and never let the suite drift slow enough that people start skipping or disabling it. A muted test is a deleted test that still burns CI time.
**Why:** The failing-test-first rule proves the bug is real, proves the fix actually fixes it, and guards against the same regression forever; fixing blind proves none of those.

### Determinism

**Do:** Make every test deterministic and self-contained. Inject the clock and seed any randomness so two runs are identical. Set up and tear down each test's own data, ideally in a transaction that rolls back. Tests must pass in any order and in parallel.
**Never:** Rely on test execution order, share mutable state through globals or module-level singletons, or hit the real network in a unit test. Don't reuse another test's leftover rows.
**Why:** Order-dependence and shared state produce the worst kind of failure: the flaky one that passes locally, fails in CI, and trains the team to hit retry until it goes green, at which point the suite stops meaning anything.
**Escape hatch:** A genuinely unavoidable external call (a contract test against a sandbox) belongs in a separate, clearly labelled integration tier, never mixed into the fast unit run.
