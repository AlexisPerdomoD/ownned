import z from 'zod'

import { ValidationError } from '../../../shared/errors'

class Usr {
    #role

    /**
     * @private
     * @param {string} id
     * @param {string} firstname
     * @param {string} lastname
     * @param {string} username
     * @param {'super_usr_role' | 'normal_usr_role' | 'limited_usr_role'} role
     * @param {string} title
     * @param {Date} created_at
     * @param {Date} updated_at
     */
    constructor(
        id,
        firstname,
        lastname,
        username,
        role,
        title,
        created_at,
        updated_at
    ) {
        this.id = id
        this.firstname = firstname
        this.lastname = lastname
        this.username = username
        this.#role = role
        this.title = title
        this.created_at = created_at
        this.updated_at = updated_at
    }

    static #schema = z.strictObject({
        id: z.uuid(),
        firstname: z.string(),
        lastname: z.string(),
        username: z.string(),
        role: z.enum(['super_usr_role', 'normal_usr_role', 'limited_usr_role']),
        role_title: z.string(),
        created_at: z.coerce.date(),
        updated_at: z.coerce.date()
    })

    get fullname() {
        return `${this.firstname} ${this.lastname}`
    }

    isAdmin() {
        return this.#role === 'super_usr_role'
    }

    isNormal() {
        return this.#role === 'normal_usr_role'
    }

    isLimited() {
        return this.#role === 'limited_usr_role'
    }

    /**
     * @param {unknown} args
     */
    static build(args) {
        const result = Usr.#schema.safeParse(args)
        if (!result.success) {
            throw new ValidationError('Invalid Usr data provided', result.error)
        }

        const {
            id,
            firstname,
            lastname,
            username,
            role,
            role_title,
            created_at,
            updated_at
        } = result.data

        return new Usr(
            id,
            firstname,
            lastname,
            username,
            role,
            role_title,
            created_at,
            updated_at
        )
    }
}

export const buildUsr = Usr.build
