import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import { useAuth } from "@/hooks/useAuth";
import StatusBadge from "@/components/StatusBadge";
import OrderStatusToast from "@/components/OrderStatusToast";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrencyLabel, isSaudiMobileNumber, normalizeSaudiMobileNumber } from "@/lib/utils";
import {
  useOrderStatusChange,
  requestNotificationPermission,
  type StatusNotification,
} from "@/hooks/useOrderNotifications";
import { useNotifications } from "@/providers/NotificationContext";
import {
  Search,
  Clock,
  Package,
  ChefHat,
  CheckCircle,
  Truck,
  Home,
  XCircle,
  Star,
  MessageSquare,
  Send,
  ThumbsUp,
  Phone,
  ListOrdered,
  ArrowRight,
  Bell,
  BellOff,
} from "lucide-react";

const statusSteps = [
  { key: "new", icon: <Package size={20} /> },
  { key: "accepted", icon: <CheckCircle size={20} /> },
  { key: "preparing", icon: <ChefHat size={20} /> },
  { key: "ready", icon: <CheckCircle size={20} /> },
  { key: "out_for_delivery", icon: <Truck size={20} /> },
  { key: "delivered", icon: <Home size={20} /> },
  { key: "completed", icon: <CheckCircle size={20} /> },
];

const REVIEWABLE_STATUSES = new Set(["delivered", "completed"]);

// ── Star Rating Input ─────────────────────────────────────
function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={28}
            className={
              i <= (hovered || value)
                ? "text-[#D4A017] fill-[#D4A017]"
                : "text-[#E8DFD3]"
            }
          />
        </button>
      ))}
    </div>
  );
}

