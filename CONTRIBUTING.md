# Contributing

## Repository layout

- `cmd/server` — HTTP server and dependency wiring.
- `cmd/cli` — operational CLI (`superusr`, `approot`, `migrate`, `seed`).
- `internal/app` — use cases, ports, and application errors.
- `internal/domain` — entities and domain rules.
- `internal/adapter/inbound/httpapi` — HTTP handlers, middleware, and views.
- `internal/adapter/outbound` — PostgreSQL, crypto, and filesystem storage adapters.
- `web/app` — SolidJS client.

## Source of truth

- HTTP handlers, request/use-case validation, and response views are the API source of truth. A registered route may be a stub or not integrated in the web client.
- The technical design is the canonical project reference: <https://github.com/AlexisPerdomoD/ownned/issues/5>. It holds the public contract, canonical flows, data model, integrations, roles, and decisions.
- `README.md` summarizes setup and capabilities; keep it subordinate to the executable contracts and the design.

## Development

```bash
cp .env.example .env
make db-local-up
make build-web
make start-http
```

- Local PostgreSQL runs on port 5501; the test database runs on 5502.
- `make test-local` starts the test database, applies migrations, runs `go test ./...`, and stops it.
- `make build-web` builds the client and copies it to `web/dist`; `web/web.go` embeds `web/app/dist`, so build the client before running `go test ./...` or the server on a clean checkout.
- Do not edit generated `web/dist` or `web/app/dist`.
- `.env` is local and must never be committed.

## Tests

- Backend: `go test ./...`; database-backed validation: `make test-local`.
- Database tests live in `internal/adapter/outbound/postgres`, one `*_test.go` per repository. Use `newTestDB(t)` and wrap every operation in `newTestTx(t, db)` so it rolls back on cleanup. Never persist test data. Prefer repository methods over direct SQL for fixtures.
- Frontend, from `web/app/`: `pnpm exec vitest run`, `pnpm run build`, and `pnpm exec eslint src` (or the affected files).
- Record manual checks and intentionally incomplete backend-dependent behavior. Do not claim an end-to-end check that was not run.

## Code and comments

- Respect layer boundaries: `internal/app` knows nothing about transport. Use cases, ports, and their comments must read as if the HTTP adapter did not exist; transport mapping belongs in the adapter.
- Prefer self-explanatory code. Comment only non-obvious invariants, constraints, or decisions.
- Use `// NOTE:` for non-obvious context and `// TODO:` for pending work, exactly in that form. No prose that restates the code.
- Never reference a file, symbol, or endpoint in a comment without verifying it exists and is current.

## Commits and pull requests

- Use Conventional Commits: `type(scope): description` (`feat`, `fix`, `refactor`, `doc`, `test`, `chore`).
- Prefer atomic, independently verifiable commits. Avoid elaborate staging plans.
- One pull request, one intent. Link the issue and state what is included, excluded, how it was verified, and which follow-ups remain.
- Never commit secrets, credentials, tokens, or customer data.
- Review is by someone other than the author for sensitive changes.

## Scope

- Stay inside the scope explicitly agreed for the task. Do not fold unrelated changes into the plan, the commit, or the verification.
- If you find an issue outside the agreed scope, report its location and impact and stop. Do not fix it “while at it”.

## Communication

- When presenting findings, recommendations, or action items, number each item so it can be referenced by number.

## Documentation

- `README.md` covers setup, capabilities, and the API summary.
- `CONTRIBUTING.md` covers development, tests, code, and contribution rules.
- `web/app/README.md` covers frontend architecture, SolidJS conventions, styling, and tests.
- Work is tracked in GitHub issues. There is no local issue tracker and no plan directory in the repository.
