import { reqJSON } from '@shared/api/client'

export async function apiPaginateNodes({ rootId, page = 1, limit = 10, search = '', type } = {}) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (rootId) params.set('root_id', rootId)
    if (search) params.set('search', search)
    if (type) params.set('node_type', type)

    return reqJSON(`/api/v1/nodes/paginate?${params.toString()}`)
}

export async function apiPaginateDocs({ rootId, page = 1, limit = 10, search = '', mimetype, minSize, maxSize } = {}) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (rootId) params.set('root_id', rootId)
    if (search) params.set('search', search)
    if (mimetype) params.set('mimetype', mimetype)
    if (minSize != null) params.set('min_size', String(minSize))
    if (maxSize != null) params.set('max_size', String(maxSize))

    return reqJSON(`/api/v1/nodes/docs/paginate?${params.toString()}`)
}
