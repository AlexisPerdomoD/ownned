import { describe, expect, it } from 'vitest'

import { planFolderUpload } from './planFolderUpload'

const file = (name, webkitRelativePath) => ({ name, webkitRelativePath })

describe('planFolderUpload', () => {
    it('deduplicates paths and orders directories parent-first', () => {
        const plan = planFolderUpload([
            file('one.txt', 'Root/a/b/one.txt'),
            file('two.txt', 'Root/a/two.txt'),
            file('one.txt', 'Root/a/b/one.txt')
        ])

        expect(plan.folders.map(folder => folder.path)).toEqual([
            'Root',
            'Root/a',
            'Root/a/b'
        ])
        expect(plan.files.map(item => item.path)).toEqual([
            'Root/a/b/one.txt',
            'Root/a/two.txt'
        ])
        expect(plan.total).toBe(5)
    })

    it('does not impose frontend depth or element-count limits', () => {
        const deepPath = `${Array.from({ length: 25 }, (_, i) => `d${i}`).join('/')}/file.txt`
        const files = Array.from({ length: 125 }, (_, i) =>
            file(`f${i}.txt`, `Root/f${i}.txt`)
        )
        files.push(file('file.txt', deepPath))

        const plan = planFolderUpload(files)

        expect(plan.files).toHaveLength(126)
        expect(plan.folders).toHaveLength(26)
        expect(plan.total).toBe(152)
    })

    it('normalizes slash separators and accepts files at the destination root', () => {
        const plan = planFolderUpload([
            file('loose.txt', 'loose.txt'),
            file('deep.txt', 'Top\\Nested\\deep.txt')
        ])

        expect(plan.folders.map(folder => folder.path)).toEqual([
            'Top',
            'Top/Nested'
        ])
        expect(plan.files[0].parentPath).toBe('')
        expect(plan.files[1].parentPath).toBe('Top/Nested')
    })
})
