import { describe, expect, it } from 'vitest'

import {
    canAssignGroupUsr,
    canCommentOnNode,
    canCreateFolder,
    canDeleteNode,
    canEditNode,
    canManageGroupNodes,
    canManageGroupUsrs,
    canManageUsrs,
    canReadNode,
    canUploadDoc,
    hasKnownAccess,
    isValidAccessForRole
} from './index.js'

const roles = ['super_usr_role', 'normal_usr_role', 'limited_usr_role']
const levels = [
    'read_only_access',
    'write_access',
    'write_delete_access',
    'owner_access'
]

const readActions = { canReadNode, canCommentOnNode }
const writeActions = {
    canCreateFolder,
    canUploadDoc,
    canEditNode,
    canDeleteNode
}

/**
 * Expected full matrix derived from the helpers' contract: rank requirement
 * (read = 1, write = 2), role ceiling (limited clamps to read-only rank) and
 * rule D1 (limited never comments). Used to assert the implementation against
 * an exhaustive enumeration instead of spot checks.
 * @param {string} role
 * @param {string | null} level
 * @param {(role: string, level: string | null) => boolean} action
 */
function expected(role, level, action) {
    if (!role || !hasKnownAccess(level)) return false
    const rankRules =
        action === canReadNode || action === canCommentOnNode ? 1 : 2
    const ceiling = role === 'limited_usr_role' ? 1 : 4
    const rank = Math.min(
        { read_only_access: 1, write_access: 2, write_delete_access: 3, owner_access: 4 }[
            /** @type {string} */ (level)
        ],
        ceiling
    )
    if (action === canCommentOnNode && role === 'limited_usr_role') return false
    return rank >= rankRules
}

describe('shared/authz — full role × access × action matrix', () => {
    for (const [name, action] of Object.entries({
        ...readActions,
        ...writeActions
    })) {
        it(`agrees with the contract for ${name} across every role and level`, () => {
            for (const role of roles) {
                for (const level of [...levels, null]) {
                    expect(`${role}:${level}:${name}: ${action(role, level)}`).toBe(
                        `${role}:${level}:${name}: ${expected(role, level, action)}`
                    )
                }
            }
        })
    }

    it('enforces D1: limited_usr_role never comments, at any level', () => {
        for (const level of [...levels, null]) {
            expect(canCommentOnNode('limited_usr_role', level)).toBe(false)
        }
    })

    it('never authorizes without a role, even with owner_access', () => {
        for (const action of Object.values({ ...readActions, ...writeActions })) {
            expect(action(null, 'owner_access')).toBe(false)
            expect(action(undefined, 'owner_access')).toBe(false)
        }
    })

    it('treats super_usr_role identically to normal_usr_role on resource actions', () => {
        for (const action of Object.values({ ...readActions, ...writeActions })) {
            for (const level of [...levels, null]) {
                expect(action('super_usr_role', level)).toBe(
                    action('normal_usr_role', level)
                )
            }
        }
    })
})

describe('shared/authz — role-only helpers', () => {
    it('canAssignGroupUsr / canManageGroupUsrs / canManageGroupNodes allow super and normal only', () => {
        const helpers = [
            canAssignGroupUsr,
            canManageGroupUsrs,
            canManageGroupNodes
        ]
        for (const helper of helpers) {
            expect(helper('super_usr_role')).toBe(true)
            expect(helper('normal_usr_role')).toBe(true)
            expect(helper('limited_usr_role')).toBe(false)
            expect(helper(null)).toBe(false)
        }
    })

    it('canManageUsrs allows super only', () => {
        expect(canManageUsrs('super_usr_role')).toBe(true)
        expect(canManageUsrs('normal_usr_role')).toBe(false)
        expect(canManageUsrs('limited_usr_role')).toBe(false)
        expect(canManageUsrs(null)).toBe(false)
    })

    it('isValidAccessForRole prunes invalid assignments per target role', () => {
        for (const level of levels) {
            expect(isValidAccessForRole(level, 'super_usr_role')).toBe(false)
            expect(isValidAccessForRole(level, 'limited_usr_role')).toBe(
                level === 'read_only_access'
            )
            expect(isValidAccessForRole(level, 'normal_usr_role')).toBe(true)
        }
        expect(isValidAccessForRole(null, 'normal_usr_role')).toBe(false)
        expect(
            isValidAccessForRole(
                /** @type {any} */ ('unknown_level'),
                'normal_usr_role'
            )
        ).toBe(false)
    })

    it('hasKnownAccess recognizes the four backend levels only', () => {
        for (const level of levels) {
            expect(hasKnownAccess(level)).toBe(true)
        }
        expect(hasKnownAccess(null)).toBe(false)
        expect(hasKnownAccess(undefined)).toBe(false)
        expect(hasKnownAccess(/** @type {any} */ ('admin_access'))).toBe(false)
    })
})
