import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
const lightBlock = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
const darkBlock =
    css.match(/\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''

function parseColors(block) {
    return Object.fromEntries(
        Array.from(
            block.matchAll(/--color-([\w-]+):\s*(#[\da-fA-F]{3,8})\s*;/g),
            ([, name, value]) => [name, value]
        )
    )
}

function luminance(hex) {
    const normalized = hex.slice(1)
    const channels = normalized.length === 3
        ? [...normalized].map(channel => `${channel}${channel}`)
        : [normalized.slice(0, 2), normalized.slice(2, 4), normalized.slice(4, 6)]
    const [red, green, blue] = channels.map(channel => {
        const value = parseInt(channel, 16) / 255
        return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(first, second) {
    const [lighter, darker] = [luminance(first), luminance(second)].sort(
        (a, b) => b - a
    )
    return (lighter + 0.05) / (darker + 0.05)
}

const themes = {
    light: parseColors(lightBlock),
    dark: { ...parseColors(lightBlock), ...parseColors(darkBlock) }
}

describe('semantic theme contrast', () => {
    for (const [themeName, colors] of Object.entries(themes)) {
        it(`${themeName} text colors meet WCAG AA against semantic surfaces`, () => {
            const surfaces = [
                colors.bg,
                colors['bg-2'],
                colors.surface,
                colors['accent-pale']
            ]
            const textColors = [
                colors.muted,
                colors.ink,
                colors['ink-dark'],
                colors.accent,
                colors.success,
                colors.warning,
                colors.danger
            ]

            for (const text of textColors) {
                for (const surface of surfaces) {
                    expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(
                        4.5
                    )
                }
            }
        })

        it(`${themeName} semantic foregrounds contrast with filled states`, () => {
            for (const [foreground, background] of [
                ['on-accent', 'accent'],
                ['on-accent', 'accent-hover'],
                ['on-success', 'success'],
                ['on-warning', 'warning'],
                ['on-danger', 'danger'],
                ['success', 'success-soft'],
                ['warning', 'warning-soft'],
                ['danger', 'danger-soft']
            ]) {
                expect(
                    contrastRatio(colors[foreground], colors[background])
                ).toBeGreaterThanOrEqual(4.5)
            }
        })
    }
})
