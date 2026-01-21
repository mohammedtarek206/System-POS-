import { useState, useEffect, useRef } from 'react'
import { db } from '../utils/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { toast } from 'sonner'
import { Search, Printer, Barcode as BarcodeIcon, Loader2, QrCode } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import { useReactToPrint } from 'react-to-print'
import { QRCodeSVG } from 'qrcode.react'

const Barcodes = () => {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isQRMode, setIsQRMode] = useState(false)
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
            if (!isQRMode && barcodeRef.current) {
                JsBarcode(barcodeRef.current, product.barcode, {
                    format: "CODE128",
                    width: 1.5,
                    height: 50,
                    displayValue: true,
                    fontSize: 14,
                    margin: 0
                });
            }
        }, [product, isQRMode]);

        return (
            <div className="flex flex-col items-center p-3 border border-gray-100 rounded-2xl bg-white break-inside-avoid mb-4 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-[10px] font-bold text-center mb-2 max-w-[150px] truncate text-gray-600">{product.name}</span>
                {isQRMode ? (
                    <QRCodeSVG
                        value={product.barcode}
                        size={80}
                        level="H"
                        includeMargin={false}
                    />
                ) : (
                    <svg ref={barcodeRef} className="max-w-full"></svg>
                )}
                <span className="text-xs font-black mt-2 text-indigo-600">{product.price} ج.م</span>
            </div>
        );
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">طباعة الباركود</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">تجهيز ملصقات الباركود وQR لكل المنتجات</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl">
                        <button
                            onClick={() => setIsQRMode(false)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${!isQRMode ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-500'}`}
                        >
                            <BarcodeIcon className="w-4 h-4" />
                            <span className="text-sm font-bold">بار كود 1D</span>
                        </button>
                        <button
                            onClick={() => setIsQRMode(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isQRMode ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-500'}`}
                        >
                            <QrCode className="w-4 h-4" />
                            <span className="text-sm font-bold">QR كود 2D</span>
                        </button>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transform hover:-translate-y-0.5 transition-all"
                    >
                        <Printer className="w-5 h-5" />
                        طباعة ({filteredProducts.length})
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-xl">
                <input
                    type="text"
                    placeholder="بحث عن منتج معين للطباعة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-12 py-4 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl shadow-sm outline-none transition-all font-bold"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            </div>

            {/* Preview Grid */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="mb-8 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            {isQRMode ? <QrCode className="w-5 h-5 text-indigo-600" /> : <BarcodeIcon className="w-5 h-5 text-indigo-600" />}
                        </div>
                        <h2 className="text-xl font-black">معاينة قبل الطباعة</h2>
                    </div>
                    <p className="text-sm text-gray-500 font-bold">سيتم ترتيب الملصقات تلقائياً لتناسب الورقة</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-indigo-600">POS</div>
                        </div>
                        <p className="text-gray-500 font-bold">جاري تحميل المنتجات...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 font-bold">لا توجد منتجات مطابقة للبحث</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="animate-in fade-in zoom-in duration-300">
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
                                gap: 15px;
                                text-align: center;
                            }
                            .barcode-card {
                                border: 1px solid #eee;
                                padding: 12px;
                                text-align: center;
                                page-break-inside: avoid;
                                min-height: 140px;
                                display: flex;
                                flex-direction: column;
                                justify-content: space-between;
                                align-items: center;
                                border-radius: 8px;
                            }
                        }
                    `}</style>
                    <div className="barcode-grid">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="barcode-card">
                                <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', maxWidth: '160px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {product.name}
                                </div>
                                {isQRMode ? (
                                    <QRCodeSVG value={product.barcode} size={65} />
                                ) : (
                                    <PrintableBarcode value={product.barcode} />
                                )}
                                <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '8px' }}>
                                    {product.price} ج.م
                                </div>
                                <div style={{ fontSize: '7px', color: '#999', marginTop: '4px' }}>فيونكه POS</div>
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
