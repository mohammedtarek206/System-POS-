import { useState, useEffect } from 'react'
import { db } from '../utils/firebase'
import {
    collection,
    getDocs,
    query,
    orderBy,
    where,
    Timestamp
} from 'firebase/firestore'
import { toast } from 'sonner'
import {
    BarChart3,
    TrendingUp,
    Calendar,
    FileSpreadsheet,
    Search,
    ShoppingCart,
    Package,
    Download,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'
import { ar } from 'date-fns/locale'

const Reports = () => {
    const [invoices, setInvoices] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        start: format(startOfDay(new Date()), 'yyyy-MM-dd'),
        end: format(endOfDay(new Date()), 'yyyy-MM-dd')
    })

    useEffect(() => {
        fetchData()
    }, [dateRange])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch Invoices within date range
            const start = Timestamp.fromDate(new Date(dateRange.start))
            const end = Timestamp.fromDate(new Date(dateRange.end + ' 23:59:59'))

            const q = query(
                collection(db, "invoices"),
                where("createdAt", ">=", start),
                where("createdAt", "<=", end),
                orderBy("createdAt", "desc")
            );

            const sub = await getDocs(q);
            const invoiceData = sub.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInvoices(invoiceData);

            // Fetch all products for "top selling" logic
            const prodSub = await getDocs(collection(db, "products"));
            setProducts(prodSub.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ في تحميل التقارير');
        } finally {
            setLoading(false)
        }
    }

    // Analytics Logic
    const stats = {
        totalSales: invoices.reduce((sum, inv) => sum + inv.total, 0),
        invoiceCount: invoices.length,
        itemsSold: invoices.reduce((sum, inv) => sum + inv.itemCount, 0),
    }

    const topProducts = [...products]
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5);

    const exportToExcel = () => {
        if (invoices.length === 0) {
            toast.error('لا يوجد بيانات لتصديرها');
            return;
        }

        const data = invoices.map(inv => ({
            'رقم الفاتورة': inv.invoiceNumber,
            'التاريخ': inv.createdAt ? format(inv.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : '',
            'عدد القطع': inv.itemCount,
            'الإجمالي (ج.م)': inv.total,
            'المنتجات': inv.items.map(item => `${item.name} (${item.quantity})`).join('، ')
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "المبيعات");

        // Set column widths
        const max_width = data.reduce((w, r) => Math.max(w, r['المنتجات'].length), 10);
        ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: max_width }];

        XLSX.writeFile(wb, `تقرير_مبيعات_${dateRange.start}_إلى_${dateRange.end}.xlsx`);
        toast.success('تم تصدير ملف Excel بنجاح');
    }

    return (
        <div className="space-y-8 text-right" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-pink-500" />
                        تقارير المبيعات
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">تتبع أداء المحل والأصناف الأكثر مبيعاً</p>
                </div>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-6 py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all transform hover:-translate-y-1"
                >
                    <FileSpreadsheet className="w-5 h-5" />
                    تصدير Excel (.xlsx)
                </button>
            </div>

            {/* Date Filter */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-pink-500" />
                    <span className="font-bold whitespace-nowrap">من تاريخ:</span>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-pink-500" />
                    <span className="font-bold whitespace-nowrap">إلى تاريخ:</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setDateRange({
                            start: format(startOfDay(new Date()), 'yyyy-MM-dd'),
                            end: format(endOfDay(new Date()), 'yyyy-MM-dd')
                        })}
                        className="text-xs px-4 py-2 bg-pink-50 dark:bg-pink-900/10 text-pink-600 rounded-full font-bold hover:bg-pink-500 hover:text-white transition-all"
                    >الآن اليوم</button>
                    <button
                        onClick={() => setDateRange({
                            start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                            end: format(new Date(), 'yyyy-MM-dd')
                        })}
                        className="text-xs px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full font-bold hover:bg-gray-200 transition-all"
                    >آخر ٧ أيام</button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-8 rounded-[32px] text-white shadow-xl shadow-pink-500/20 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-32 h-32 text-white" />
                    </div>
                    <p className="text-pink-100 font-bold mb-2">إجمالي المبيعات</p>
                    <h2 className="text-4xl font-black">{stats.totalSales} <small className="text-lg">ج.م</small></h2>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-2xl">
                            <ShoppingCart className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-xs font-bold text-gray-400">مرات البيع</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold">عدد الفواتير</p>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white">{stats.invoiceCount}</h2>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-2xl">
                            <Package className="w-6 h-6 text-amber-500" />
                        </div>
                        <span className="text-xs font-bold text-gray-400">وحدة مباعة</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold">عدد القطع المباعة</p>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white">{stats.itemsSold}</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Products */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        الأكثر مبيعاً (المخزون الكلي)
                    </h3>
                    <div className="space-y-4">
                        {topProducts.map((p, i) => (
                            <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <span className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 flex items-center justify-center font-bold text-sm">
                                        {i + 1}
                                    </span>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                                        <p className="text-xs text-gray-400">{p.price} ج.م</p>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-emerald-500">{p.sold}</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">قطعة مباعة</p>
                                </div>
                            </div>
                        ))}
                        {topProducts.length === 0 && <p className="text-center text-gray-400 py-8">لا يوجد بيانات حالياً</p>}
                    </div>
                </div>

                {/* Recent Invoices */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                    <h3 className="text-xl font-black mb-6">آخر الفواتير في الفترة المحددة</h3>
                    <div className="flex-1 overflow-y-auto max-h-[400px] space-y-3">
                        {invoices.map(inv => (
                            <div key={inv.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-sm">#{inv.invoiceNumber}</span>
                                    <span className="text-xs text-gray-400">{inv.createdAt ? format(inv.createdAt.toDate(), 'HH:mm - yyyy/MM/dd') : ''}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs text-gray-500 max-w-[200px] truncate">
                                        {inv.items.map(item => item.name).join('، ')}
                                    </div>
                                    <span className="font-black text-pink-600">{inv.total} ج.م</span>
                                </div>
                            </div>
                        ))}
                        {invoices.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-400">لا يوجد مبيعات في هذه الفترة</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Reports
