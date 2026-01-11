import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Products from './pages/Products'
import Reports from './pages/Reports'
import Sidebar from './components/Sidebar'
import { useAuth } from './hooks/useAuth'

function App() {
    const { user, loading } = useAuth()
    const [darkMode, setDarkMode] = useState(false)

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            </div>
        )
    }

    return (
        <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
            <Toaster position="top-center" richColors />
            <Routes>
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                <Route
                    path="/"
                    element={user ? <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} /> : <Navigate to="/login" />}
                >
                    <Route index element={<Dashboard />} />
                    <Route path="pos" element={<POS />} />
                    <Route path="products" element={<Products />} />
                    <Route path="reports" element={<Reports />} />
                </Route>
            </Routes>
        </div>
    )
}

export default App
