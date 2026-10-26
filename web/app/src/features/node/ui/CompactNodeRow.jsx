import { Show } from 'solid-js'

/**
 * Compact row for a node/document result or list entry.
 *
 * @param {Object} props
 * @param {import('solid-js').JSX.Element} props.icon
 * @param {import('solid-js').JSX.Element} props.title
 * @param {import('solid-js').JSX.Element} [props.subtitle]
 * @param {() => void} [props.onOpen]
 * @param {import('solid-js').JSX.Element} [props.actions]
 */
export function CompactNodeRow(props) {
    return (
        <div class="group flex items-center gap-3 border-b border-border-subtle px-3 py-2 last:border-b-0 hover:bg-bg-2">
            <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                aria-label={`Open ${props.title}`}
                onClick={() => props.onOpen?.()}
            >
                <span class="shrink-0 text-muted">{props.icon}</span>
                <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm text-ink-dark">
                        {props.title}
                    </span>
                    <Show when={props.subtitle}>
                        <span class="block truncate text-xs text-muted">
                            {props.subtitle}
                        </span>
                    </Show>
                </span>
            </button>
            <div class="flex shrink-0 items-center gap-1">{props.actions}</div>
        </div>
    )
}
