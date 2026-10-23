import { describe, it, expect } from 'vitest'

import {
    canCommentOnNode,
    canCreateFolder,
    canDeleteNode,
    canEditNode,
    canReadNode,
    canUploadDoc
} from './index.js'

const roles = ['super_usr_role', 'normal_usr_role', 'limited_usr_role']
const levels = [
    'read_only_access',
    'write_access',
    'write_delete_access',
    'owner_access'
]

describe('shared/authz', () => {
    it('limited never comments (D1)', () => {
        for (const l of levels) {
            expect(canCommentOnNode('limited_usr_role', l)).toBe(false)
        }
    })

    it('absent access disables mutable actions', () => {
        for (const r of roles) {
            expect(canCreateFolder(r, null)).toBe(false)
            expect(canUploadDoc(r, null)).toBe(false)
            expect(canEditNode(r, null)).toBe(false)
            expect(canDeleteNode(r, null)).toBe(false)
        }
    })

    it('read access allows read', () => {
        expect(canReadNode('normal_usr_role', 'read_only_access')).toBe(true)
        expect(canReadNode('limited_usr_role', 'read_only_access')).toBe(true)
    })

    it('matrix sanity', () => {
        expect(canCreateFolder('normal_usr_role', 'write_access')).toBe(true)
        expect(canCreateFolder('limited_usr_role', 'write_access')).toBe(false)
        expect(canDeleteNode('normal_usr_role', 'write_delete_access')).toBe(
            true
        )
    })
})