export default function TrackPage() {
  const { lang, t } = useI18nContext();
  const isAr = lang === "ar";
  const currencyLabel = getCurrencyLabel(lang);
  const { isAuthenticated, user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") || "");
  const [searchTrigger, setSearchTrigger] = useState(searchParams.get("order") || "");

  // ── Notifications ────────────────────────────────────────
  const [toasts, setToasts] = useState<StatusNotification[]>([]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  // setTrackedOrderNumber: tells GlobalOrderTracker (in CustomerLayout) which order to watch.
  // GlobalOrderTracker handles bell notifications; TrackPage only drives in-page toasts.
  const { setTrackedOrderNumber } = useNotifications();

  // Check browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? "granted" : "denied");
  };

  // Drive in-page toasts. Global bell is handled by GlobalOrderTracker.
  const handleToast = useCallback((n: StatusNotification) => {
    setToasts((prev) => [...prev, n]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Phone-based active orders lookup
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneTrigger, setPhoneTrigger] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const { data: activeOrders, isLoading: activeLoading } = trpc.order.getActiveByPhone.useQuery(
    { phone: phoneTrigger },
    { enabled: !!phoneTrigger }
  );

  const handlePhoneLookup = () => {
    const normalized = normalizeSaudiMobileNumber(phoneInput.trim());
    if (isSaudiMobileNumber(normalized)) {
      setPhoneError("");
      setPhoneTrigger(normalized);
      return;
    }
    setPhoneError(isAr ? "رقم الجوال يجب أن يكون بصيغة +966 5X XXX XXXX" : "Phone number must be in the format +966 5X XXX XXXX");
  };

  const { data: order, isLoading } = trpc.order.getByNumber.useQuery(
    { orderNumber: searchTrigger },
    { enabled: !!searchTrigger, refetchInterval: 3000, staleTime: 0 }
  );

  // Register this order globally so GlobalOrderTracker (in CustomerLayout) can
  // keep polling it on every page and fire bell notifications instantly.
  useEffect(() => {
    if (order?.orderNumber) {
      setTrackedOrderNumber(order.orderNumber);
    }
  }, [order?.orderNumber, setTrackedOrderNumber]);

  // Detect status changes while the user IS on TrackPage → drive in-page toasts.
  useOrderStatusChange({
    orderNumber: order?.orderNumber,
    status: order?.status as any,
    lang,
    onNotification: handleToast,
  });

  const { data: reviewStatus, refetch: refetchReviewStatus } = trpc.customer.hasReviewedOrder.useQuery(
    { orderId: order?.id ?? 0 },
    { enabled: !!order?.id && REVIEWABLE_STATUSES.has(order?.status ?? "") }
  );

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const createReview = trpc.customer.createReview.useMutation({
    onSuccess: () => {
      setReviewSubmitted(true);
      setShowReviewForm(false);
      refetchReviewStatus();
    },
  });

  useEffect(() => {
    if (searchTrigger) {
      setSearchParams({ order: searchTrigger });
    }
  }, [searchTrigger, setSearchParams]);

  // Reset review state when order changes
  useEffect(() => {
    setReviewSubmitted(false);
    setShowReviewForm(false);
    setRating(0);
    setComment("");
  }, [order?.id]);

  const handleSearch = () => {
    if (orderNumber.trim()) {
      setSearchTrigger(orderNumber.trim());
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    if (order.status === "cancelled") return -1;
    return statusSteps.findIndex((s) => s.key === order.status);
  };

  const currentStep = getCurrentStepIndex();


  const alreadyReviewed = reviewStatus?.reviewed || reviewSubmitted;

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || !order) return;

    createReview.mutate({
      orderId: order.id,
      rating,
      comment: comment || undefined,
      customerPhone: order.customerPhone,
    });
  }

  const ratingLabels: Record<number, { en: string; ar: string }> = {
    1: { en: "Poor", ar: "سيء" },
    2: { en: "Fair", ar: "مقبول" },
    3: { en: "Good", ar: "جيد" },
    4: { en: "Very Good", ar: "جيد جداً" },
    5: { en: "Excellent!", ar: "ممتاز!" },
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-[#2D2420] mb-6">{t.trackYourOrder}</h2>

      {/* ── Browser Notification Permission Banner ── */}
      {"Notification" in window && notifPermission === "default" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#C75C2E]/10 to-[#D4A017]/10 border border-[#D4C8B8] rounded-xl"
        >
          <div className="w-9 h-9 rounded-full bg-[#C75C2E]/15 flex items-center justify-center shrink-0">
            <Bell size={17} className="text-[#C75C2E]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#2D2420]">
              {isAr ? "تلقّ إشعارات لحظية" : "Get live order updates"}
            </p>
            <p className="text-xs text-[#8B7A6E]">
              {isAr
                ? "فعّل الإشعارات لمتابعة حالة طلبك حتى وأنت بعيد عن الصفحة"
                : "Enable notifications to stay updated even when away from this tab"}
            </p>
          </div>
          <button
            onClick={handleRequestPermission}
            className="shrink-0 px-4 py-2 bg-[#C75C2E] text-white text-xs font-semibold rounded-xl hover:bg-[#A84A22] transition-colors"
          >
            {isAr ? "تفعيل" : "Enable"}
          </button>
        </motion.div>
      )}

      {/* ── Notification Permission Denied Notice ── */}
      {"Notification" in window && notifPermission === "denied" && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
          <BellOff size={16} className="text-gray-400 shrink-0" />
          <p className="text-xs text-gray-500">
            {isAr
              ? "الإشعارات مُعطَّلة. يمكنك تفعيلها من إعدادات المتصفح."
              : "Notifications are disabled. You can enable them from browser settings."}
          </p>
        </div>
      )}

      {/* ── Phone-based Active Orders Lookup ── */}
      <div className="mb-8 bg-white rounded-2xl border border-[#E8DFD3] shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-[#C75C2E]/10 to-[#D4A017]/10 border-b border-[#E8DFD3]">
          <div className="w-9 h-9 rounded-full bg-[#C75C2E]/15 flex items-center justify-center">
            <ListOrdered size={18} className="text-[#C75C2E]" />
          </div>
          <div>
            <p className="font-semibold text-[#2D2420] text-sm">
              {isAr ? "متابعة طلباتي" : "My Active Orders"}
            </p>
            <p className="text-xs text-[#8B7A6E]">
              {isAr ? "أدخل رقم جوالك لعرض طلباتك النشطة" : "Enter your phone number to view your active orders"}
            </p>
          </div>
        </div>

        <div className="p-5">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7A6E]" />
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value.replace(/[^\d+ ]/g, ""));
                  if (phoneError) setPhoneError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handlePhoneLookup()}
                placeholder={isAr ? "+966 5xx xxx xxxx" : "+966 5xx xxx xxxx"}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#D4C8B8] bg-[#FDFAF6] text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E] focus:border-transparent text-sm"
                dir="ltr"
                inputMode="tel"
              />
            </div>
            {phoneError ? <p className="mt-2 text-xs text-[#C0392B]">{phoneError}</p> : null}
            <button
              onClick={handlePhoneLookup}
              disabled={!phoneInput.trim()}
              className="px-5 py-2.5 bg-[#C75C2E] text-white rounded-xl font-semibold text-sm hover:bg-[#A84A22] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Search size={15} />
              {isAr ? "بحث" : "Search"}
            </button>
          </div>

          {/* Results */}
          <AnimatePresence>
            {phoneTrigger && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                {activeLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-[#C75C2E] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : activeOrders && activeOrders.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[#8B7A6E] mb-3">
                      {isAr
                        ? `${activeOrders.length} طلب نشط`
                        : `${activeOrders.length} active order${activeOrders.length !== 1 ? "s" : ""}`}
                    </p>
                    {activeOrders.map((o) => (
                      <motion.button
                        key={o.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => {
                          setOrderNumber(o.orderNumber);
                          setSearchTrigger(o.orderNumber);
                          setSearchParams({ order: o.orderNumber });
                        }}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#FDFAF6] hover:bg-[#F5F0E8] border border-[#E8DFD3] rounded-xl transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#C75C2E]/10 flex items-center justify-center shrink-0">
                            <Package size={15} className="text-[#C75C2E]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#2D2420] text-sm">{o.orderNumber}</p>
                            <p className="text-xs text-[#8B7A6E]">
                              {new Date(o.createdAt!).toLocaleDateString(isAr ? "ar-SA" : "en-US", {
                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            o.status === "new" ? "bg-blue-50 text-blue-600" :
                            o.status === "accepted" ? "bg-purple-50 text-purple-600" :
                            o.status === "preparing" ? "bg-orange-50 text-orange-600" :
                            o.status === "ready" ? "bg-green-50 text-green-600" :
                            o.status === "out_for_delivery" || o.status === "on_the_way" ? "bg-teal-50 text-teal-600" :
                            o.status === "delivered" ? "bg-emerald-50 text-emerald-600" :
                            "bg-gray-50 text-gray-500"
                          }`}>
                            {isAr ? ({
                              new: "جديد", accepted: "مقبول", preparing: "يُحضَّر",
                              ready: "جاهز", out_for_delivery: "في الطريق",
                              on_the_way: "في الطريق", driver_assigned: "سائق معيّن",
                              delivered: "تم التوصيل", completed: "مكتمل", cancelled: "ملغي",
                            } as Record<string, string>)[o.status] ?? o.status : ({
                              new: "New", accepted: "Accepted", preparing: "Preparing",
                              ready: "Ready", out_for_delivery: "Out for Delivery",
                              on_the_way: "On the Way", driver_assigned: "Driver Assigned",
                              delivered: "Delivered", completed: "Completed", cancelled: "Cancelled",
                            } as Record<string, string>)[o.status] ?? o.status}
                          </span>
                          <ArrowRight size={14} className="text-[#8B7A6E] group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[#8B7A6E]">
                    <Clock size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">
                      {isAr ? "لا توجد طلبات نشطة لهذا الرقم" : "No active orders found for this number"}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Search by Order Number ── */}
      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={t.enterOrderNumber}
          className="flex-1 px-4 py-3 rounded-xl border border-[#D4C8B8] bg-white text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E] focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-[#C75C2E] text-white rounded-xl font-semibold hover:bg-[#A84A22] transition-colors flex items-center gap-2"
        >
          <Search size={18} />
          {t.search}
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-[#C75C2E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#8B7A6E] mt-3">{t.loading}</p>
        </div>
      )}

      {!isLoading && searchTrigger && !order && (
        <div className="text-center py-12 bg-white rounded-xl border border-[#E8DFD3]">
          <XCircle size={48} className="mx-auto text-[#C0392B] mb-3" />
          <p className="text-[#2D2420] font-medium">{t.orderNotFound}</p>
        </div>
      )}

      {order && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* ── Order Header ── */}
          <div className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-[#8B7A6E]">{t.orderNumber}</p>
                <p className="text-2xl font-bold text-[#2D2420]">{order.orderNumber}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#E8DFD3]">
              <div>
                <p className="text-xs text-[#8B7A6E]">{isAr ? "العميل" : "Customer"}</p>
                <p className="font-medium text-[#2D2420] text-sm">{order.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-[#8B7A6E]">{isAr ? "الهاتف" : "Phone"}</p>
                <p className="font-medium text-[#2D2420] text-sm">{order.customerPhone}</p>
              </div>
              <div>
                <p className="text-xs text-[#8B7A6E]">{t.paymentMethod}</p>
                <p className="font-medium text-[#2D2420] text-sm uppercase">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs text-[#8B7A6E]">{t.total}</p>
                <p className="font-bold text-[#C75C2E] text-sm">{parseFloat(order.total).toFixed(2)} {currencyLabel}</p>
              </div>
            </div>
          </div>

          {/* ── Status Timeline ── */}
          {order.status !== "cancelled" ? (
            <div className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm">
              <h3 className="font-semibold text-[#2D2420] mb-6">{t.orderStatus}</h3>
              <div className="relative">
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-[#E8DFD3]" />
                <div className="flex justify-between relative z-10">
                  {statusSteps.map((step, index) => {
                    const isCompleted = index <= currentStep;
                    const isCurrent = index === currentStep;

                    return (
                      <div key={step.key} className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            isCompleted
                              ? "bg-[#6B7F3E] border-[#6B7F3E] text-white"
                              : "bg-white border-[#E8DFD3] text-[#8B7A6E]"
                          } ${isCurrent ? "ring-4 ring-[#6B7F3E]/20 animate-pulse" : ""}`}
                        >
                          {isCompleted ? <CheckCircle size={18} /> : step.icon}
                        </div>
                        <span
                          className={`text-[10px] mt-2 font-medium text-center max-w-[60px] ${
                            isCompleted ? "text-[#6B7F3E]" : "text-[#8B7A6E]"
                          }`}
                        >
                          {(t as any)[`status_${step.key}`] || step.key}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#C0392B]/10 rounded-xl p-6 border border-[#C0392B]/20 text-center">
              <XCircle size={48} className="mx-auto text-[#C0392B] mb-3" />
              <h3 className="font-bold text-[#C0392B] text-lg">{t.status_cancelled}</h3>
              <p className="text-[#5C4D44] mt-2">{isAr ? "تم إلغاء هذا الطلب" : "This order has been cancelled"}</p>
            </div>
          )}

          {/* ── Order Items ── */}
          <div className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm">
            <h3 className="font-semibold text-[#2D2420] mb-4">{t.orderDetails}</h3>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-[#F5F0E8] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#C75C2E] text-white text-xs flex items-center justify-center font-bold">
                      {item.quantity}
                    </span>
                    <span className="text-[#2D2420] font-medium">
                      {lang === "ar" ? item.productNameAr : item.productNameEn}
                    </span>
                  </div>
                    <span className="text-[#5C4D44] font-medium">
                    {parseFloat(item.totalPrice).toFixed(2)} {currencyLabel}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#E8DFD3] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5C4D44]">{t.subtotal}</span>
                <span>{parseFloat(order.subtotal).toFixed(2)} {currencyLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C4D44]">{t.tax}</span>
                <span>{parseFloat(order.taxAmount || "0").toFixed(2)} {currencyLabel}</span>
              </div>
              {parseFloat(order.deliveryFee || "0") > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#5C4D44]">{t.deliveryFee}</span>
                  <span>{parseFloat(order.deliveryFee || "0").toFixed(2)} {currencyLabel}</span>
                </div>
              )}
              {parseFloat(order.discountAmount || "0") > 0 && (
                <div className="flex justify-between text-[#6B7F3E] font-medium">
                  <span>
                    {t.discount}
                    {order.couponCode ? ` (${order.couponCode})` : ""}
                  </span>
                  <span>-{parseFloat(order.discountAmount || "0").toFixed(2)} {currencyLabel}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-[#E8DFD3]">
                <span>{t.total}</span>
                <span className="text-[#C75C2E]">{parseFloat(order.total || "0").toFixed(2)} {currencyLabel}</span>
              </div>
            </div>
          </div>

          {/* ── Status History ── */}
          <div className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm">
            <h3 className="font-semibold text-[#2D2420] mb-4">
              {isAr ? "سجل الحالة" : "Status History"}
            </h3>
            <div className="space-y-3">
              {order.history?.map((h) => (
                <div key={h.id} className="flex items-center gap-3 text-sm">
                  <Clock size={14} className="text-[#8B7A6E]" />
                  <StatusBadge status={h.status} />
                  <span className="text-[#8B7A6E] text-xs">
                    {h.createdAt
                      ? new Date(h.createdAt).toLocaleString(isAr ? "ar-SA" : "en-US")
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════ */}
          {/* ── REVIEW SECTION ───────────────────────────────── */}
          {/* ════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {REVIEWABLE_STATUSES.has(order.status) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden"
              >
                {/* Already reviewed */}
                {alreadyReviewed ? (
                  <div className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#6B7F3E]/10 flex items-center justify-center mx-auto mb-3">
                      <ThumbsUp size={24} className="text-[#6B7F3E]" />
                    </div>
                    <h3 className="font-bold text-[#2D2420] mb-1">
                      {isAr ? "شكراً على تقييمك!" : "Thanks for your review!"}
                    </h3>
                    <p className="text-sm text-[#8B7A6E]">
                      {isAr
                        ? "تقييمك يساعدنا على التحسين المستمر"
                        : "Your feedback helps us improve continuously"}
                    </p>
                    {reviewStatus?.review && (
                      <div className="mt-4 flex justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={20}
                            className={
                              i <= (reviewStatus.review?.rating ?? 0)
                                ? "text-[#D4A017] fill-[#D4A017]"
                                : "text-[#E8DFD3]"
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : !isAuthenticated ? (
                  // Not signed in
                  <div className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#C75C2E]/10 flex items-center justify-center mx-auto mb-3">
                      <Star size={24} className="text-[#C75C2E]" />
                    </div>
                    <h3 className="font-semibold text-[#2D2420] mb-1">
                      {isAr ? "شارك تقييمك" : "Share Your Review"}
                    </h3>
                    <p className="text-sm text-[#8B7A6E] mb-4">
                      {isAr
                        ? "سجّل دخولك لتتمكن من تقييم طلبك"
                        : "Sign in to leave a review for this order"}
                    </p>
                    <a
                      href={`/sign-in?redirect=/track?order=${order.orderNumber}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C75C2E] text-white rounded-full text-sm font-semibold hover:bg-[#A84A22] transition-colors"
                    >
                      {isAr ? "تسجيل الدخول" : "Sign In"}
                    </a>
                  </div>
                ) : !showReviewForm ? (
                  // Prompt to open review form
                  <div className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#D4A017]/10 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare size={24} className="text-[#D4A017]" />
                    </div>
                    <h3 className="font-semibold text-[#2D2420] mb-1">
                      {isAr ? "كيف كانت تجربتك؟" : "How was your experience?"}
                    </h3>
                    <p className="text-sm text-[#8B7A6E] mb-4">
                      {isAr
                        ? "رأيك يهمنا! شاركنا تقييمك للطلب"
                        : "We'd love to hear from you. Rate your order!"}
                    </p>
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4A017] text-white rounded-full text-sm font-semibold hover:bg-[#b8891a] transition-colors"
                    >
                      <Star size={15} />
                      {isAr ? "اكتب تقييم" : "Write a Review"}
                    </button>
                  </div>
                ) : (
                  // Review form
                  <motion.form
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmitReview}
                    className="p-6"
                  >
                    <h3 className="font-bold text-[#2D2420] mb-5 flex items-center gap-2">
                      <Star size={18} className="text-[#D4A017]" />
                      {isAr ? "قيّم طلبك" : "Rate Your Order"}
                    </h3>

                    {/* Star Rating */}
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-[#5C4D44] mb-3">
                        {isAr ? "تقييمك *" : "Your Rating *"}
                      </label>
                      <div className="flex items-center gap-3">
                        <StarInput value={rating} onChange={setRating} />
                        {rating > 0 && (
                          <motion.span
                            key={rating}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-sm font-semibold text-[#D4A017]"
                          >
                            {isAr
                              ? ratingLabels[rating]?.ar
                              : ratingLabels[rating]?.en}
                          </motion.span>
                        )}
                      </div>
                    </div>

                    {/* Comment */}
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
                        {isAr ? "تعليقك (اختياري)" : "Comment (optional)"}
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-[#F5F0E8]/50 text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E] focus:border-transparent resize-none placeholder:text-[#B0A096]"
                        placeholder={
                          isAr
                            ? "أخبرنا عن تجربتك مع الطلب..."
                            : "Tell us about your experience with this order..."
                        }
                      />
                    </div>

                    {/* Signed in as */}
                    {user && (
                      <p className="text-xs text-[#8B7A6E] mb-4">
                        {isAr ? "التقييم باسم:" : "Reviewing as:"}{" "}
                        <span className="font-medium text-[#5C4D44]">{user.name}</span>
                      </p>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowReviewForm(false);
                          setRating(0);
                          setComment("");
                        }}
                        className="flex-1 py-2.5 border border-[#E8DFD3] rounded-xl text-sm font-medium text-[#5C4D44] hover:bg-[#F5F0E8] transition-colors"
                      >
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                      <button
                        type="submit"
                        disabled={!rating || createReview.isPending}
                        className="flex-1 py-2.5 bg-[#C75C2E] text-white rounded-xl text-sm font-semibold hover:bg-[#A84A22] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {createReview.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                        {isAr ? "إرسال التقييم" : "Submit Review"}
                      </button>
                    </div>
                  </motion.form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Toast Notifications Portal ── */}
      <OrderStatusToast
        notifications={toasts}
        lang={lang}
        onDismiss={dismissToast}
      />
    </div>
  );
}
