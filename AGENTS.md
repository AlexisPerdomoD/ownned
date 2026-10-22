# Repository guidance

- The Go module is `ownned` (Go 1.27). The server wiring is in `cmd/server`; backend responsibilities are split across `internal/app`, `internal/domain`, and `internal/adapter`. PostgreSQL migrations run at server startup.
- Treat HTTP handlers, request/use-case validation, and response views as the API source of truth. A registered route may be a stub or not integrated in the web client; check `doc/frontend/contract-coverage.md` before changing API/client flows.
- Run backend tests with `go test ./...`. For database-backed local validation, `make test-local` starts PostgreSQL on port 5502, applies test migrations, runs tests, and stops the container; Docker Compose and the `migrate` CLI are required.
- Local PostgreSQL is started with `make db-local-up` (port 5501). For local HTTP/Vite development set `MODE=local` in `.env`; `.env.example` uses `MODE=dev`, which does not enable local CORS/cookie behavior. Make targets include and export `.env`.
- `make build-web` builds `web/app` and copies its output to generated `web/dist`; do not edit `web/dist` as source. Frontend architecture and SolidJS-specific rules are in `web/app/AGENTS.md`.
- See `README.md` for setup and command details. Keep its API summary subordinate to the executable backend contracts.

## Commits and scope

- Use `type(scope): description` when it adds value: `feat` for capabilities, `fix` for bug fixes, `refactor` for behavior-preserving restructuring, `doc` for documentation, `test` for tests, and `chore` for maintenance. Choose the type that best describes the main change; do not over-engineer the scope.
- Prefer atomic, independently verifiable commits when practical. Avoid elaborate commit plans that depend on staging individual hunks (such as `git add -p`); favor practical file-level grouping over forced commit boundaries.
- During implementation or plan execution, if you find an unexpected issue outside the agreed scope, report its location and impact, then stop and wait for instructions. Do not decide to fix it automatically—for example, when adding a test, report and pause if you discover a bug in the existing implementation.

## Communication

- When presenting lists of findings, recommendations, or action items, number each item so the user can refer to it by number.
