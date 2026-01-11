import { useState, useEffect, useRef } from 'react'
import { db } from '../utils/firebase'
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore'
import { toast } from 'sonner'
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Barcode as BarcodeIcon,
    Printer,
    X,
    AlertTriangle,
    PackageCheck
} from 'lucide-react'
import JsBarcode from 'jsbarcode'
import { useReactToPrint } from 'react-to-print'

const Products = () => {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingProduct, setEditingProduct] = useState(null)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        costPrice: '',
        quantity: '',
        barcode: '',
    })

    const barcodeRef = useRef(null)
    const printBarcodeRef = useRef(null)

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(data);
        } catch (error) {
            console.error("Firebase Fetch Error:", error);
            toast.error('حدث خطأ في تحميل المنتجات');
        } finally {
            setLoading(false);
        }
    }

    const generateBarcode = () => {
        return 'ACC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        const barcode = formData.barcode.trim() || generateBarcode();

        const productData = {
            name: formData.name,
            price: Number(formData.price),
            costPrice: Number(formData.costPrice || 0),
            quantity: Number(formData.quantity),
            sold: editingProduct ? editingProduct.sold : 0,
            barcode: barcode,
            updatedAt: serverTimestamp(),
        };

        try {
            if (editingProduct) {
                await updateDoc(doc(db, "products", editingProduct.id), productData);
                toast.success('تم تحديث المنتج بنجاح');
            } else {
                await addDoc(collection(db, "products"), {
                    ...productData,
                    createdAt: serverTimestamp(),
                });
                toast.success('تم إضافة المنتج بنجاح');
            }
            setIsModalOpen(false);
            setEditingProduct(null);
            setFormData({ name: '', price: '', costPrice: '', quantity: '', barcode: '' });
            fetchProducts();
        } catch (error) {
            console.error("Firebase Save Error:", error);
            toast.error(`حدث خطأ في الحفظ: ${error.message}`);
        }
    }

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            try {
                await deleteDoc(doc(db, "products", id));
                toast.success('تم حذف المنتج');
                fetchProducts();
            } catch (error) {
                toast.error('حدث خطأ في الحذف');
            }
        }
    }

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price,
            costPrice: product.costPrice || '',
            quantity: product.quantity,
            barcode: product.barcode,
        });
        setIsModalOpen(true);
    }

    const handlePrintBarcode = useReactToPrint({
        content: () => printBarcodeRef.current,
    });

    const [barcodeToPrint, setBarcodeToPrint] = useState(null);

    const openBarcodePrint = (product) => {
        setBarcodeToPrint(product);
        setTimeout(() => {
            if (barcodeRef.current) {
                JsBarcode(barcodeRef.current, product.barcode, {
                    format: "CODE128",
                    width: 2,
                    height: 100,
                    displayValue: true
                });
                handlePrintBarcode();
            }
        }, 100);
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة المنتجات</h1>
                    <p className="text-gray-500 dark:text-gray-400">نظرة عامة على مخزون المحل</p>
                </div>
                <button
                    onClick={() => {
                        setEditingProduct(null);
                        setFormData({ name: '', price: '', costPrice: '', quantity: '', barcode: '' });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-pink-500 text-white font-semibold rounded-2xl shadow-lg shadow-pink-500/20 hover:bg-pink-600 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    إضافة منتج جديد
                </button>
            </div>

            {/* Search and Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2 relative">
                    <input
                        type="text"
                        placeholder="بحث بالاسم أو الباركود..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-12 py-4 bg-white dark:bg-gray-800 border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-pink-500 outline-none"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
                        <PackageCheck className="w-6 h-6 text-pink-500" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المنتجات</p>
                        <p className="text-xl font-bold">{products.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">نواقص (أقل من 5)</p>
                        <p className="text-xl font-bold text-amber-500">{products.filter(p => p.quantity <= 5 && p.quantity > 0).length}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">المنتج</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">سعر البيع</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">سعر الجملة</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">الكمية</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">الباركود</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">الحالة</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="animate-spin inline-block w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full" />
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        لا يوجد منتجات حالياً
                                    </td>
                                </tr>
                            ) : filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 dark:text-white">{product.name}</div>
                                        <div className="text-xs text-gray-400">{new Date(product.createdAt?.seconds * 1000).toLocaleDateString('ar-EG')}</div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                                        {product.price} ج.م
                                    </td>
                                    <td className="px-6 py-4 font-bold text-amber-600 dark:text-amber-400">
                                        {product.costPrice || 0} ج.م
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.quantity <= 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                                            product.quantity <= 5 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            }`}>
                                            {product.quantity} قطعة
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex items-center gap-2">
                                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{product.barcode}</code>
                                        <button
                                            onClick={() => openBarcodePrint(product)}
                                            className="p-2 text-gray-400 hover:text-pink-500"
                                        >
                                            <Printer className="w-4 h-4" />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        {product.quantity <= 0 ? (
                                            <span className="flex items-center gap-1 text-rose-500 text-xs font-bold">
                                                <X className="w-4 h-4" /> نفذ
                                            </span>
                                        ) : product.quantity <= 5 ? (
                                            <span className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                                                <AlertTriangle className="w-4 h-4" /> منخفض
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                                                <PackageCheck className="w-4 h-4" /> متوفر
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-2 bg-pink-50 dark:bg-pink-900/20 text-pink-500 rounded-lg hover:bg-pink-500 hover:text-white transition-all"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-xl font-bold">{editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">اسم المنتج</label>
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none"
                                    placeholder="مثال: سلسلة دهب"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">باركود المنتج (يدوي أو بالمسح)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.barcode}
                                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                        className="w-full pl-4 pr-12 py-3 bg-pink-50 dark:bg-pink-900/10 border-2 border-pink-100 dark:border-pink-900/30 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-bold"
                                        placeholder="امسح الباركود بالجهاز لتسجيله فوراً"
                                    />
                                    <BarcodeIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">سعر البيع</label>
                                    <input
                                        required
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">سعر الجملة</label>
                                    <input
                                        required
                                        type="number"
                                        value={formData.costPrice}
                                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">الكمية</label>
                                    <input
                                        required
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {!editingProduct && (
                                <div className="p-4 bg-pink-50 dark:bg-pink-900/10 rounded-2xl flex items-center gap-3">
                                    <BarcodeIcon className="w-6 h-6 text-pink-500" />
                                    <p className="text-xs text-pink-600 dark:text-pink-400">سيتم توليد باركود فريد تلقائياً عند الحفظ</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-4 bg-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/20 hover:bg-pink-600 transition-all mt-6"
                            >
                                {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Hidden Barcode for Printing */}
            <div style={{ display: 'none' }}>
                <div ref={printBarcodeRef} className="p-8 text-center flex flex-col items-center">
                    <h3 className="text-xl font-bold mb-2">{barcodeToPrint?.name}</h3>
                    <svg ref={barcodeRef}></svg>
                    <p className="text-lg mt-2 font-bold">{barcodeToPrint?.price} ج.م</p>
                    <div className="mt-4 text-xs text-gray-400 italic">Accessories POS - By Mohamed Tarek</div>
                </div>
            </div>
        </div>
    )
}

export default Products
