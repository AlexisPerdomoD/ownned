import { createContext, onMount, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'

import { apiGetMe, apiLogin } from '@/entities/usrs/api'

/**
 * @typedef {Object} AuthCtx
 * @property {Object} state
 * @property {import('@/entities/usrs').Usr | null} state.usr
 * @property {boolean} state.checked
 *
 * @property {(credentials: import('@entities/usrs/api/login').LoginPwdDTO) => Promise<void>} loginPwd
 * @property {() => Promise<void>} logout
 */

/**
 * @type {import('solid-js').Context<AuthCtx>}
 */
const AuthCtx = createContext()

/**
 * @returns {AuthCtx}
 */
export function useAuth() {
    const ctx = useContext(AuthCtx)
    if (!ctx) {
        throw new Error('useAuth must be used within a AuthProvider')
    }

    return ctx
}

/**
 * @param {Object} props
 * @param {import('solid-js').JSX.Element} props.children
 * @returns {import('solid-js').JSX.Element}
 */
export function AuthProvider(props) {
    /**
     *  @type AuthCtx['state']
     */
    const initialState = {
        usr: null,
        checked: false
    }

    const [state, setState] = createStore(initialState)

    onMount(
        () => apiGetMe().then(usr => setState({ usr, checked: true }))
        // TODO: check if here errors need to be handled
    )

    /**
     * Login the user.
     * @param { import('@entities/usrs/api/login').LoginPwdDTO } sanitizedCredentials
     *
     */
    const loginPwd = sanitizedCredentials =>
        apiLogin(sanitizedCredentials).then(usr => {
            setState({ usr, checked: true })
            return usr
        })
    // TODO: check if here errors need to be handled

    // TODO: create logout api
    // TODO: check if here errors need to be handled
    const logout = async () => setState({ usr: null, checked: false })

    return (
        <AuthCtx.Provider value={{ state, loginPwd, logout }}>
            {props.children}
        </AuthCtx.Provider>
    )
}
