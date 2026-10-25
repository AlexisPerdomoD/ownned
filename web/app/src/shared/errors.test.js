import { describe, expect, it } from 'vitest'

import { getErrorMessage } from './errors'

describe('getErrorMessage', () => {
    it('prefers the API detail reason over a generic message', () => {
        expect(
            getErrorMessage({
                message: 'conflict',
                detail: { reason: 'Name already exists.' }
            })
        ).toBe('Name already exists.')
    })

    it('joins validation issue messages when there is no general message', () => {
        expect(
            getErrorMessage({ username: 'Required', password: 'Too short' })
        ).toBe('Required · Too short')
    })

    it('uses a fallback when the error has no displayable message', () => {
        expect(getErrorMessage({}, 'Upload failed')).toBe('Upload failed')
    })
})
