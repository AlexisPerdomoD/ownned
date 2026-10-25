import { createSignal, onMount } from 'solid-js'
import { apiPaginateUsrs, apiCreateUsr, buildCreateUsrDTO } from '@/entities/usrs/api'
import { toast } from '@/shared/ui'

export function usePaginateUsrs({ pageSize = 20 } = {}) {
    /**
     * @type {import("solid-js").Signal<import('@/entities/usrs').Usr[]>}
     */
    const [usrs, setUsrs] = createSignal([])
    const [page, setPage] = createSignal(1)
    const [total, setTotal] = createSignal(0)
    const [loading, setLoading] = createSignal(true)
    const [search, setSearch] = createSignal('')
    const [role, setRole] = createSignal(undefined)
    const [error, setError] = createSignal(null)
    let latestRequest = 0

    const fetch = async (pg, term, roleFilter) => {
        const requestId = ++latestRequest
        setLoading(true)
        setError(null)
        try {
            const res = await apiPaginateUsrs(pg, pageSize, term, roleFilter)
            if (requestId !== latestRequest) return false
            setUsrs(res.data)
            setTotal(res.total_count)
            setPage(res.page)
            return true
        } catch (cause) {
            if (requestId === latestRequest) {
                setUsrs([])
                setTotal(0)
                setError(cause)
            }
            return false
        } finally {
            if (requestId === latestRequest) setLoading(false)
        }
    }

    onMount(() => {
        void fetch(1, '', undefined)
    })

    return {
        usrs,
        page,
        total,
        loading,
        error,
        search,
        setSearch,
        role,
        setRole,
        goTo: pg => fetch(pg, search(), role()),
        refresh: () => fetch(page(), search(), role()),
        setPage: pg => fetch(pg, search(), role())
    }
}

export function useCreateUsr() {
    const [loading, setLoading] = createSignal(false)

    const create = async (username, password, firstname, lastname, role) => {
        const [valid, dto] = buildCreateUsrDTO(username, password, firstname, lastname, role)
        if (!valid) {
            return [false, dto]
        }

        setLoading(true)
        try {
            const usr = await apiCreateUsr(dto)
            toast.success('User created.')
            return [true, usr]
        } catch (e) {
            return [
                false,
                {
                    general:
                        e?.message ||
                        e?.detail?.reason ||
                        'Request failed.'
                }
            ]
        } finally {
            setLoading(false)
        }
    }

    return { create, loading }
}
