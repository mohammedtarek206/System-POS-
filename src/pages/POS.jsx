import { useState, useEffect, useRef } from 'react'
import { db } from '../utils/firebase'
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    increment,
    serverTimestamp
} from 'firebase/firestore'
import { toast } from 'sonner'
import {
    Search,
    Barcode as BarcodeIcon,
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    Printer,
    ChevronLeft,
    X,
    Camera,
    CameraOff
} from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import confetti from 'canvas-confetti'
import { Html5QrcodeScanner } from 'html5-qrcode'

const POS = () => {
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [barcodeInput, setBarcodeInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [showInvoice, setShowInvoice] = useState(false)
    const [lastInvoice, setLastInvoice] = useState(null)

    const invoiceRef = useRef(null)
    const barcodeInputRef = useRef(null)

    useEffect(() => {
        fetchProducts()

        // Core Barcode Scanning Logic for Datalogic & 2D Scanners (USB Keyboard Emulation)
        let buffer = '';
        let lastKeyTime = Date.now();

        const handleGlobalKeyDown = (e) => {
            // Ignore events from input/textarea to avoid double processing if focused
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.target.placeholder !== "امسح الباركود هنا...") return;
            }

            const currentTime = Date.now();

            // Hardware scanners (1D/2D) send characters very fast (< 20-50ms)
            // 100ms is a safe window even for 2D scanners with long data
            if (currentTime - lastKeyTime > 100) {
                buffer = '';
            }

            if (e.key === 'Enter') {
                if (buffer.length > 1) {
                    processBarcode(buffer.trim());
                    buffer = '';
                    e.preventDefault();
                }
            } else if (e.key.length === 1) {
                buffer += e.key;
            }

            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [products])

    const processBarcode = (code) => {
        // 1. Basic cleaning (remove non-printable controls)
        const cleanCode = code.replace(/[^\x20-\x7E]/g, '').trim();

        // 2. Try Exact Match
        let product = products.find(p => p.barcode === cleanCode);

        // 3. Fallback: Robust/Fuzzy Match (Ignore layout/GS1 artifacts)
        // This handles cases like "(093)0-{{}" by stripping everything but digits and letters
        if (!product) {
            const ultraClean = (str) => str.replace(/[^a-zA-Z0-9]/g, '');
            const searchCode = ultraClean(cleanCode);

            if (searchCode.length > 0) {
                product = products.find(p => ultraClean(p.barcode) === searchCode);
            }
        }

        if (product) {
            if (product.quantity <= 0) {
                toast.error(`المنتج "${product.name}" غير متوفر في المخزن`);
                return;
            }
            addToCart(product);
            toast.success(`تم العثور على: ${product.name}`);
        } else {
            toast.error(`الباركود (${cleanCode}) غير مسجل في النظام`);
        }
    }

    const fetchProducts = async () => {
        const querySnapshot = await getDocs(collection(db, "products"));
        setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }

    // Manual Barcode Submit (Alternative to automatic scan)
    const handleBarcodeSubmit = (e) => {
        if (e.key === 'Enter') {
            processBarcode(barcodeInput);
            setBarcodeInput('');
        }
    }

    const addToCart = (product) => {
        if (product.quantity <= 0) {
            toast.error('هذا المنتج غير متوفر في المخزن');
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                if (existing.cartQuantity >= product.quantity) {
                    toast.warning('تم الوصول لأقصى كمية متاحة');
                    return prev;
                }
                return prev.map(item =>
                    item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
                );
            }
            return [...prev, { ...product, cartQuantity: 1 }];
        });

        // Smooth scroll to cart bottom on mobile if needed
        toast.success(`تم إضافة ${product.name}`);
    }

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    }

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.cartQuantity + delta;
                if (newQty > item.quantity) {
                    toast.warning('الكمية المطلوبة غير متوفرة');
                    return item;
                }
                if (newQty < 1) return item;
                return { ...item, cartQuantity: newQty };
            }
            return item;
        }));
    }

    const updatePrice = (id, newPrice) => {
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, price: Number(newPrice) } : item
        ));
    }

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);

        try {
            const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
            const invoiceData = {
                invoiceNumber,
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    costPrice: item.costPrice || 0,
                    quantity: item.cartQuantity,
                    total: item.price * item.cartQuantity
                })),
                total: totalPrice,
                itemCount: cart.reduce((sum, i) => sum + i.cartQuantity, 0),
                createdAt: serverTimestamp(),
            };

            // 1. Save Invoice
            await addDoc(collection(db, "invoices"), invoiceData);

            // 2. Update Inventory
            for (const item of cart) {
                const productRef = doc(db, "products", item.id);
                await updateDoc(productRef, {
                    quantity: increment(-item.cartQuantity),
                    sold: increment(item.cartQuantity)
                });
            }

            setLastInvoice(invoiceData);
            setCart([]);
            setShowInvoice(true);
            fetchProducts(); // Refresh local list
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ec4899', '#f472b6', '#db2777']
            });
        } catch (error) {
            console.error("Checkout Error:", error);
            toast.error(`حدث خطأ أثناء إتمام البيع: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    const handlePrint = useReactToPrint({
        content: () => invoiceRef.current,
        onAfterPrint: () => setShowInvoice(false),
    });

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter(p => p.quantity > 0);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)]" dir="rtl">
            {/* Products Section */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative md:col-span-1">
                        <input
                            ref={barcodeInputRef}
                            type="text"
                            placeholder="امسح الباركود هنا..."
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            onKeyDown={handleBarcodeSubmit}
                            className="w-full pl-4 pr-12 py-4 bg-pink-500/10 border-2 border-pink-500 rounded-2xl focus:ring-4 focus:ring-pink-500/20 outline-none font-bold text-pink-700 dark:text-pink-300"
                        />
                        <BarcodeIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-pink-500" />
                    </div>
                    <div className="relative md:col-span-1">
                        <input
                            type="text"
                            placeholder="بحث باسم المنتج..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-4 pr-12 py-4 bg-white dark:bg-gray-800 border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-pink-500 outline-none"
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-2xl md:col-span-1 shadow-inner">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">نظام DataLogic متصل وجاهز ✅</span>
                    </div>
                </div>


                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                    {filteredProducts.map(product => (
                        <button
                            key={product.id}
                            onClick={() => addToCart(product)}
                            className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all text-right border-2 border-transparent hover:border-pink-400 dark:hover:border-pink-600 group flex flex-col justify-between h-full"
                        >
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <span className={`text-[10px] px-3 py-1 rounded-full font-black ${product.quantity <= 5 ? 'bg-amber-100 text-amber-600' : 'bg-pink-100 text-pink-600'
                                        }`}>
                                        متاح: {product.quantity}
                                    </span>
                                    <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-xl group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="font-black text-gray-900 dark:text-white text-lg leading-tight">{product.name}</h3>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold mb-1">الباركود</p>
                                    <p className="text-xs font-mono text-gray-500">{product.barcode}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] text-gray-400 font-bold mb-1">سعر الجملة</p>
                                    <p className="text-sm font-black text-amber-500">{product.costPrice || 0} ج.م</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Cart Section */}
            <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-pink-50/50 dark:bg-pink-900/10">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-pink-500" />
                        <h2 className="font-bold">سلة المشتريات</h2>
                    </div>
                    <span className="bg-pink-500 text-white text-xs px-2 py-1 rounded-lg">
                        {cart.length} أصناف
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 space-y-2">
                            <ShoppingCart className="w-12 h-12" />
                            <p className="text-sm font-medium">السلة فارغة</p>
                        </div>
                    ) : cart.map(item => (
                        <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-[24px] border border-gray-100 dark:border-gray-800 animate-in slide-in-from-right duration-200">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-black text-sm leading-snug flex-1 pl-4">{item.name}</h4>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 items-end">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] text-gray-400 font-black">سعر البيع</p>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={item.price || ''}
                                            onChange={(e) => updatePrice(item.id, e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-800 border-2 border-pink-100 dark:border-pink-900/30 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-black text-sm text-pink-600"
                                            placeholder="0.00"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">ج.م</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[10px] text-gray-400 font-black">الكمية</p>
                                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-1">
                                        <button
                                            onClick={() => updateQuantity(item.id, 1)}
                                            className="p-1 hover:text-pink-500"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                        <span className="px-2 font-black text-xs">{item.cartQuantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, -1)}
                                            className="p-1 hover:text-pink-500"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <span className="text-[10px] text-gray-400 font-bold italic">جملة: {item.costPrice} ج.م</span>
                                <div className="text-left">
                                    <p className="font-black text-sm text-pink-600">{item.price * item.cartQuantity} ج.م</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-500 dark:text-gray-400 font-bold">الإجمالي النهائي</span>
                        <span className="text-3xl font-black text-pink-600 dark:text-pink-400">{totalPrice} <small className="text-sm">ج.م</small></span>
                    </div>
                    <button
                        disabled={cart.length === 0 || loading}
                        onClick={handleCheckout}
                        className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 hover:shadow-pink-500/50 transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <CreditCard className="w-5 h-5" />
                                إتمام البيع وطباعة الفاتورة
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Invoice Modal Overlay */}
            {showInvoice && lastInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    {/* Inject Print Styles */}
                    <style>
                        {`
                                    @media print {
                                        @page { 
                                            margin: 0; 
                                            size: 80mm auto;
                                        }
                                        body { 
                                            margin: 0; 
                                            padding: 0;
                                            -webkit-print-color-adjust: exact;
                                        }
                                        .print-container {
                                            width: 100% !important;
                                            padding: 8mm !important;
                                            margin: 0 !important;
                                        }
                                        .no-print { display: none !important; }
                                    }
                                `}
                    </style>

                    <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden p-8 animate-in zoom-in duration-300 relative">
                        <button
                            onClick={() => setShowInvoice(false)}
                            className="absolute top-6 left-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full no-print"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Template for Screen Preview and Printing */}
                        <div ref={invoiceRef} className="print-container text-center font-sans" dir="rtl">
                            {/* Header Section */}
                            <div className="mb-8 space-y-2">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-pink-500 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-3">
                                        <span className="text-3xl font-black">🎀</span>
                                    </div>
                                </div>
                                <h2 className="text-3xl font-black tracking-tighter text-gray-900">فيونكه - Fyooonka</h2>
                                <div className="flex justify-center flex-col items-center gap-1">
                                    <p className="text-[10px] text-pink-600 uppercase tracking-[0.3em] font-black">Premium Jewelry Boutique</p>
                                    <div className="w-12 h-0.5 bg-pink-200"></div>
                                </div>
                            </div>

                            <div className="border-y border-dashed border-gray-200 py-3 my-4 space-y-1.5 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">رقم الفاتورة:</span>
                                    <span className="font-bold text-gray-700">{lastInvoice.invoiceNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">التاريخ والوقت:</span>
                                    <span className="font-bold text-gray-700">{new Date().toLocaleString('ar-EG')}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                {lastInvoice.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start text-[11px]">
                                        <div className="text-right">
                                            <p className="font-bold text-gray-800">{item.name}</p>
                                            <p className="text-[9px] text-gray-400">{item.quantity} قطعة × {item.price} ج.م</p>
                                        </div>
                                        <span className="font-bold text-gray-800">{item.total} ج.م</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-pink-50/50 p-4 rounded-2xl mb-8 border border-pink-100/50">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-600">المطلوب سداده</span>
                                    <span className="text-2xl font-black text-pink-600">{lastInvoice.total} <small className="text-xs">ج.م</small></span>
                                </div>
                            </div>

                            {/* Footer Section */}
                            <div className="space-y-6">
                                <div className="text-center space-y-3">
                                    <p className="text-[11px] font-black text-pink-600 tracking-wide">شكرًا لزيارتكم لفيونكه!</p>
                                    <div className="flex justify-center items-center gap-2 text-[10px] text-gray-700 font-black bg-pink-50 py-2.5 px-4 rounded-2xl border border-pink-100">
                                        <span>🏪</span>
                                        <span>تواصل معنا: 01276939225</span>
                                    </div>
                                </div>

                                <div className="flex justify-center items-center gap-3 py-2 no-print">
                                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gray-200"></div>
                                    <span className="text-[10px] text-gray-300">🎀</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gray-200"></div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handlePrint}
                            className="w-full mt-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl shadow-xl shadow-pink-500/30 hover:shadow-pink-500/50 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3 no-print"
                        >
                            <Printer className="w-5 h-5" />
                            <span className="text-lg">طباعة الآن</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default POS
