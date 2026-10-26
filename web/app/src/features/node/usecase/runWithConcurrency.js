/**
 * Runs all items with a rolling worker pool. The queue itself has no size
 * limit; cancellation prevents workers from taking additional items.
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<void>} worker
 * @param {AbortSignal} [signal]
 */
export async function runWithConcurrency(items, concurrency, worker, signal) {
    let nextIndex = 0
    const workerCount = Math.min(Math.max(1, concurrency), items.length)

    await Promise.all(
        Array.from({ length: workerCount }, async () => {
            while (!signal?.aborted) {
                const index = nextIndex++
                if (index >= items.length) return
                await worker(items[index], index)
            }
        })
    )
}
