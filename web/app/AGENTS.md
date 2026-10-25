# Frontend (`web/app`)

## Architecture and ownership

- Follow the architecture in the repository-root `README.md`. Keep route composition in `src/pages`, feature UI/use cases in `src/features`, resource/API contracts in `src/entities`, and shared API/config/UI utilities in `src/shared`.
- Before changing a flow, compare it with `doc/frontend/contract-coverage.md`. The backend route source is `../../internal/adapter/inbound/httpapi/*_handler.go`; check request DTOs/use cases and `view.go` too. Distinguish a public contract from an implemented backend handler, and update the coverage document when behavior changes.
- Keep dependencies flowing inward: `pages` compose feature UI/use cases; feature use cases orchestrate state and call entity APIs; entities own DTO validation and endpoint adapters; `shared` owns reusable infrastructure. Do not put product-specific decisions in `shared` or HTTP details in page components.
- Keep reusable UI generic. A feature component may compose shared controls, but shared UI must not import a page, feature, or entity. Keep route navigation in pages or pass callbacks into feature components.
- Use one source of truth for each view's filtered/sorted/paginated data; grid and list renderers should consume the same derived collection rather than reimplementing ordering or authorization.

## API contracts and state

- Send requests through `src/shared/api/client.js` (`reqJSON`, `reqForm`, `reqBlob`, or `reqNoContent`). Do not add direct `fetch` calls in pages, features, or entities.
- Keep endpoint paths, methods, query/body fields, pagination metadata, and response fallbacks aligned with the executable backend contract. Do not infer missing fields or permissions from a parent object.
- Every async user flow must represent loading, empty/success, and failure states. Preserve editable input on failure; use `ErrView` for page-level load failures and `toast` for action results. Convert errors with `getErrorMessage` or preserve the typed `ApiError`; never turn a failed request into an indistinguishable empty success.
- Disable duplicate submissions while a mutation is running, and refresh the affected resource after a successful mutation. Treat backend `403` as an expected authorization result with actionable wording, not as success or a generic exception.

## SolidJS conventions

- The app is SolidJS, not React: components execute once and Solid updates tracked expressions. Read signals with their accessor (`value()`) in JSX; derive values with accessors or `createMemo`, and reserve `createEffect` for side effects.
- Never destructure component props in the function parameters or eagerly copy reactive props into locals. Read `props.value`; pass changing values to hooks as accessors (for example, `() => props.id`). Use `splitProps` to partition/forward props and `mergeProps` for reactive defaults. See [Solid props](https://docs.solidjs.com/concepts/components/props).
- `createEffect` callbacks must be synchronous. Start async work from an event handler or call an async helper without returning its promise from the effect; invalidate stale requests or clean them up when dependencies change.
- Use Solid control-flow components (`<Show>`, `<Switch>/<Match>`) for reactive branches. For changing collections, use `<For>` when items are tracked by identity or `<Index>` when positions are stable; ordinary `map` is fine for static lists.

## UI, accessibility, and styles

- Prefer native interactive elements (`button`, `a`, `input`, `select`) over clickable `div`s. Do not nest interactive controls. Give icon-only controls accessible names; associate labels with form controls; ensure primary actions work by keyboard and retain a visible focus indicator.
- Use shared `Modal` and `ConfirmDialog` for dialogs. Modals must support initial/restored focus, Tab/Shift+Tab containment, Escape, and appropriate loading behavior. Keep drawer/navigation semantics distinct from dialogs.
- Announce loading/error/empty changes with shared patterns (`Spinner`, `EmptyState`, `ErrView`, `toast`) and avoid showing raw UUIDs as user-facing names when a path/name is available.
- Tailwind CSS 4 is configured through Vite and `@import 'tailwindcss'`. Keep semantic design tokens in `src/index.css`'s `@theme`; use generated utilities such as `text-ink-dark`, `text-bg`, `bg-bg`, and `border-border` instead of arbitrary CSS-variable classes such as `text-[--color-bg]` when a token exists. Prefer these tokens so the `[data-theme='dark']` palette continues to work. See [Tailwind theme variables](https://tailwindcss.com/docs/theme).
- Keep colors and states semantic (foreground/background, hover, focus, disabled, success, warning, danger). Verify WCAG AA contrast for text/status pairs in both themes; do not introduce hard-coded palette classes when a semantic token exists.
- Match surrounding style: four-space indentation, single quotes in JS, no semicolons, concise comments only for non-obvious constraints (`// NOTE:`) or pending work (`// TODO:`).
- Use `PascalCase.jsx` for UI components, `usePascalCase.js` for hooks, and `camelCase.js` for helpers/adapters; keep tests adjacent as `*.test.js`. Document exported contracts and non-obvious props with JSDoc, and prefer named exports consistent with the containing module.

## Verification

- Add Vitest coverage for pure decision logic, DTO validation, pagination, error mapping, and theme contrast when changing those areas. Keep tests next to the feature/helper they protect.
- Before closing an issue, run `pnpm exec vitest run`, `pnpm run build`, and `pnpm exec eslint` on affected source files; use `pnpm exec eslint src` when the issue requires repository-wide lint.
- Record manual checks and intentionally incomplete backend-dependent behavior in the issue history. Do not claim an E2E/browser check that was not actually run.

## Tooling

- Vite aliases are `@` → `src`, plus `@entities`, `@features`, `@pages`, and `@shared`; follow `vite.config.js` when adding imports.

## Commands

Run from `web/app/`:

```bash
pnpm install
pnpm dev
pnpm build
pnpm exec eslint src
```

`package.json` currently has no test, lint, or typecheck scripts; ESLint is configured in `eslint.config.mjs`. The dev client targets the API at `http://localhost:3000`. Product/UX decisions and progress are tracked in `doc/frontend/product-plan.md`. `make build-web` (from the repository root) builds this app and copies `dist/` to `web/dist/`; treat that output as generated, not source.
