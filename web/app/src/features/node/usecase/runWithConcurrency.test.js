import { describe, expect, it } from 'vitest'

import { runWithConcurrency } from './runWithConcurrency'

describe('runWithConcurrency', () => {
    it('keeps concurrent workers under the configured cap without dropping items', async () => {
        let active = 0
        let peak = 0
        const visited = []

        await runWithConcurrency(
            Array.from({ length: 65 }, (_, index) => index),
            20,
            async item => {
                active += 1
                peak = Math.max(peak, active)
                await Promise.resolve()
                visited.push(item)
                active -= 1
            }
        )

        expect(peak).toBeLessThanOrEqual(20)
        expect(visited).toHaveLength(65)
    })

    it('stops taking queued items after cancellation', async () => {
        const controller = new AbortController()
        const visited = []

        await runWithConcurrency(
            Array.from({ length: 50 }, (_, index) => index),
            3,
            async item => {
                visited.push(item)
                if (visited.length === 3) controller.abort()
                await Promise.resolve()
            },
            controller.signal
        )

        expect(visited).toHaveLength(3)
    })
})
