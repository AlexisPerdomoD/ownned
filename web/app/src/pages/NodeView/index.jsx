import { useGetNode } from '@/features/node/usecase'
import { useParams } from '@solidjs/router'

export function NodeView() {
    const { id } = useParams()
    const { node, loading } = useGetNode(() => id)

    return <section class="flex flex-col items-center h-screen"></section>
}
