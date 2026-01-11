import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    BarChart3,
    LogOut,
    Menu,
    X,
    Sun,
    Moon,
    Heart
} from 'lucide-react'
import { auth } from '../utils/firebase'
import { signOut } from 'firebase/auth'

const Sidebar = ({ darkMode, setDarkMode }) => {
    const [isOpen, setIsOpen] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'لوحة التحكم' },
        { path: '/pos', icon: ShoppingBag, label: 'نقطة البيع (POS)' },
        { path: '/products', icon: Package, label: 'المنتجات والمخزن' },
        { path: '/reports', icon: BarChart3, label: 'التقارير' },
    ]

    const handleLogout = async () => {
        try {
            await signOut(auth)
            navigate('/login')
        } catch (error) {
            console.error('Logout error', error)
        }
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 right-0 z-30 w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
                <div className="flex flex-col h-full">
                    {/* Logo Section */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                                <Heart className="w-6 h-6 text-pink-500" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                                فيونكه POS
                            </span>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive
                                            ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/10 hover:text-pink-600'}
                  `}
                                >
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'group-hover:text-pink-500'}`} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Footer Sidebar */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            <span className="font-medium text-right">{darkMode ? 'الوضع المضيء' : 'الوضع الليلي'}</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">تسجيل الخروج</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header (Mobile) */}
                <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setIsOpen(true)} className="p-2 text-gray-600 dark:text-gray-400">
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-pink-500">فيونكه POS</span>
                    <div className="w-6" /> {/* Spacer */}
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>

                    {/* Footer with credit */}
                    <footer className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 text-center space-y-2 pb-8">
                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                            تصميم وتطوير بواسطة <span className="text-pink-600 font-bold">محمد طارق</span>
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
                            <span>📞 01284621015</span>
                            
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    )
}

export default Sidebar
