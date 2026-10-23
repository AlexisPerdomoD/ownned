# Frontend (`web/app`)

- Follow the architecture in the repository-root `README.md`. Keep route composition in `src/pages`, feature UI/use cases in `src/features`, resource/API contracts in `src/entities`, and shared API/config/UI utilities in `src/shared`.
- Before changing a flow, compare it with `doc/frontend/contract-coverage.md`. The backend route source is `../../internal/adapter/inbound/httpapi/*_handler.go`; check request DTOs/use cases and `view.go` too. Distinguish a public contract from an implemented backend handler, and update the coverage document when behavior changes.
- The app is SolidJS, not React: components execute once and Solid updates tracked expressions. Read signals with their accessor (`value()`) in JSX; derive values with accessors or `createMemo`, and reserve `createEffect` for side effects.
- Never destructure component props in the function parameters or eagerly copy reactive props into locals. Read `props.value`; pass changing values to hooks as accessors (for example, `() => props.id`). Use `splitProps` to partition/forward props and `mergeProps` for reactive defaults. See [Solid props](https://docs.solidjs.com/concepts/components/props).
- Use Solid control-flow components (`<Show>`, `<Switch>/<Match>`) for reactive branches. For changing collections, use `<For>` when items are tracked by identity or `<Index>` when positions are stable; ordinary `map` is fine for static lists.
- Tailwind CSS 4 is configured through Vite and `@import 'tailwindcss'`. Keep semantic design tokens in `src/index.css`'s `@theme`; use generated utilities such as `text-ink-dark`, `text-bg`, `bg-bg`, and `border-border` instead of arbitrary CSS-variable classes such as `text-[--color-bg]` when a token exists. Prefer these tokens so the `[data-theme='dark']` palette continues to work. See [Tailwind theme variables](https://tailwindcss.com/docs/theme).
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
