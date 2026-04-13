import { ErrorBoundary, render } from 'solid-js/web'

import { ProtectedRoute } from '@features/auth/ui/ProtectedRoute'
import { GroupsView } from '@pages/GroupsView'
import { HomeView } from '@pages/HomeView'
import { LoginView } from '@pages/LoginView'
import { Navigate, Route, Router } from '@solidjs/router'

import { AuthProvider } from './features/auth/providers/AuthProvider'
import './index.css'
import { NodeView } from './pages/NodeView'
import { ErrView, Toaster } from './shared/ui'

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
                        <Router>
                            <Route
                                path="/"
                                component={() => (
                                    <ProtectedRoute>
                                        <HomeView />
                                    </ProtectedRoute>
                                )}
                            />
                            <Route
                                path="/:id"
                                component={() => (
                                    <ProtectedRoute>
                                        <NodeView />
                                    </ProtectedRoute>
                                )}
                            />
                        </Router>
                    </Route>
                    <Route
                        path="/groups"
                        component={() => (
                            <ProtectedRoute>
                                <GroupsView />
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
