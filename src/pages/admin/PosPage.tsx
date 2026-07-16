import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import { motion } from "framer-motion";
import { Plus, Minus, Trash2, Receipt, Printer } from "lucide-react";
import { isSaudiMobileNumber, normalizeSaudiMobileNumber } from "@/lib/utils";
import { printBill, type BillData } from "@/components/BillPrint";

interface PosItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export default function PosPage() {
  const { lang, t } = useI18nContext();
  const [cart, setCart] = useState<PosItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [lastBillData, setLastBillData] = useState<BillData | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const utils = trpc.useUtils();

  const { data: categories } = trpc.menu.listCategories.useQuery();
  const { data: products } = trpc.menu.listProducts.useQuery();
  const { data: profile } = trpc.restaurant.getProfile.useQuery();
  trpc.restaurant.listTables.useQuery(); // available for table selection
  const createOrder = trpc.order.create.useMutation();
  const updateStatus = trpc.order.updateStatus.useMutation();

  const filteredProducts = activeCategory
    ? products?.filter((p) => p.categoryId === activeCategory)
    : products;

  const addToCart = (product: any) => {
    setLastOrderNumber(null);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId: product.id, name: product.nameEn, price: parseFloat(product.basePrice), quantity: 1 }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxRate = profile?.taxRate ? parseFloat(String(profile.taxRate)) / 100 : 0.15;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const getProductName = (p: any) => (lang === "ar" ? p.nameAr : p.nameEn);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      setPhoneError(lang === "ar" ? "من فضلك أدخل الاسم ورقم الهاتف" : "Please enter customer name and phone");
      return;
    }

    const normalizedPhone = normalizeSaudiMobileNumber(customerPhone);
    if (!isSaudiMobileNumber(normalizedPhone)) {
      setPhoneError(lang === "ar" ? "رقم الجوال يجب أن يكون بصيغة +966 5X XXX XXXX" : "Phone number must be in the format +966 5X XXX XXXX");
      return;
    }
    setPhoneError("");

    setIsCompleting(true);
    try {
      const result = await createOrder.mutateAsync({
        customerName: customerName.trim(),
        customerPhone: normalizedPhone,
        customerEmail: undefined,
        customerAddress: undefined,
        deliveryAreaId: undefined,
        orderType: "dine_in",
        paymentMethod: "cash",
        items: cart.map((item) => ({
          itemType: "product",
          productId: item.productId,
          offerId: undefined,
          quantity: item.quantity,
          selectedOptions: undefined,
          selectedAdditions: undefined,
          notes: undefined,
        })),
        notes: lang === "ar" ? "بيع كاشير" : "POS sale",
      });

      await updateStatus.mutateAsync({ id: Number(result.orderId), status: "completed" });

      // Build bill data for printing
      const bill: BillData = {
        orderNumber: result.orderNumber,
        orderType: "dine_in",
        customerName: customerName.trim(),
        customerPhone: normalizedPhone,
        paymentMethod: "cash",
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
        })),
        subtotal,
        tax,
        taxRate: profile?.taxRate ? parseFloat(String(profile.taxRate)) : 15,
        total,
        restaurantName: profile?.nameEn || undefined,
        restaurantNameAr: profile?.nameAr || undefined,
        restaurantCity: profile?.city || undefined,
        restaurantPhone: profile?.phone || undefined,
        restaurantEmail: profile?.email || undefined,
        createdAt: new Date().toISOString(),
        lang: lang as "en" | "ar",
      };

      setLastBillData(bill);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setPhoneError("");
      setLastOrderNumber(result.orderNumber);
      void utils.order.list.invalidate();
      void utils.dashboard.getStats.invalidate();

      // Auto-print receipt
      printBill(bill);
    } catch (err) {
      console.error("POS sale failed", err);
      alert(lang === "ar" ? "فشلت عملية البيع" : "Sale failed — check console");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2D2420] mb-4">{t.pos}</h1>

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Left - Products */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Category Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === null ? "bg-[#C75C2E] text-white" : "bg-white text-[#5C4D44] border border-[#D4C8B8]"
              }`}
            >
              {t.all}
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id ? "bg-[#C75C2E] text-white" : "bg-white text-[#5C4D44] border border-[#D4C8B8]"
                }`}
              >
                {getProductName(cat)}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto flex-1 content-start">
            {filteredProducts?.map((product) => (
              <motion.button
                key={product.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => addToCart(product)}
                className="bg-white rounded-xl p-3 border border-[#E8DFD3] shadow-sm hover:shadow-md transition-all text-left"
              >
                <img
                  src={product.imageUrl || "/burger-classic.jpg"}
                  alt={product.nameEn}
                  className="w-full aspect-[4/3] object-cover rounded-lg mb-2"
                />
                <p className="text-sm font-medium text-[#2D2420] truncate">{getProductName(product)}</p>
                <p className="text-sm font-bold text-[#C75C2E]">{parseFloat(product.basePrice).toFixed(2)} SAR</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Right - Order Panel */}
        <div className="w-80 bg-white rounded-xl border border-[#E8DFD3] shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#E8DFD3]">
            <h3 className="font-semibold text-[#2D2420]">{lang === "ar" ? "الطلب الحالي" : "Current Order"}</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 && (
              <div className="text-center py-8 text-[#8B7A6E] text-sm">
                {lang === "ar" ? "اضغط على منتج لإضافته" : "Tap a product to add"}
              </div>
            )}
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-medium truncate">{item.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 rounded bg-[#F5F0E8] flex items-center justify-center hover:bg-[#E8DFD3]">
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 rounded bg-[#F5F0E8] flex items-center justify-center hover:bg-[#E8DFD3]">
                    <Plus size={12} />
                  </button>
                </div>
                <span className="w-16 text-right font-medium">{(item.price * item.quantity).toFixed(2)}</span>
                <button onClick={() => removeFromCart(item.productId)} className="text-[#C0392B] hover:bg-red-50 p-1 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="p-4 border-t border-[#E8DFD3] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5C4D44]">{t.subtotal}</span>
              <span>{subtotal.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5C4D44]">{t.tax}</span>
              <span>{tax.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-[#F5F0E8] pt-2">
              <span>{t.total}</span>
              <span className="text-[#C75C2E]">{total.toFixed(2)} SAR</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="p-4 border-t border-[#E8DFD3] space-y-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={lang === "ar" ? "اسم العميل" : "Customer name"}
              className="w-full px-3 py-2 rounded-lg border border-[#D4C8B8] text-sm focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value.replace(/[^\d+ ]/g, ""));
                if (phoneError) setPhoneError("");
              }}
              placeholder={lang === "ar" ? "+966 5xx xxx xxxx" : "+966 5xx xxx xxxx"}
              className="w-full px-3 py-2 rounded-lg border border-[#D4C8B8] text-sm focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
              inputMode="tel"
            />
            {phoneError ? <p className="mt-1 text-xs text-[#C0392B]">{phoneError}</p> : null}
          </div>

          {/* Payment */}
          <div className="p-4 border-t border-[#E8DFD3] space-y-2">
            {lastOrderNumber && (
              <div className="rounded-lg border border-[#6B7F3E]/20 bg-[#6B7F3E]/10 px-3 py-2 text-sm text-[#6B7F3E] flex items-center justify-between gap-2">
                <span>{lang === "ar" ? "تم إكمال الطلب" : "Order completed"}: {lastOrderNumber}</span>
                {lastBillData && (
                  <button
                    onClick={() => printBill(lastBillData)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#6B7F3E] text-white text-xs font-medium hover:bg-[#5A6C34] transition-colors"
                    title={lang === "ar" ? "طباعة الفاتورة" : "Print receipt"}
                  >
                    <Printer size={12} />
                    {lang === "ar" ? "طباعة" : "Print"}
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => { void handleCompleteSale(); }}
              disabled={cart.length === 0 || isCompleting}
              className="w-full py-3 bg-[#C75C2E] text-white rounded-full font-semibold hover:bg-[#A84A22] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Receipt size={16} />
              {isCompleting
                ? (lang === "ar" ? "جاري الإكمال..." : "Completing...")
                : (lang === "ar" ? "إتمام البيع" : "Complete Sale")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
