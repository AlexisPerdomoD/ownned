import { LoginForm } from '@features/auth/ui/LoginForm'

export function LoginView() {
    return (
        <section class="flex flex-col items-center justify-center h-screen">
            <section class="max-w-md w-full">
                <section class="mb-4 py-4">
                    <h1 class="text-2xl font-semibold text-center font-serif pb-2">
                        Login to your account
                    </h1>
                    <p class="text-sm text-center">
                        If you don't have an account, why are you here?
                    </p>
                </section>

                <LoginForm />
            </section>
        </section>
    )
}
