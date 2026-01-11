import { useState } from 'react'
import { auth } from '../utils/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { toast } from 'sonner'
import { Heart, Lock, Mail, Eye, EyeOff } from 'lucide-react'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await signInWithEmailAndPassword(auth, email, password)
            toast.success('تم تسجيل الدخول بنجاح')
        } catch (error) {
            console.error(error)
            toast.error('خطأ في البريد الإلكتروني أو كلمة المرور')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-pink-50 dark:bg-gray-950">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-400 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-400 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md z-10">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white dark:border-gray-800">
                    <div className="text-center mb-8">
                        <div className="inline-flex p-4 bg-pink-500 rounded-2xl shadow-lg shadow-pink-500/30 mb-4">
                            <Heart className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">أهلاً بك مجدداً</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">قم بتسجيل الدخول للوصول إلى نظام الكاشير</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 text-right" dir="rtl">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mr-2">
                                البريد الإلكتروني
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-4 pr-12 py-4 bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl focus:ring-2 focus:ring-pink-500 transition-all outline-none"
                                    placeholder="admin@example.com"
                                    required
                                />
                                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mr-2">
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl focus:ring-2 focus:ring-pink-500 transition-all outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/40 transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    جارٍ التحميل...
                                </div>
                            ) : (
                                'تسجيل الدخول'
                            )}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-8 text-gray-500 dark:text-gray-400 text-sm">
                    تطوير بواسطة محمد طارق - 01284621015
                </div>
            </div>
        </div>
    )
}

export default Login
