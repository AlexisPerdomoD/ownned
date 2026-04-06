import { render } from 'solid-js/web'

import { ProtectedRoute } from '@features/auth/ui/ProtectedRoute'
import { GroupsView } from '@pages/GroupsView'
import { HomeView } from '@pages/HomeView'
import { LoginView } from '@pages/LoginView'
import { Navigate, Route, Router } from '@solidjs/router'

import { AuthProvider } from './features/auth/providers/AuthProvider'
import './index.css'
import { Toaster } from './shared/ui'

export function App() {
    return (
        <AuthProvider>
            <Router>
                <Route path="/login" component={LoginView} />
                <Route path="/" component={() => <Navigate href="/home" />} />
                <Route
                    path="/home"
                    component={() => (
                        <ProtectedRoute>
                            <HomeView />
                        </ProtectedRoute>
                    )}
                />
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
        </AuthProvider>
    )
}

render(App, document.getElementById('root'))
