import { describe, expect, it } from 'vitest'

import { paginateChildren } from './paginateChildren'

const folders = Array.from({ length: 120 }, (_, i) => ({
    id: `folder-${i}`,
    type: 'folder'
}))
const files = Array.from({ length: 130 }, (_, i) => ({
    id: `file-${i}`,
    type: 'file'
}))

describe('paginateChildren', () => {
    it('renders no more than 100 nodes and keeps folders before files', () => {
        const page = paginateChildren(folders, files, 1)

        expect(page.total).toBe(250)
        expect(page.totalPages).toBe(3)
        expect(page.folders).toHaveLength(100)
        expect(page.files).toHaveLength(0)
    })

    it('continues the folder-first sequence on following pages', () => {
        const page = paginateChildren(folders, files, 2)

        expect(page.folders).toHaveLength(20)
        expect(page.files).toHaveLength(80)
    })

    it('clamps requested pages to the available range', () => {
        expect(paginateChildren(folders, files, 99).page).toBe(3)
        expect(paginateChildren([], [], 0).page).toBe(1)
    })
})
