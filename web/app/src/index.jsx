import { ErrorBoundary, render } from 'solid-js/web'

import { ProtectedRoute } from '@features/auth/ui/ProtectedRoute'
import { GroupView } from '@pages/GroupView'
import { GroupsView } from '@pages/GroupsView'
import { HomeView } from '@pages/HomeView'
import { LoginView } from '@pages/LoginView'
import { NotFoundView } from '@pages/NotFoundView'
import { UsrsView } from '@pages/UsrsView'
import { Navigate, Route, Router } from '@solidjs/router'

import { AuthProvider } from './features/auth/providers/AuthProvider'
import './index.css'
import { NodeView } from './pages/NodeView'
import { ErrView, Toaster } from './shared/ui'
import { Navbar } from './shared/ui/Navbar'

function ProtectedLayout({ children }) {
    return (
        <section class="flex flex-col h-screen">
            <Navbar />
            <main class="flex-1 overflow-y-auto bg-[--color-bg]">
                {children}
            </main>
        </section>
    )
}

export function App() {
    return (
        <AuthProvider>
            <ErrorBoundary fallback={error => <ErrView error={error} />}>
                <Router>
                    <Route path="/login" component={LoginView} />
                    <Route
                        path="/"
                        component={() => <Navigate href="/nodes" />}
                    />
                    <Route path="/nodes">
                        <Route
                            path="/"
                            component={() => (
                                <ProtectedRoute>
                                    <ProtectedLayout>
                                        <HomeView />
                                    </ProtectedLayout>
                                </ProtectedRoute>
                            )}
                        />
                        <Route
                            path="/:id"
                            component={() => (
                                <ProtectedRoute>
                                    <ProtectedLayout>
                                        <NodeView />
                                    </ProtectedLayout>
                                </ProtectedRoute>
                            )}
                        />
                    </Route>
                    <Route path="/groups">
                        <Route
                            path="/"
                            component={() => (
                                <ProtectedRoute>
                                    <ProtectedLayout>
                                        <GroupsView />
                                    </ProtectedLayout>
                                </ProtectedRoute>
                            )}
                        />
                        <Route
                            path="/:id"
                            component={() => (
                                <ProtectedRoute>
                                    <ProtectedLayout>
                                        <GroupView />
                                    </ProtectedLayout>
                                </ProtectedRoute>
                            )}
                        />
                    </Route>
                    <Route
                        path="/usrs"
                        component={() => (
                            <ProtectedRoute>
                                <ProtectedLayout>
                                    <UsrsView />
                                </ProtectedLayout>
                            </ProtectedRoute>
                        )}
                    />
                    <Route
                        path="*"
                        component={() => (
                            <ProtectedRoute>
                                <ProtectedLayout>
                                    <NotFoundView />
                                </ProtectedLayout>
                            </ProtectedRoute>
                        )}
                    />
                </Router>
                <Toaster />
            </ErrorBoundary>
        </AuthProvider>
    )
}

render(App, document.getElementById('root'))