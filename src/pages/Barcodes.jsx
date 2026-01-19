import { useState, useEffect, useRef } from 'react'
import { db } from '../utils/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { toast } from 'sonner'
import { Search, Printer, Barcode as BarcodeIcon, Loader2, ArrowRight } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import { useReactToPrint } from 'react-to-print'

const Barcodes = () => {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const printRef = useRef(null)

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const q = query(collection(db, "products"), orderBy("name", "asc"));
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

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Component to render individual barcode item
    const BarcodeItem = ({ product }) => {
        const barcodeRef = useRef(null);

        useEffect(() => {
            if (barcodeRef.current) {
                JsBarcode(barcodeRef.current, product.barcode, {
                    format: "CODE128",
                    width: 1.5,
                    height: 50,
                    displayValue: true,
                    fontSize: 14,
                    margin: 0
                });
            }
        }, [product]);

        return (
            <div className="flex flex-col items-center p-2 border border-gray-100 rounded-lg bg-white break-inside-avoid mb-4">
                <span className="text-[10px] font-bold text-center mb-1 max-w-[150px] truncate">{product.name}</span>
                <svg ref={barcodeRef} className="max-w-full"></svg>
                <span className="text-xs font-bold mt-1">{product.price} ج.م</span>
            </div>
        );
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">طباعة الباركود</h1>
                    <p className="text-gray-500 dark:text-gray-400">تجهيز ملصقات الباركود لكل المنتجات</p>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
                >
                    <Printer className="w-5 h-5" />
                    طباعة الملصقات ({filteredProducts.length})
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-xl">
                <input
                    type="text"
                    placeholder="بحث عن منتج معين للطباعة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-12 py-4 bg-white dark:bg-gray-800 border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            {/* Preview Grid */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="mb-6 flex items-center justify-between border-b pb-4">
                    <h2 className="text-lg font-bold">معاينة قبل الطباعة</h2>
                    <p className="text-sm text-gray-500 italic">سيتم ترتيب الملصقات تلقائياً لتناسب الورقة</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <p className="text-gray-500">جاري تحميل المنتجات...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">لا توجد منتجات مطابقة للبحث</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="opacity-80 scale-95 origin-top-right">
                                <BarcodeItem product={product} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Print Only Area (Hidden) */}
            <div style={{ display: 'none' }}>
                <div ref={printRef} className="print-area p-4" dir="rtl">
                    <style>{`
                        @media print {
                            .print-area {
                                display: block !important;
                                padding: 0 !important;
                            }
                            @page {
                                size: A4;
                                margin: 10mm;
                            }
                            .barcode-grid {
                                display: grid;
                                grid-template-cols: repeat(4, 1fr);
                                gap: 10px;
                            }
                            .barcode-card {
                                border: 1px solid #eee;
                                padding: 10px;
                                text-align: center;
                                page-break-inside: avoid;
                                height: 120px;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                align-items: center;
                            }
                        }
                    `}</style>
                    <div className="barcode-grid">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="barcode-card">
                                <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', maxWidth: '160px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {product.name}
                                </div>
                                <PrintableBarcode value={product.barcode} />
                                <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>
                                    {product.price} ج.م
                                </div>
                                <div style={{ fontSize: '7px', color: '#999', marginTop: '2px' }}>فيونكه POS</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Helper component for printing without hooks conflict
const PrintableBarcode = ({ value }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            JsBarcode(ref.current, value, {
                format: "CODE128",
                width: 1.2,
                height: 40,
                displayValue: true,
                fontSize: 12,
                margin: 0
            });
        }
    }, [value]);
    return <svg ref={ref}></svg>;
}

export default Barcodes
