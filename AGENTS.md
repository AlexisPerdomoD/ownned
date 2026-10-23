# Repository guidance

- The Go module is `ownned` (Go 1.27). The server wiring is in `cmd/server`; backend responsibilities are split across `internal/app`, `internal/domain`, and `internal/adapter`. PostgreSQL migrations run at server startup.
- Treat HTTP handlers, request/use-case validation, and response views as the API source of truth. A registered route may be a stub or not integrated in the web client; check `doc/frontend/contract-coverage.md` before changing API/client flows.
- Run backend tests with `go test ./...`. For database-backed local validation, `make test-local` starts PostgreSQL on port 5502, applies test migrations, runs tests, and stops the container; Docker Compose and the `migrate` CLI are required.
- Local PostgreSQL is started with `make db-local-up` (port 5501). For local HTTP/Vite development set `MODE=local` in `.env`; the bundled `.env.example` is preconfigured with `MODE=local` for that flow (`MODE=dev` is for a built client behind the server). Make targets include and export `.env`.
- `make build-web` builds `web/app` and copies its output to generated `web/dist`; do not edit `web/dist` as source. Frontend architecture and SolidJS-specific rules are in `web/app/AGENTS.md`.
- See `README.md` for setup and command details. Keep its API summary subordinate to the executable backend contracts.

## Multi-agent scope discipline

- The user normally works on several things at the same time with different agents running in parallel. Working-tree changes not belonging to one agent's assignment are expected and are that other agent's/div's responsibility; do not touch them.
- Each agent must stay focused on the scope explicitly defined by the dev for its assignment. If the scope is unclear, or an action appears to fall outside it, ask for clarification before doing anything.
- Do not include unrelated in-progress changes in an agent's work, commits, or reports unless they have impact on its assigned scope; keep reports focused to avoid noise.
- The web client closure agent's primary working directory is `doc/frontend/issues/`: issues and their implementation plans live there as repository files, orchestrated locally. They do not live in GitHub.
- Scope is always what the dev explicitly asks for in the current conversation, engagement by engagement — there is no standing, silent scope carried across sessions. Where the dev does not state a boundary, inspect first and ask before touching anything questionable. (For reference: in the Fase-1 session, `internal/` was declared read-only for this agent; whether backend work is allowed in a later engagement depends solely on that engagement's explicit request.)

## Out-of-scope findings

- On finding a bug, layering violation, contract mismatch, or debt outside the assigned scope: report it (file:line, why it is a problem), then stop and wait. Never fix it "while at it", not even when the fix looks trivial.
- If a precise solution is already at hand, attach it to the report: exact file/symbol, the minimal change sketch (or diff), and any verification the dev should run. A suggestion is information for the dev to approve and apply, not a license to edit.

## Code and comments

- Generated code must respect layer boundaries: the `internal/app` layer knows nothing about transport (`internal/adapter/inbound/httpapi`, HTTP, routes, methods, status codes, headers, handlers). Usecases, ports, and their comments must read as if the transport layer did not exist; transport-specific mapping happens only in the adapter.
- Prefer self-explanatory code. Write comments only where there is genuine obscurity: a non-obvious invariant, constraint, or decision that future code would otherwise break (for example, which key a storage object lives under).
- Comment form: `// NOTE:` for non-obvious context/constraints and `// TODO:` for pending work — exactly those uppercase forms with a space after `//`, never `//Note:` or other case/spelling variants. No prose paragraphs that restate what the code already says.
- Never reference files, symbols, or endpoints in a comment without checking they exist and are current; stale references are worse than no comment.

## Commits and scope

- When the user explicitly lists the files (or directories) to include in a task, limit all edits, commits, and verification to exactly those files. Anything else observed in the working tree is an out-of-scope finding to report and stop on; never fold it into the plan, the commit, or the verification unless the user asks for it.

- Use `type(scope): description` when it adds value: `feat` for capabilities, `fix` for bug fixes, `refactor` for behavior-preserving restructuring, `doc` for documentation, `test` for tests, and `chore` for maintenance. Choose the type that best describes the main change; do not over-engineer the scope.
- Prefer atomic, independently verifiable commits when practical. Avoid elaborate commit plans that depend on staging individual hunks (such as `git add -p`); favor practical file-level grouping over forced commit boundaries.
- During implementation or plan execution, if you find an unexpected issue outside the agreed scope, report its location and impact, then stop and wait for instructions. Do not decide to fix it automatically—for example, when adding a test, report and pause if you discover a bug in the existing implementation.

## Communication

- When presenting lists of findings, recommendations, or action items, number each item so the user can refer to it by number.
