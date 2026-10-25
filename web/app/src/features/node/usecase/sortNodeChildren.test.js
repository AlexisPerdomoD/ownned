import { describe, expect, it } from 'vitest'

import { sortNodeChildren } from './sortNodeChildren'

const nodes = [
    { id: 'b', name: 'b.txt', created_at: '2026-02-01', updated_at: '2026-02-02' },
    { id: 'hidden', name: '.notes', created_at: '2026-03-01', updated_at: '2026-03-02' },
    { id: 'a', name: 'a.txt', created_at: '2026-01-01', updated_at: '2026-04-01' }
]

describe('sortNodeChildren', () => {
    it('sorts by the real filename and hides dotfiles by default', () => {
        expect(sortNodeChildren(nodes).map(node => node.id)).toEqual([
            'a',
            'b'
        ])
    })

    it('sorts by creation and modification dates in either direction', () => {
        expect(
            sortNodeChildren(nodes, 'created', 'asc', true).map(
                node => node.id
            )
        ).toEqual(['a', 'b', 'hidden'])
        expect(
            sortNodeChildren(nodes, 'updated', 'desc', true).map(
                node => node.id
            )
        ).toEqual(['a', 'hidden', 'b'])
    })

    it('does not mutate the original list', () => {
        const originalIds = nodes.map(node => node.id)
        sortNodeChildren(nodes, 'name', 'desc', true)
        expect(nodes.map(node => node.id)).toEqual(originalIds)
    })
})
