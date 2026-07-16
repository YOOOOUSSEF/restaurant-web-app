import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrencyLabel } from "@/lib/utils";
import {
  CreditCard,
  Smartphone,
  Banknote,
  Wallet,
  MapPin,
  Store,
  Utensils,
  Tag,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { isSaudiMobileNumber, normalizeSaudiMobileNumber } from "@/lib/utils";

// ── Visa card helpers ─────────────────────────────────────────
function formatCardNumber(raw: string) {
  return raw
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})/g, "$1 ")
    .trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function detectCardBrand(num: string): "visa" | "mastercard" | "amex" | "unknown" {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "unknown";
}

const BRAND_LABEL: Record<string, string> = {
  visa: "VISA",
  mastercard: "Mastercard",
  amex: "Amex",
  unknown: "",
};

const BRAND_COLOR: Record<string, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  amex: "#007BC1",
  unknown: "#8B7A6E",
};

const paymentIcons: Record<string, React.ReactNode> = {
  mada: <CreditCard size={20} />,
  apple_pay: <Wallet size={20} />,
  stc_pay: <Smartphone size={20} />,
  visa: <CreditCard size={20} />,
  cash: <Banknote size={20} />,
};

const orderTypeIcons: Record<string, React.ReactNode> = {
  delivery: <MapPin size={20} />,
  pickup: <Store size={20} />,
  dine_in: <Utensils size={20} />,
};

interface AppliedCoupon {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  discountAmount: number;
}

