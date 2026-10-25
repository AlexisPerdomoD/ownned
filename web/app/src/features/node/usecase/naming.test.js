import { describe, expect, it } from 'vitest'

import { fileBaseName, nameSuffix, uniqueFileName } from './naming'

describe('node file naming', () => {
    it('keeps the original name when there is no collision', () => {
        expect(uniqueFileName('a.txt', ['a.pdf'])).toBe('a.txt')
    })

    it('uses the first available suffix among existing names', () => {
        expect(
            uniqueFileName('a.txt', ['a.txt', 'a (1).txt', 'a (3).txt'])
        ).toBe(
            'a (2).txt'
        )
    })

    it('does not cap enumeration at the retry limit', () => {
        const taken = [
            'a.txt',
            ...Array.from({ length: 15 }, (_, i) => `a (${i + 1}).txt`)
        ]
        expect(uniqueFileName('a.txt', taken)).toBe('a (16).txt')
    })

    it('preserves multi-part extensions and dotfiles', () => {
        expect(uniqueFileName('archive.tar.gz', ['archive.tar.gz'])).toBe(
            'archive.tar (1).gz'
        )
        expect(fileBaseName('.env')).toBe('.env')
        expect(uniqueFileName('.env', ['.env'])).toBe('.env (1)')
    })

    it('extracts suffixes when a filename has multiple extensions', () => {
        expect(nameSuffix('archive.tar (12).gz')).toBe(12)
        expect(nameSuffix('archive.tar.gz')).toBe(0)
    })
})
