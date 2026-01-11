import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../utils/firebase'
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp
} from 'firebase/firestore'
import {
    ShoppingBag,
    Package,
    AlertTriangle,
    TrendingUp,
    Plus,
    Search,
    ChevronLeft,
    Store,
    ArrowUpRight
} from 'lucide-react'
import { startOfDay, endOfDay } from 'date-fns'

const Dashboard = () => {
    const [stats, setStats] = useState({
        todaySales: 0,
        todayInvoices: 0,
        lowStock: 0,
        outOfStock: 0,
        totalProducts: 0
    })
    const [recentSales, setRecentSales] = useState([])
    const [lowStockProducts, setLowStockProducts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            // 1. Today's Invoices
            const todayStart = Timestamp.fromDate(startOfDay(new Date()))
            const todayEnd = Timestamp.fromDate(endOfDay(new Date()))
            const qInvoices = query(
                collection(db, "invoices"),
                where("createdAt", ">=", todayStart),
                where("createdAt", "<=", todayEnd)
            )
            const invoiceSnap = await getDocs(qInvoices)
            const todayTotal = invoiceSnap.docs.reduce((sum, doc) => sum + doc.data().total, 0)

            // 2. All Products for Stock info
            const productSnap = await getDocs(collection(db, "products"))
            const prods = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

            const lowStockList = prods.filter(p => p.quantity <= 5 && p.quantity > 0)
            const lowStockCount = lowStockList.length
            const outOfStock = prods.filter(p => p.quantity <= 0).length

            // 3. Recent 5 Sales
            const qRecent = query(
                collection(db, "invoices"),
                orderBy("createdAt", "desc"),
                limit(5)
            )
            const recentSnap = await getDocs(qRecent)

            setStats({
                todaySales: todayTotal,
                todayInvoices: invoiceSnap.size,
                lowStock: lowStockCount,
                outOfStock,
                totalProducts: prods.length
            })
            setRecentSales(recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            setLowStockProducts(lowStockList.slice(0, 5))
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const welcomeMessage = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "صباح الخير"
        if (hour < 18) return "مساء الخير"
        return "ليلة سعيدة"
    }

    if (loading) {
        return (
            <div className="flex animate-pulse flex-col gap-6">
                <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-[32px] w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-[32px]" />
                    <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-[32px]" />
                    <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-[32px]" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 text-right" dir="rtl">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 to-rose-600 rounded-[40px] p-8 md:p-12 text-white shadow-2xl shadow-pink-500/30">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                            <Store className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold opacity-80 uppercase tracking-widest">فيونكه - Fyooonka</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black mb-4">{welcomeMessage()}👋</h1>
                    <p className="text-lg opacity-90 max-w-lg mb-8">نظام الكاشير الذكي الخاص بك جاهز. لديك {stats.todayInvoices} مبيعات اليوم بإجمالي {stats.todaySales} ج.م</p>

                    <div className="flex flex-wrap gap-4">
                        <Link
                            to="/pos"
                            className="px-8 py-4 bg-white text-pink-600 font-black rounded-2xl shadow-xl shadow-black/10 hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            ابدأ عملية بيع
                        </Link>
                        <Link
                            to="/products"
                            className="px-8 py-4 bg-pink-400/30 backdrop-blur-md text-white font-black rounded-2xl border border-white/20 hover:bg-pink-400/50 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            إضافة منتجات
                        </Link>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-[-20%] left-[10%] w-48 h-48 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-2xl">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-gray-300" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">مبيعات اليوم</p>
                    <h3 className="text-2xl font-black mt-1">{stats.todaySales} ج.م</h3>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-2xl">
                            <ShoppingBag className="w-6 h-6 text-blue-500" />
                        </div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">عدد فواتير اليوم</p>
                    <h3 className="text-2xl font-black mt-1">{stats.todayInvoices}</h3>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-2xl">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">أصناف وشكت على النفاذ</p>
                    <h3 className="text-2xl font-black mt-1 text-amber-500">{stats.lowStock}</h3>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-rose-50 dark:bg-rose-900/10 p-3 rounded-2xl">
                            <Package className="w-6 h-6 text-rose-500" />
                        </div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">أصناف نفذت تماماً</p>
                    <h3 className="text-2xl font-black mt-1 text-rose-500">{stats.outOfStock}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black">أحدث العمليات</h3>
                        <Link to="/reports" className="text-pink-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                            عرض الكل <ChevronLeft className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {recentSales.map(sale => (
                            <div key={sale.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-transparent hover:border-pink-100 transition-all">
                                <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100 dark:border-gray-700">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold">فاتورة #{sale.invoiceNumber}</h4>
                                        <span className="font-black text-pink-600">{sale.total} ج.م</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{sale.createdAt ? new Date(sale.createdAt.toDate()).toLocaleTimeString('ar-EG') : ''}</p>
                                </div>
                            </div>
                        ))}
                        {recentSales.length === 0 && (
                            <div className="text-center py-12 text-gray-400 opacity-50">
                                <p>لا يوجد نشاط مسجل بعد</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            تنبيهات نواقص المخزن
                        </h3>
                        <Link to="/products" className="text-pink-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                            إدارة المخزن <ChevronLeft className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {lowStockProducts.map(product => (
                            <div key={product.id} className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100 dark:border-gray-700">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{product.name}</h4>
                                        <p className="text-[10px] text-gray-400">السعر: {product.price} ج.م</p>
                                    </div>
                                </div>
                                <div className="text-left py-1 px-3 bg-amber-500 text-white text-xs font-black rounded-full shadow-lg shadow-amber-500/20">
                                    باقي {product.quantity} فقط
                                </div>
                            </div>
                        ))}
                        {lowStockProducts.length === 0 && (
                            <div className="text-center py-12 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/20">
                                <p className="font-bold">المخزن بحالة ممتازة! لا يوجد نواقص</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Search / Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-900 text-white p-8 rounded-[40px] relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-xl font-black mb-2">تحتاج إلى مساعدة؟</h3>
                            <p className="text-sm opacity-70 mb-6">يمكنك دائماً مراجعة التقارير اليومية أو تحديث المخزون من القائمة الجانبية.</p>
                            <div className="flex items-center gap-4 text-xs font-bold">
                                <span className="px-3 py-1 bg-white/10 rounded-full border border-white/20"> </span>
                                <span className="px-3 py-1 bg-white/10 rounded-full border border-white/20">🏪 01276939225</span>
                            </div>
                        </div>
                        <div className="absolute right-[-10%] top-[-10%] opacity-20 group-hover:scale-110 transition-transform">
                            <Store className="w-48 h-48" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button className="p-6 bg-blue-500 rounded-[32px] text-white flex flex-col items-center gap-3 hover:scale-105 transition-transform">
                            <Search className="w-8 h-8" />
                            <span className="font-bold text-sm">بحث سريع</span>
                        </button>
                        <button className="p-6 bg-pink-500 rounded-[32px] text-white flex flex-col items-center gap-3 hover:scale-105 transition-transform">
                            <Package className="w-8 h-8" />
                            <span className="font-bold text-sm">جرد المخزن</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
