import { describe, expect, it } from 'vitest'

import { buildCreateUsrDTO, CreateUsrDTO } from './createUsr.js'

const validInput = {
    username: 'admin@example.com',
    password: 'Admin123!',
    firstname: 'Ada',
    lastname: 'Lovelace',
    role: 'normal_usr_role'
}

/**
 * Runs the DTO builder and returns the issue map on failure.
 * @param {Record<string, string>} overrides
 */
function build(overrides = {}) {
    const [ok, result] = buildCreateUsrDTO(
        overrides.username ?? validInput.username,
        overrides.password ?? validInput.password,
        overrides.firstname ?? validInput.firstname,
        overrides.lastname ?? validInput.lastname,
        overrides.role ?? validInput.role
    )
    return { ok, result }
}

describe('CreateUsrDTO — backend contract replication (POST /api/v1/usrs)', () => {
    it('accepts an input that satisfies every backend rule', () => {
        const { ok, result } = build()
        expect(ok).toBe(true)
        expect(result).toBeInstanceOf(CreateUsrDTO)
        expect(result.toJSON()).toEqual(validInput)
    })

    it('requires a password with 8–255 chars, letter, digit and symbol', () => {
        expect(build({ password: 'Ad1!' }).ok).toBe(false)
        // NOTE: the contract asks letter+digit+symbol, no uppercase rule.
        expect(build({ password: 'admin123!' }).ok).toBe(true)
        expect(build({ password: 'Admin1' }).ok).toBe(false)
        expect(build({ password: 'ADMIN1234' }).ok).toBe(false)
        expect(build({ password: `A1!${'a'.repeat(253)}` }).ok).toBe(false)
        expect(build({ password: `A1!${'a'.repeat(252)}` }).ok).toBe(true)
    })

    it('reports failing password rules as a password issue', () => {
        // NOTE: build() collapses multiple issues of the same field to the
        // last message, so one of the two missing rules is reported.
        const { ok, result } = build({ password: 'adminpassword' })
        expect(ok).toBe(false)
        expect(result.password).toMatch(/at least one (digit|symbol)/)
    })

    it('requires a valid email as username', () => {
        const { ok, result } = build({ username: 'not-an-email' })
        expect(ok).toBe(false)
        expect(result.username).toBe('Invalid email format.')
    })

    it('requires names of 2–50 characters', () => {
        expect(build({ firstname: 'A' }).ok).toBe(false)
        expect(build({ lastname: 'A' }).ok).toBe(false)
        expect(build({ firstname: 'A'.repeat(51) }).ok).toBe(false)
        expect(build({ lastname: 'B'.repeat(51) }).ok).toBe(false)
    })

    it('requires one of the three backend roles', () => {
        const { ok, result } = build({ role: 'admin_role' })
        expect(ok).toBe(false)
        expect(result.role).toBe('Invalid role.')
        for (const role of ['super_usr_role', 'limited_usr_role']) {
            expect(build({ role }).ok).toBe(true)
        }
    })

    it('maps each issue to its field path', () => {
        const { ok, result } = build({
            username: 'broken',
            password: 'short',
            firstname: 'A',
            lastname: 'B',
            role: 'nope'
        })
        expect(ok).toBe(false)
        expect(Object.keys(result).sort()).toEqual([
            'firstname',
            'lastname',
            'password',
            'role',
            'username'
        ])
    })
})
