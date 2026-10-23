import { createContext, onMount, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'

import { apiGetMe, apiLogin, apiLogout } from '@/entities/usrs/api'

/**
 * @typedef {Object} AuthError
 * @property {Error | null} error - non-401 error from the session check; null means the check resolved to logged-out or logged-in
 */

/**
 * @typedef {Object} AuthCtx
 * @property {Object} state
 * @property {import('@/entities/usrs').Usr | null} state.usr
 * @property {boolean} state.checked - true when the session check reached a terminal state
 * @property {boolean} state.checking - true while a session check is in flight
 * @property {import('@/entities/usrs').Usr | null} state.usr
 * @property {Error | null} state.error - non-recoverable session check error (≠ 401); null when the check resolved to logged-out or logged-in
 *
 * @property {(credentials: import('@entities/usrs/api/login').LoginPwdDTO) => Promise<void>} loginPwd
 * @property {() => Promise<void>} logout
 * @property {() => void} retrySessionCheck
 * @property {() => import('@entities/usrs').UsrRole | null} role
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
        checked: false,
        checking: false,
        error: null
    }

    const [state, setState] = createStore(initialState)

    /**
     * Session check with terminal states:
     * 401 -> anonymous (apiGetMe resolves null), other errors -> checked with `error`.
     */
    const checkSession = async () => {
        setState({ checking: true })
        try {
            const usr = await apiGetMe()
            setState({ usr, checked: true, checking: false, error: null })
        } catch (err) {
            setState({ usr: null, checked: true, checking: false, error: err })
        }
    }

    onMount(() => {
        checkSession()
    })

    /**
     * Login the user.
     * @param { import('@/entities/usrs/api/loginUsr').LoginPwdDTO } sanitizedCredentials
     *
     */
    const loginPwd = sanitizedCredentials =>
        apiLogin(sanitizedCredentials).then(usr => {
            setState({ usr, checked: true, checking: false, error: null })
            return usr
        })

    const logout = async () => {
        try {
            await apiLogout()
        } finally {
            setState({ usr: null, checked: true, checking: false, error: null })
        }
    }

    /**
     * @returns {import('@entities/usrs').UsrRole | null}
     */
    const role = () => state.usr?.role ?? null

    return (
        <AuthCtx.Provider
            value={{ state, loginPwd, logout, retrySessionCheck: checkSession, role }}
        >
            {props.children}
        </AuthCtx.Provider>
    )
}
