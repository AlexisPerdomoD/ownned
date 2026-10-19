import { Button } from '@/shared/ui'
import { A } from '@solidjs/router'

export function NotFoundView() {
    return (
        <section class="flex flex-col items-center justify-center h-screen">
            <div class="max-w-md w-full text-center px-6">
                <h1 class="text-3xl font-serif text-ink-dark mb-2">404</h1>
                <p class="text-lg text-ink font-serif mb-2">Page Not Found</p>
                <p class="text-sm text-muted mb-6">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div class="flex justify-center gap-3">
                    <A href="/nodes">
                        <Button>Go to Files</Button>
                    </A>
                    <A href="/groups">
                        <Button variant="ghost">Go to Groups</Button>
                    </A>
                </div>
            </div>
        </section>
    )
}
