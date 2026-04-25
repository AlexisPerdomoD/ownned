import { createSignal, onMount } from 'solid-js'
import { apiPaginateUsrs, apiCreateUsr, apiDeleteUsr, buildCreateUsrDTO } from '@/entities/usrs/api'
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

    const fetch = async (pg, term, roleFilter) => {
        setLoading(true)
        try {
            const res = await apiPaginateUsrs(pg, pageSize, term, roleFilter)
            setUsrs(res.data)
            setTotal(res.total_count)
            setPage(res.page)
        } finally {
            setLoading(false)
        }
    }

    onMount(() => {
        fetch(1, '', undefined)
    })

    return {
        usrs,
        page,
        total,
        loading,
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

    const create = async (username, password, firstname, lastname, role, access = []) => {
        const [valid, dto] = buildCreateUsrDTO(username, password, firstname, lastname, role, access)
        if (!valid) {
            return [false, dto]
        }

        setLoading(true)
        try {
            const usr = await apiCreateUsr(dto)
            toast({ type: 'success', message: 'User created.' })
            return [true, usr]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { create, loading }
}

export function useDeleteUsr() {
    const [loading, setLoading] = createSignal(false)

    const remove = async usrId => {
        setLoading(true)
        try {
            await apiDeleteUsr(usrId)
            toast({ type: 'success', message: 'User deleted.' })
            return [true, null]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}