export default function CheckoutPage() {
  const { lang, t } = useI18nContext();
  const { cart, subtotal, tax, clearCart } = useCart();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAr = lang === "ar";
  const currencyLabel = getCurrencyLabel(lang);

  const createOrder = trpc.order.create.useMutation();
  const { data: deliveryAreas } = trpc.restaurant.listDeliveryAreas.useQuery();
  const { data: settings } = trpc.restaurant.listSettings.useQuery();

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    deliveryAreaId: "",
    orderType: "delivery" as "delivery" | "pickup" | "dine_in",
    paymentMethod: "mada" as "mada" | "apple_pay" | "stc_pay" | "visa" | "cash",
    notes: "",
  });

  // ── Visa card state ───────────────────────────────────────
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [cvvFlipped, setCvvFlipped] = useState(false);

  const paymentMethodAvailability = useMemo(() => {
    const paymentSettings: Record<string, boolean> = {
      mada: false,
      apple_pay: false,
      stc_pay: false,
      visa: false,
      cash: true,
    };

    settings?.forEach((setting) => {
      switch (setting.key) {
        case "enable_mada":
          paymentSettings.mada = setting.value === "true";
          break;
        case "enable_apple_pay":
          paymentSettings.apple_pay = setting.value === "true";
          break;
        case "enable_stc_pay":
          paymentSettings.stc_pay = setting.value === "true";
          break;
        case "enable_visa":
          paymentSettings.visa = setting.value === "true";
          break;
        case "enable_cash":
          paymentSettings.cash = setting.value === "true";
          break;
      }
    });

    return paymentSettings as Record<
      "mada" | "apple_pay" | "stc_pay" | "visa" | "cash",
      boolean
    >;
  }, [settings]);

  const enabledPaymentMethods = useMemo(
    () => (Object.keys(paymentMethodAvailability) as Array<keyof typeof paymentMethodAvailability>).filter(
      (method) => paymentMethodAvailability[method]
    ),
    [paymentMethodAvailability]
  );

  useEffect(() => {
    if (enabledPaymentMethods.length > 0 && !enabledPaymentMethods.includes(form.paymentMethod)) {
      setForm((prev) => ({ ...prev, paymentMethod: enabledPaymentMethods[0] }));
    }
  }, [enabledPaymentMethods, form.paymentMethod]);

  // Pre-fill from Clerk user
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        customerName: f.customerName || user.name || "",
        customerEmail: f.customerEmail || user.email || "",
      }));
    }
  }, [user]);

  // ── Coupon state ──────────────────────────────────────────
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponStatus, setCouponStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [couponError, setCouponError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [nameError, setNameError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [areaError, setAreaError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formSectionRef = useRef<HTMLDivElement>(null);

  const couponQuery = trpc.customer.validateCoupon.useQuery(
    { code: couponInput.toUpperCase(), orderAmount: subtotal },
    { enabled: false }
  );

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    setCouponStatus("loading");
    setCouponError("");

    try {
      const result = await couponQuery.refetch();
      const data = result.data;

      if (!data) {
        setCouponStatus("invalid");
        setCouponError(isAr ? "كوبون غير صالح" : "Invalid coupon");
        setAppliedCoupon(null);
        return;
      }

      if (!data.valid) {
        setCouponStatus("invalid");
        setCouponError(data.message || (isAr ? "كوبون غير صالح" : "Invalid coupon"));
        setAppliedCoupon(null);
        return;
      }

      const discountAmount =
        data.discountType === "percentage"
          ? subtotal * (parseFloat(data.discountValue!) / 100)
          : parseFloat(data.discountValue!);

      setAppliedCoupon({
        code,
        discountType: data.discountType!,
        discountValue: data.discountValue!,
        discountAmount: Math.min(discountAmount, subtotal),
      });
      setCouponStatus("valid");
    } catch {
      setCouponStatus("invalid");
      setCouponError(isAr ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong, please try again");
      setAppliedCoupon(null);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponStatus("idle");
    setCouponError("");
  }

  const scrollToCheckoutForm = () => {
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // ── Totals ────────────────────────────────────────────────
  const deliveryFee =
    form.orderType === "delivery" && form.deliveryAreaId
      ? parseFloat(
          deliveryAreas?.find((a) => a.id === parseInt(form.deliveryAreaId))?.fee || "0"
        )
      : 0;

  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const total = subtotal + tax + deliveryFee - discountAmount;

  // ── Validate Visa card fields ────────────────────────────
  const validateCardFields = (): boolean => {
    if (form.paymentMethod !== "visa") return true;
    const errs: Record<string, string> = {};
    const rawNum = cardNumber.replace(/\s/g, "");
    if (rawNum.length < 13 || rawNum.length > 19)
      errs.cardNumber = isAr ? "رقم البطاقة غير صالح" : "Invalid card number";
    if (!cardName.trim())
      errs.cardName = isAr ? "اسم حامل البطاقة مطلوب" : "Cardholder name required";
    const [mm, yy] = cardExpiry.split("/");
    const month = parseInt(mm);
    const year = 2000 + parseInt(yy || "0");
    const now = new Date();
    if (!mm || !yy || month < 1 || month > 12 || year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1))
      errs.cardExpiry = isAr ? "تاريخ انتهاء غير صالح" : "Invalid expiry date";
    if (cardCvv.length < 3)
      errs.cardCvv = isAr ? "رمز CVV غير صالح" : "Invalid CVV";
    setCardErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    const resolvedName = form.customerName.trim() || user?.name || "Guest";
    const rawPhone = form.customerPhone.trim();
    const normalizedPhone = normalizeSaudiMobileNumber(rawPhone);
    const resolvedPhone = isSaudiMobileNumber(normalizedPhone) ? normalizedPhone : "";

    const hasName = !!form.customerName.trim();
    const hasAddress = !!form.customerAddress.trim();
    const hasArea = !!form.deliveryAreaId;

    if (!hasName) {
      setNameError(isAr ? "الاسم مطلوب" : "Name is required");
      scrollToCheckoutForm();
      return;
    }
    setNameError("");

    if (enabledPaymentMethods.length === 0) {
      scrollToCheckoutForm();
      return;
    }
    if (!paymentMethodAvailability[form.paymentMethod]) {
      scrollToCheckoutForm();
      return;
    }
    if (form.orderType === "delivery") {
      if (!hasAddress) {
        setAddressError(isAr ? "العنوان مطلوب" : "Address is required");
        scrollToCheckoutForm();
        return;
      }
      setAddressError("");

      if (!hasArea) {
        setAreaError(isAr ? "اختر منطقة التوصيل" : "Select a delivery area");
        scrollToCheckoutForm();
        return;
      }
      setAreaError("");
    }
    if (!resolvedPhone) {
      setPhoneError(isAr ? "رقم الجوال يجب أن يكون بصيغة +966 5X XXX XXXX" : "Phone number must be in the format +966 5X XXX XXXX");
      scrollToCheckoutForm();
      return;
    }
    setPhoneError("");

    if (!validateCardFields()) {
      scrollToCheckoutForm();
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedItems = cart.map((item) => {
        const resolvedItemType = (item as any).itemType ?? ((item as any).offerId ? "offer" : "product");
        const itemCode = (item as any).code?.trim() || (resolvedItemType === "offer" ? `offer-${item.offerId ?? "unknown"}` : `product-${item.productId ?? "unknown"}`);
        const payload: Record<string, unknown> = {
          itemType: resolvedItemType,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions,
          selectedAdditions: item.selectedAdditions,
          notes: item.notes,
          code: itemCode,
        };

        if (resolvedItemType === "product" && item.productId) {
          payload.productId = item.productId;
        } else if (resolvedItemType === "offer" && item.offerId) {
          payload.offerId = item.offerId;
        }

        return payload;
      });

      const result = await createOrder.mutateAsync({
        customerName: resolvedName,
        customerPhone: resolvedPhone,
        customerEmail: form.customerEmail || undefined,
        customerAddress: form.customerAddress || undefined,
        deliveryAreaId: form.deliveryAreaId ? parseInt(form.deliveryAreaId) : undefined,
        orderType: form.orderType,
        paymentMethod: form.paymentMethod,
        items: normalizedItems as any,
        couponCode: appliedCoupon?.code || undefined,
        notes: form.notes || undefined,
      });

      clearCart();
      navigate(`/track?order=${result.orderNumber}`);
    } catch (err) {
      console.error("Order creation failed:", err);
      scrollToCheckoutForm();
      alert(isAr ? "تعذر إنشاء الطلب. جرّب مرة أخرى." : "Unable to place the order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-[#F5F0E8]/50 text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E] focus:border-transparent placeholder:text-[#B0A096]";

  if (cart.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-[#2D2420]">{t.emptyCart}</h2>
        <p className="text-[#8B7A6E] mt-2">{t.continueShopping}</p>
      </div>
    );
  }

  return (
    <motion.div
      ref={formSectionRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <h2 className="text-2xl font-bold text-[#2D2420] mb-6">{t.checkout}</h2>

      {/* ── Customer Info ── */}
      <div className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#2D2420]">{t.customerInfo}</h3>
          {isAuthenticated && user && (
            <span className="text-xs text-[#6B7F3E] bg-[#6B7F3E]/10 px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 size={11} />
              {isAr ? "مسجّل دخول" : "Signed in"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
              {t.fullName} *
            </label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => {
                setForm({ ...form, customerName: e.target.value });
                if (nameError) setNameError("");
              }}
              className={inputCls}
              placeholder="John Doe"
            />
            {nameError ? <p className="mt-1 text-xs text-[#C0392B]">{nameError}</p> : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
              {t.phone} *
            </label>
            <input
              type="tel"
              value={form.customerPhone}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d+ ]/g, "");
                setForm({ ...form, customerPhone: next });
                if (phoneError) setPhoneError("");
              }}
              className={inputCls}
              placeholder="+966 50 000 0000"
              inputMode="tel"
            />
            {phoneError ? (
              <p className="mt-1 text-xs text-[#C0392B]">{phoneError}</p>
            ) : (
              <p className="mt-1 text-xs text-[#8B7A6E]">
                {isAr ? "المدخل يجب أن يطابق: +966 5X XXX XXXX" : "Must match: +966 5X XXX XXXX"}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
              {t.email}
              {isAuthenticated && user?.email && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-[#6B7F3E] font-normal">
                  <CheckCircle2 size={11} />
                  {isAr ? "موثّق" : "Verified"}
                </span>
              )}
            </label>
            <input
              type="email"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
              readOnly={isAuthenticated && !!user?.email}
              className={`${inputCls} ${isAuthenticated && user?.email ? "bg-[#F5F0E8] text-[#8B7A6E] cursor-not-allowed select-none" : ""}`}
              placeholder="email@example.com"
            />
            {isAuthenticated && user?.email && (
              <p className="mt-1 text-xs text-[#8B7A6E]">
                {isAr ? "البريد الإلكتروني مرتبط بحسابك ولا يمكن تغييره." : "This email is linked to your account and cannot be changed."}
              </p>
            )}
          </div>
        </div>

        {form.orderType === "delivery" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
                {t.address} *
              </label>
              <input
                type="text"
                value={form.customerAddress}
                onChange={(e) => {
                  setForm({ ...form, customerAddress: e.target.value });
                  if (addressError) setAddressError("");
                }}
                className={inputCls}
                placeholder="123 Main St"
              />
              {addressError ? <p className="mt-1 text-xs text-[#C0392B]">{addressError}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
                {t.selectArea} *
              </label>
              <select
                value={form.deliveryAreaId}
                onChange={(e) => {
                  setForm({ ...form, deliveryAreaId: e.target.value });
                  if (areaError) setAreaError("");
                }}
                className={inputCls}
              >
                <option value="">{t.selectArea}</option>
                {deliveryAreas?.map((area) => (
                  <option key={area.id} value={area.id}>
                    {lang === "ar" ? area.nameAr : area.nameEn} - {area.fee} {currencyLabel}
                  </option>
                ))}
              </select>
              {areaError ? <p className="mt-1 text-xs text-[#C0392B]">{areaError}</p> : null}
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
            {t.orderNotes}
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={inputCls + " resize-none"}
            rows={2}
            placeholder={isAr ? "أي طلبات خاصة..." : "Any special requests..."}
          />
        </div>
      </div>

      {/* ── Order Type ── */}
      <div className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm mb-5">
        <h3 className="font-semibold text-[#2D2420] mb-4">{t.orderType}</h3>
        <div className="grid grid-cols-3 gap-3">
          {(["delivery", "pickup", "dine_in"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setForm({ ...form, orderType: type })}
              className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                form.orderType === type
                  ? "border-[#C75C2E] bg-[#C75C2E]/5 text-[#C75C2E]"
                  : "border-[#E8DFD3] hover:border-[#D4C8B8] text-[#5C4D44]"
              }`}
            >
              {orderTypeIcons[type]}
              <span className="text-sm font-medium">
                {(t as any)[type] || type}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Payment Method ── */}
      <div className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm mb-5">
        <h3 className="font-semibold text-[#2D2420] mb-4">{t.paymentMethod}</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(["mada", "apple_pay", "stc_pay", "visa", "cash"] as const).map((method) => {
            const isEnabled = paymentMethodAvailability[method];
            return (
              <button
                key={method}
                onClick={() => {
                  if (!isEnabled) return;
                  setForm({ ...form, paymentMethod: method });
                }}
                disabled={!isEnabled}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                  !isEnabled
                    ? "border-[#E8DFD3] bg-[#F3F2F0] text-[#A39D93] cursor-not-allowed"
                    : form.paymentMethod === method
                    ? "border-[#C75C2E] bg-[#C75C2E]/5 text-[#C75C2E]"
                    : "border-[#E8DFD3] hover:border-[#D4C8B8] text-[#5C4D44]"
                }`}
              >
                {paymentIcons[method]}
                <span className="text-xs font-medium uppercase">{method.replace("_", " ")}</span>
              </button>
            );
          })}
        </div>
        {enabledPaymentMethods.length === 0 && (
          <p className="mt-3 text-sm text-[#A39D93]">
            {isAr
              ? "لا توجد طرق دفع متاحة حالياً. يرجى تمكينها من إعدادات المتجر."
              : "No payment methods are currently available. Please enable them in the store settings."}
          </p>
        )}

        {/* ── Visa Card Form ── */}
        <AnimatePresence>
          {form.paymentMethod === "visa" && paymentMethodAvailability.visa && (
            <motion.div
              key="visa-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-5 pt-5 border-t border-[#E8DFD3]">
                {/* Mini card preview */}
                <div
                  className="relative h-36 rounded-2xl mb-5 overflow-hidden shadow-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, #1A1F71 0%, #3b4db8 50%, #6B7AE8 100%)",
                  }}
                >
                  {/* Shimmer */}
                  <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
                  {/* Chip */}
                  <div className="absolute top-5 left-5 w-9 h-6 rounded-md bg-yellow-300/80 border border-yellow-400/60 flex items-center justify-center">
                    <div className="w-5 h-4 rounded-sm border border-yellow-500/60 grid grid-cols-2 gap-px p-0.5">
                      <div className="bg-yellow-500/60 rounded-sm" />
                      <div className="bg-yellow-500/60 rounded-sm" />
                      <div className="bg-yellow-500/60 rounded-sm" />
                      <div className="bg-yellow-500/60 rounded-sm" />
                    </div>
                  </div>
                  {/* Brand */}
                  <div
                    className="absolute top-4 right-5 text-sm font-black tracking-widest"
                    style={{ color: BRAND_COLOR[detectCardBrand(cardNumber)] || "white", textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
                  >
                    {BRAND_LABEL[detectCardBrand(cardNumber)] || "CARD"}
                  </div>
                  {/* Number */}
                  <div className="absolute bottom-9 left-5 right-5 font-mono text-white text-sm tracking-[0.2em] drop-shadow">
                    {cardNumber || "•••• •••• •••• ••••"}
                  </div>
                  {/* Name + Expiry */}
                  <div className="absolute bottom-3 left-5 right-5 flex justify-between items-end">
                    <span className="text-white/80 text-[10px] uppercase tracking-wider truncate max-w-[60%]">
                      {cardName || (isAr ? "اسم حامل البطاقة" : "CARDHOLDER NAME")}
                    </span>
                    <span className="text-white/80 text-[10px] font-mono">
                      {cardExpiry || "MM/YY"}
                    </span>
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-3">
                  {/* Card Number */}
                  <div>
                    <label className="block text-sm font-medium text-[#5C4D44] mb-1.5 flex items-center gap-1.5">
                      <CreditCard size={14} className="text-[#C75C2E]" />
                      {isAr ? "رقم البطاقة" : "Card Number"}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => {
                        setCardNumber(formatCardNumber(e.target.value));
                        if (cardErrors.cardNumber) setCardErrors((p) => ({ ...p, cardNumber: "" }));
                      }}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className={`${inputCls} font-mono tracking-wider ${
                        cardErrors.cardNumber ? "border-red-300 bg-red-50" : ""
                      }`}
                      dir="ltr"
                    />
                    {cardErrors.cardNumber && (
                      <p className="mt-1 text-xs text-[#C0392B]">{cardErrors.cardNumber}</p>
                    )}
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
                      {isAr ? "اسم حامل البطاقة" : "Cardholder Name"}
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => {
                        setCardName(e.target.value.toUpperCase());
                        if (cardErrors.cardName) setCardErrors((p) => ({ ...p, cardName: "" }));
                      }}
                      placeholder={isAr ? "الاسم كما هو على البطاقة" : "NAME AS ON CARD"}
                      className={`${inputCls} uppercase ${
                        cardErrors.cardName ? "border-red-300 bg-red-50" : ""
                      }`}
                    />
                    {cardErrors.cardName && (
                      <p className="mt-1 text-xs text-[#C0392B]">{cardErrors.cardName}</p>
                    )}
                  </div>

                  {/* Expiry + CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
                        {isAr ? "تاريخ الانتهاء" : "Expiry Date"}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cardExpiry}
                        onChange={(e) => {
                          setCardExpiry(formatExpiry(e.target.value));
                          if (cardErrors.cardExpiry) setCardErrors((p) => ({ ...p, cardExpiry: "" }));
                        }}
                        placeholder="MM/YY"
                        maxLength={5}
                        className={`${inputCls} font-mono ${
                          cardErrors.cardExpiry ? "border-red-300 bg-red-50" : ""
                        }`}
                        dir="ltr"
                      />
                      {cardErrors.cardExpiry && (
                        <p className="mt-1 text-xs text-[#C0392B]">{cardErrors.cardExpiry}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#5C4D44] mb-1.5 flex items-center gap-1">
                        {isAr ? "رمز CVV" : "CVV"}
                        <Lock size={11} className="text-[#8B7A6E]" />
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={cardCvv}
                        onChange={(e) => {
                          setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4));
                          if (cardErrors.cardCvv) setCardErrors((p) => ({ ...p, cardCvv: "" }));
                        }}
                        onFocus={() => setCvvFlipped(true)}
                        onBlur={() => setCvvFlipped(false)}
                        placeholder="•••"
                        maxLength={4}
                        className={`${inputCls} font-mono ${
                          cardErrors.cardCvv ? "border-red-300 bg-red-50" : ""
                        }`}
                        dir="ltr"
                      />
                      {cardErrors.cardCvv && (
                        <p className="mt-1 text-xs text-[#C0392B]">{cardErrors.cardCvv}</p>
                      )}
                    </div>
                  </div>

                  {/* Security note */}
                  <div className="flex items-center gap-2 text-[11px] text-[#8B7A6E] mt-1">
                    <ShieldCheck size={13} className="text-[#6B7F3E] shrink-0" />
                    {isAr
                      ? "بياناتك محمية ومشفرة بالكامل — لا يتم حفظ معلومات بطاقتك"
                      : "Your data is fully encrypted & secure — card info is never stored"}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Coupon ── */}
      <div className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm mb-5">
        <h3 className="font-semibold text-[#2D2420] mb-4 flex items-center gap-2">
          <Tag size={16} className="text-[#C75C2E]" />
          {t.couponCode}
        </h3>

        <AnimatePresence mode="wait">
          {appliedCoupon ? (
            // Applied state
            <motion.div
              key="applied"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-between bg-[#6B7F3E]/10 border border-[#6B7F3E]/30 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#6B7F3E]" />
                <div>
                  <p className="font-bold text-[#2D2420] font-mono">{appliedCoupon.code}</p>
                  <p className="text-xs text-[#6B7F3E]">
                    {appliedCoupon.discountType === "percentage"
                      ? `${appliedCoupon.discountValue}% ${isAr ? "خصم" : "off"}`
                      : `${appliedCoupon.discountValue} ${currencyLabel} ${isAr ? "خصم" : "off"}`}
                    {" — "}
                    {isAr ? "وفّرت" : "Saving"} {appliedCoupon.discountAmount.toFixed(2)} {currencyLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveCoupon}
                className="text-[#8B7A6E] hover:text-red-500 transition-colors p-1"
              >
                <XCircle size={18} />
              </button>
            </motion.div>
          ) : (
            // Input state
            <motion.div
              key="input"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    if (couponStatus !== "idle") {
                      setCouponStatus("idle");
                      setCouponError("");
                    }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  className={`flex-1 px-4 py-2.5 rounded-lg border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#C75C2E] focus:border-transparent placeholder:font-sans placeholder:text-[#B0A096] ${
                    couponStatus === "invalid"
                      ? "border-red-300 bg-red-50"
                      : "border-[#D4C8B8] bg-[#F5F0E8]/50"
                  } text-[#2D2420]`}
                  placeholder="WELCOME10"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={!couponInput.trim() || couponStatus === "loading"}
                  className="px-5 py-2.5 bg-[#C75C2E] text-white rounded-lg text-sm font-semibold hover:bg-[#A84A22] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {couponStatus === "loading" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : null}
                  {t.apply}
                </button>
              </div>
              {couponStatus === "invalid" && couponError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-xs mt-1.5 flex items-center gap-1"
                >
                  <XCircle size={12} />
                  {couponError}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Order Summary & Place Order ── */}
      <div className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm mb-5">
        <h3 className="font-semibold text-[#2D2420] mb-4">
          {isAr ? "ملخص الطلب" : "Order Summary"}
        </h3>
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-[#5C4D44]">{t.subtotal}</span>
            <span>{subtotal.toFixed(2)} {currencyLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5C4D44]">{t.tax}</span>
            <span>{tax.toFixed(2)} {currencyLabel}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between">
              <span className="text-[#5C4D44]">{t.deliveryFee}</span>
              <span>{deliveryFee.toFixed(2)} {currencyLabel}</span>
            </div>
          )}
          <AnimatePresence>
            {discountAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-between text-[#6B7F3E] font-medium"
              >
                <span className="flex items-center gap-1">
                  <Tag size={13} />
                  {t.discount} ({appliedCoupon?.code})
                </span>
                <span>-{discountAmount.toFixed(2)} {currencyLabel}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="border-t border-[#E8DFD3] pt-2 flex justify-between font-bold text-lg">
            <span>{t.total}</span>
            <span className="text-[#C75C2E]">{total.toFixed(2)} {currencyLabel}</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            enabledPaymentMethods.length === 0 ||
            !paymentMethodAvailability[form.paymentMethod]
          }
          className="w-full py-4 bg-[#C75C2E] text-white rounded-full font-bold text-lg hover:bg-[#A84A22] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 size={20} className="animate-spin" />}
          {isSubmitting ? t.loading : t.placeOrder}
        </button>

        {!isAuthenticated && (
          <p className="text-center text-xs text-[#8B7A6E] mt-3">
            {isAr
              ? "سجّل دخولك لتتبع طلباتك وكسب نقاط الولاء"
              : "Sign in to track your orders and earn loyalty points"}{" "}
            <a href="/sign-in?redirect=/checkout" className="text-[#C75C2E] font-medium hover:underline">
              {isAr ? "تسجيل الدخول" : "Sign in"}
            </a>
          </p>
        )}
      </div>
    </motion.div>
  );
}
