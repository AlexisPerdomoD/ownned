import { createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'

import { buildLoginPwdDTO } from '@/entities/usrs/api'
import { ApiError } from '@/shared/errors'
import { useNavigate } from '@solidjs/router'

import { useAuth } from '../providers/AuthProvider'

/**
 * @typedef {Object} LoginFormIssues
 * @property {string} [username]
 * @property {string} [password]
 * @property {string} [general]
 */

/**
 * Hook de lógica de login.
 * Gestiona el formulario, errores de validación del backend y redirección.
 *
 * @returns {{
 *   fields:   { username: string, password: string },
 *   issues:   import('solid-js').Accessor<LoginFormIssues>,
 *   loading:  import('solid-js').Accessor<boolean>,
 *   setField: (field: 'username' | 'password', value: string) => void,
 *   submit:   (e: Event) => Promise<void>
 * }}
 */
export function usePwdLogin() {
    const { loginPwd } = useAuth()
    const navigate = useNavigate()

    const [fields, setFields] = createStore({
        username: '',
        password: ''
    })
    const [issues, setIssues] = createSignal({})
    const [loading, setLoading] = createSignal(false)

    /**
     * @param {'username' | 'password'} field
     * @param {string} value
     */
    const setField = (field, value) => {
        setFields(prev => ({ ...prev, [field]: value }))
        if (issues[field]) {
            setIssues(prev => ({ ...prev, [field]: undefined }))
        }
    }

    /**
     * @param {Event} e
     */
    const submit = e => {
        e.preventDefault()
        setIssues({})
        setLoading(true)

        const [ok, dto] = buildLoginPwdDTO(fields.username, fields.password)
        if (!ok) {
            setIssues(dto)
            return
        }

        return loginPwd(dto)
            .then(() => navigate('/home', { replace: true }))
            .catch(err => {
                if (err instanceof ApiError) {
                    setIssues({ general: err.message, _id: Date.now() })
                    return
                }

                throw err
            })
            .finally(() => setLoading(false))
    }

    return {
        fields,
        issues,
        loading,
        setField,
        submit
    }
}
