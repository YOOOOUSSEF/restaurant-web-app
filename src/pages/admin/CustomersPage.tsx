import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Star,
  Gift,
  X,
  Phone,
  Mail,
  MapPin,
  Search,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ShoppingBag,
  Award,
  Tag,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────
type Tab = "customers" | "coupons" | "reviews";

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  loyaltyPoints: string;
}

interface CouponForm {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minOrderAmount: string;
  maxUsage: string;
  startDate: string;
  endDate: string;
}

const defaultCustomerForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  loyaltyPoints: "0",
};

const defaultCouponForm: CouponForm = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "",
  maxUsage: "",
  startDate: "",
  endDate: "",
};

// ─── Star Rating Component ─────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          className={i <= rating ? "text-[#D4A017] fill-[#D4A017]" : "text-[#E8DFD3]"}
        />
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────
export default function CustomersPage() {
  const { lang } = useI18nContext();
  const isAr = lang === "ar";

  const [activeTab, setActiveTab] = useState<Tab>("customers");
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(defaultCustomerForm);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState<CouponForm>(defaultCouponForm);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "customer" | "coupon"; id: number } | null>(null);

  // ─── Queries ───────────────────────────────────────────
  const utils = trpc.useUtils();
  const { data: customers = [], isLoading: loadingCustomers } = trpc.customer.list.useQuery();
  const { data: customerOrders } = trpc.customer.getOrderHistory.useQuery(
    { customerId: selectedCustomer?.id ?? 0 },
    { enabled: !!selectedCustomer }
  );
  const { data: coupons = [], isLoading: loadingCoupons } = trpc.customer.listCoupons.useQuery();
  const { data: reviews = [], isLoading: loadingReviews } = trpc.customer.listReviews.useQuery();

  // ─── Mutations ─────────────────────────────────────────
  const createCustomer = trpc.customer.create.useMutation({
    onSuccess: () => { utils.customer.list.invalidate(); closeCustomerModal(); },
  });
  const updateCustomer = trpc.customer.update.useMutation({
    onSuccess: () => { utils.customer.list.invalidate(); closeCustomerModal(); },
  });
  const deleteCustomer = trpc.customer.delete.useMutation({
    onSuccess: () => { utils.customer.list.invalidate(); setConfirmDelete(null); setSelectedCustomer(null); },
  });
  const createCoupon = trpc.customer.createCoupon.useMutation({
    onSuccess: () => { utils.customer.listCoupons.invalidate(); closeCouponModal(); },
  });
  const toggleCoupon = trpc.customer.toggleCoupon.useMutation({
    onSuccess: () => utils.customer.listCoupons.invalidate(),
  });
  const deleteCoupon = trpc.customer.deleteCoupon.useMutation({
    onSuccess: () => { utils.customer.listCoupons.invalidate(); setConfirmDelete(null); },
  });

  // ─── Filtered customers ────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        c.code.toLowerCase().includes(q)
    );
  }, [customers, search]);

  // ─── Handlers ─────────────────────────────────────────
  function openAddCustomer() {
    setEditingCustomer(null);
    setCustomerForm(defaultCustomerForm);
    setShowCustomerModal(true);
  }

  function openEditCustomer(customer: any, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
      address: customer.address ?? "",
      loyaltyPoints: String(customer.loyaltyPoints ?? 0),
    });
    setShowCustomerModal(true);
  }

  function closeCustomerModal() {
    setShowCustomerModal(false);
    setEditingCustomer(null);
    setCustomerForm(defaultCustomerForm);
  }

  function handleCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingCustomer) {
      updateCustomer.mutate({
        id: editingCustomer.id,
        name: customerForm.name || undefined,
        phone: customerForm.phone || undefined,
        email: customerForm.email || undefined,
        address: customerForm.address || undefined,
        loyaltyPoints: customerForm.loyaltyPoints ? Number(customerForm.loyaltyPoints) : undefined,
      });
    } else {
      createCustomer.mutate({
        name: customerForm.name,
        phone: customerForm.phone,
        email: customerForm.email || undefined,
        address: customerForm.address || undefined,
      });
    }
  }

  function closeCouponModal() {
    setShowCouponModal(false);
    setCouponForm(defaultCouponForm);
  }

  function handleCouponSubmit(e: React.FormEvent) {
    e.preventDefault();
    createCoupon.mutate({
      code: couponForm.code,
      discountType: couponForm.discountType,
      discountValue: Number(couponForm.discountValue),
      minOrderAmount: couponForm.minOrderAmount ? Number(couponForm.minOrderAmount) : undefined,
      maxUsage: couponForm.maxUsage ? Number(couponForm.maxUsage) : undefined,
      startDate: couponForm.startDate || undefined,
      endDate: couponForm.endDate || undefined,
    });
  }

  // ─── Stats ─────────────────────────────────────────────
  const activeCoupons = coupons.filter((c) => c.isActive).length;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "—";

  // ─── Tab labels ────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "customers", label: isAr ? "العملاء" : "Customers", icon: <Users size={15} /> },
    { key: "coupons", label: isAr ? "الكوبونات" : "Coupons", icon: <Gift size={15} /> },
    { key: "reviews", label: isAr ? "التقييمات" : "Reviews", icon: <Star size={15} /> },
  ];

  // ─── Input class helper ────────────────────────────────
  const inputCls =
    "w-full border border-[#E8DFD3] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C75C2E]/30 focus:border-[#C75C2E] bg-white";

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2D2420] mb-6">
        {isAr ? "العملاء" : "Customers"}
      </h1>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-[#E8DFD3] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8B7A6E]">{isAr ? "إجمالي العملاء" : "Total Customers"}</p>
              <p className="text-2xl font-bold text-[#2D2420]">{customers.length}</p>
            </div>
            <div className="bg-[#4A7FB5] text-white p-2.5 rounded-lg"><Users size={18} /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#E8DFD3] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8B7A6E]">{isAr ? "الكوبونات النشطة" : "Active Coupons"}</p>
              <p className="text-2xl font-bold text-[#2D2420]">{activeCoupons}</p>
            </div>
            <div className="bg-[#C75C2E] text-white p-2.5 rounded-lg"><Gift size={18} /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#E8DFD3] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8B7A6E]">{isAr ? "متوسط التقييم" : "Avg. Rating"}</p>
              <p className="text-2xl font-bold text-[#D4A017]">{avgRating}</p>
            </div>
            <div className="bg-[#D4A017] text-white p-2.5 rounded-lg"><Star size={18} /></div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 bg-[#F5F0E8] p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-[#C75C2E] shadow-sm"
                : "text-[#8B7A6E] hover:text-[#2D2420]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── CUSTOMERS TAB ─────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === "customers" && (
        <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[#E8DFD3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="font-semibold text-[#2D2420]">{isAr ? "قائمة العملاء" : "Customer List"}</h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7A6E]" />
                <input
                  type="text"
                  placeholder={isAr ? "ابحث..." : "Search..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-[#E8DFD3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75C2E]/30 focus:border-[#C75C2E]"
                />
              </div>
              <button
                onClick={openAddCustomer}
                className="flex items-center gap-1.5 bg-[#C75C2E] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#a84c26] transition-colors shrink-0"
              >
                <Plus size={15} />
                {isAr ? "إضافة" : "Add"}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F0E8] text-[#5C4D44]">
                  <th className="text-left px-4 py-3 font-medium">{isAr ? "الكود" : "Code"}</th>
                  <th className="text-left px-4 py-3 font-medium">{isAr ? "الاسم" : "Name"}</th>
                  <th className="text-left px-4 py-3 font-medium">{isAr ? "الجوال" : "Phone"}</th>
                  <th className="text-left px-4 py-3 font-medium">{isAr ? "الطلبات" : "Orders"}</th>
                  <th className="text-left px-4 py-3 font-medium">{isAr ? "نقاط الولاء" : "Loyalty"}</th>
                  <th className="text-left px-4 py-3 font-medium">{isAr ? "الإجمالي" : "Spent"}</th>
                  <th className="text-left px-4 py-3 font-medium">{isAr ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {loadingCustomers ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#8B7A6E]">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#C75C2E] border-t-transparent rounded-full animate-spin" />
                        {isAr ? "جاري التحميل..." : "Loading..."}
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#8B7A6E]">
                      {isAr ? "لا توجد بيانات" : "No data available"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-t border-[#F5F0E8] hover:bg-[#FDF8F4] cursor-pointer transition-colors"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[#C75C2E]">{customer.code}</td>
                      <td className="px-4 py-3 font-medium text-[#2D2420]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#C75C2E]/10 text-[#C75C2E] flex items-center justify-center text-xs font-bold shrink-0">
                            {customer.name.charAt(0)}
                          </div>
                          {customer.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#5C4D44]">{customer.phone}</td>
                      <td className="px-4 py-3 text-[#5C4D44]">{customer.totalOrders ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className="bg-[#C75C2E]/10 text-[#C75C2E] px-2 py-1 rounded-full text-xs font-medium">
                          {Math.floor(parseFloat(customer.totalSpent ?? "0"))} pts
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#2D2420]">
                        {parseFloat(customer.totalSpent ?? "0").toFixed(2)} SAR
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => openEditCustomer(customer, e)}
                            className="p-1.5 hover:bg-[#F5F0E8] rounded-lg text-[#4A7FB5] transition-colors"
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: "customer", id: customer.id }); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                            title={isAr ? "حذف" : "Delete"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── COUPONS TAB ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === "coupons" && (
        <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E8DFD3] flex items-center justify-between">
            <h3 className="font-semibold text-[#2D2420]">{isAr ? "الكوبونات" : "Coupons"}</h3>
            <button
              onClick={() => setShowCouponModal(true)}
              className="flex items-center gap-1.5 bg-[#C75C2E] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#a84c26] transition-colors"
            >
              <Plus size={15} />
              {isAr ? "إضافة كوبون" : "Add Coupon"}
            </button>
          </div>

          {loadingCoupons ? (
            <div className="py-12 text-center text-[#8B7A6E]">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#C75C2E] border-t-transparent rounded-full animate-spin" />
                {isAr ? "جاري التحميل..." : "Loading..."}
              </div>
            </div>
          ) : coupons.length === 0 ? (
            <div className="py-12 text-center text-[#8B7A6E]">
              <Gift size={32} className="mx-auto mb-2 opacity-30" />
              <p>{isAr ? "لا توجد كوبونات" : "No coupons yet"}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F5F0E8]">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#FDF8F4] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${coupon.isActive ? "bg-[#C75C2E]/10 text-[#C75C2E]" : "bg-[#F5F0E8] text-[#8B7A6E]"}`}>
                      <Tag size={15} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#2D2420]">{coupon.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${coupon.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {coupon.isActive ? (isAr ? "نشط" : "Active") : (isAr ? "معطل" : "Inactive")}
                        </span>
                      </div>
                      <p className="text-xs text-[#8B7A6E] mt-0.5">
                        {coupon.discountType === "percentage"
                          ? `${coupon.discountValue}% ${isAr ? "خصم" : "off"}`
                          : `${coupon.discountValue} SAR ${isAr ? "خصم" : "off"}`}
                        {coupon.minOrderAmount && parseFloat(coupon.minOrderAmount) > 0
                          ? ` · ${isAr ? "حد أدنى" : "Min"} ${coupon.minOrderAmount} SAR`
                          : ""}
                        {coupon.maxUsage
                          ? ` · ${coupon.usedCount ?? 0}/${coupon.maxUsage} ${isAr ? "استخدام" : "uses"}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCoupon.mutate({ id: coupon.id, isActive: !coupon.isActive })}
                      className={`p-1.5 rounded-lg transition-colors ${coupon.isActive ? "text-green-600 hover:bg-green-50" : "text-[#8B7A6E] hover:bg-[#F5F0E8]"}`}
                      title={coupon.isActive ? (isAr ? "تعطيل" : "Deactivate") : (isAr ? "تفعيل" : "Activate")}
                    >
                      {coupon.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ type: "coupon", id: coupon.id })}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                      title={isAr ? "حذف" : "Delete"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── REVIEWS TAB ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === "reviews" && (
        <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E8DFD3]">
            <h3 className="font-semibold text-[#2D2420]">{isAr ? "تقييمات العملاء" : "Customer Reviews"}</h3>
          </div>
          {loadingReviews ? (
            <div className="py-12 text-center text-[#8B7A6E]">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#C75C2E] border-t-transparent rounded-full animate-spin" />
                {isAr ? "جاري التحميل..." : "Loading..."}
              </div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center text-[#8B7A6E]">
              <Star size={32} className="mx-auto mb-2 opacity-30" />
              <p>{isAr ? "لا توجد تقييمات" : "No reviews yet"}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F5F0E8]">
              {reviews.map((review) => (
                <div key={review.id} className="px-4 py-4 hover:bg-[#FDF8F4] transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#D4A017]/10 text-[#D4A017] flex items-center justify-center">
                        <Award size={14} />
                      </div>
                      <div>
                        <StarRating rating={review.rating} />
                        <p className="text-xs text-[#8B7A6E] mt-0.5">
                          {isAr ? "طلب #" : "Order #"}{review.orderId}
                          {" · "}
                          {review.createdAt
                            ? new Date(review.createdAt).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${review.isVisible ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {review.isVisible ? (isAr ? "ظاهر" : "Visible") : (isAr ? "مخفي" : "Hidden")}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-[#5C4D44] ml-11">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── CUSTOMER DETAIL MODAL ─────────────────────────── */}
      {/* ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedCustomer && !showCustomerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedCustomer(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#E8DFD3] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#C75C2E] text-white flex items-center justify-center text-lg font-bold">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2D2420]">{selectedCustomer.name}</h3>
                    <p className="text-xs text-[#8B7A6E]">{selectedCustomer.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { setSelectedCustomer(null); openEditCustomer(selectedCustomer, e); }}
                    className="p-2 hover:bg-[#F5F0E8] rounded-lg text-[#4A7FB5] transition-colors"
                    title={isAr ? "تعديل" : "Edit"}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="p-2 hover:bg-[#F5F0E8] rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Contact info */}
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2 text-sm text-[#5C4D44]">
                    <Phone size={14} className="text-[#8B7A6E]" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-2 text-sm text-[#5C4D44]">
                      <Mail size={14} className="text-[#8B7A6E]" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-2 text-sm text-[#5C4D44]">
                      <MapPin size={14} className="text-[#8B7A6E]" />
                      <span>{selectedCustomer.address}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#F5F0E8] rounded-xl p-3 text-center">
                    <ShoppingBag size={16} className="mx-auto mb-1 text-[#8B7A6E]" />
                    <p className="text-2xl font-bold text-[#2D2420]">{selectedCustomer.totalOrders ?? 0}</p>
                    <p className="text-xs text-[#8B7A6E]">{isAr ? "طلبات" : "Orders"}</p>
                  </div>
                  <div className="bg-[#F5F0E8] rounded-xl p-3 text-center">
                    <Award size={16} className="mx-auto mb-1 text-[#C75C2E]" />
                    <p className="text-2xl font-bold text-[#C75C2E]">{Math.floor(parseFloat(selectedCustomer.totalSpent ?? "0"))}</p>
                    <p className="text-xs text-[#8B7A6E]">{isAr ? "نقاط" : "Points"}</p>
                  </div>
                  <div className="bg-[#F5F0E8] rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-[#2D2420] mt-4">{parseFloat(selectedCustomer.totalSpent ?? "0").toFixed(0)}</p>
                    <p className="text-xs text-[#8B7A6E]">SAR</p>
                  </div>
                </div>

                {/* Order History */}
                <div className="border-t border-[#F5F0E8] pt-4">
                  <h4 className="font-semibold text-[#2D2420] mb-3 flex items-center gap-2">
                    <ChevronRight size={15} />
                    {isAr ? "سجل الطلبات" : "Order History"}
                  </h4>
                  {customerOrders && customerOrders.length > 0 ? (
                    <div className="space-y-2">
                      {customerOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between py-2 px-3 bg-[#F5F0E8] rounded-lg text-sm"
                        >
                          <span className="font-mono text-[#C75C2E] text-xs">{order.orderNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            order.status === "completed" || order.status === "delivered"
                              ? "bg-green-100 text-green-700"
                              : order.status === "cancelled"
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                          }`}>
                            {order.status}
                          </span>
                          <span className="font-medium">{parseFloat(order.total).toFixed(2)} SAR</span>
                          <span className="text-[#8B7A6E] text-xs">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#8B7A6E]">{isAr ? "لا توجد طلبات" : "No orders yet"}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── ADD / EDIT CUSTOMER MODAL ─────────────────────── */}
      {/* ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCustomerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={closeCustomerModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="p-6 border-b border-[#E8DFD3] flex items-center justify-between">
                <h3 className="font-bold text-[#2D2420]">
                  {editingCustomer
                    ? isAr ? "تعديل العميل" : "Edit Customer"
                    : isAr ? "إضافة عميل جديد" : "Add New Customer"}
                </h3>
                <button onClick={closeCustomerModal} className="p-2 hover:bg-[#F5F0E8] rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCustomerSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                    {isAr ? "الاسم *" : "Name *"}
                  </label>
                  <input
                    required
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm((f) => ({ ...f, name: e.target.value }))}
                    className={inputCls}
                    placeholder={isAr ? "اسم العميل" : "Customer name"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                    {isAr ? "الجوال *" : "Phone *"}
                  </label>
                  <input
                    required
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm((f) => ({ ...f, phone: e.target.value }))}
                    className={inputCls}
                    placeholder="+966 5x xxx xxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                    {isAr ? "البريد الإلكتروني" : "Email"}
                  </label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))}
                    className={inputCls}
                    placeholder={isAr ? "اختياري" : "Optional"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                    {isAr ? "العنوان" : "Address"}
                  </label>
                  <input
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm((f) => ({ ...f, address: e.target.value }))}
                    className={inputCls}
                    placeholder={isAr ? "اختياري" : "Optional"}
                  />
                </div>
                {editingCustomer && (
                  <div>
                    <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                      {isAr ? "نقاط الولاء" : "Loyalty Points"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={customerForm.loyaltyPoints}
                      onChange={(e) => setCustomerForm((f) => ({ ...f, loyaltyPoints: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeCustomerModal}
                    className="flex-1 py-2.5 border border-[#E8DFD3] rounded-lg text-sm font-medium text-[#5C4D44] hover:bg-[#F5F0E8] transition-colors"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={createCustomer.isPending || updateCustomer.isPending}
                    className="flex-1 py-2.5 bg-[#C75C2E] text-white rounded-lg text-sm font-medium hover:bg-[#a84c26] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {(createCustomer.isPending || updateCustomer.isPending) && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {editingCustomer ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "إضافة العميل" : "Add Customer")}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── ADD COUPON MODAL ──────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCouponModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={closeCouponModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="p-6 border-b border-[#E8DFD3] flex items-center justify-between">
                <h3 className="font-bold text-[#2D2420]">{isAr ? "إضافة كوبون جديد" : "Add New Coupon"}</h3>
                <button onClick={closeCouponModal} className="p-2 hover:bg-[#F5F0E8] rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCouponSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                    {isAr ? "كود الكوبون *" : "Coupon Code *"}
                  </label>
                  <input
                    required
                    value={couponForm.code}
                    onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className={inputCls + " uppercase font-mono"}
                    placeholder="e.g. SAVE20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                      {isAr ? "نوع الخصم *" : "Discount Type *"}
                    </label>
                    <select
                      value={couponForm.discountType}
                      onChange={(e) =>
                        setCouponForm((f) => ({ ...f, discountType: e.target.value as "percentage" | "fixed" }))
                      }
                      className={inputCls}
                    >
                      <option value="percentage">{isAr ? "نسبة مئوية %" : "Percentage %"}</option>
                      <option value="fixed">{isAr ? "مبلغ ثابت SAR" : "Fixed Amount SAR"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                      {isAr ? "قيمة الخصم *" : "Discount Value *"}
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm((f) => ({ ...f, discountValue: e.target.value }))}
                      className={inputCls}
                      placeholder={couponForm.discountType === "percentage" ? "20" : "10.00"}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                      {isAr ? "حد أدنى للطلب" : "Min Order (SAR)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={couponForm.minOrderAmount}
                      onChange={(e) => setCouponForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                      className={inputCls}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                      {isAr ? "الحد الأقصى للاستخدام" : "Max Uses"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={couponForm.maxUsage}
                      onChange={(e) => setCouponForm((f) => ({ ...f, maxUsage: e.target.value }))}
                      className={inputCls}
                      placeholder={isAr ? "غير محدود" : "Unlimited"}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                      {isAr ? "تاريخ البداية" : "Start Date"}
                    </label>
                    <input
                      type="date"
                      value={couponForm.startDate}
                      onChange={(e) => setCouponForm((f) => ({ ...f, startDate: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5C4D44] mb-1">
                      {isAr ? "تاريخ الانتهاء" : "End Date"}
                    </label>
                    <input
                      type="date"
                      value={couponForm.endDate}
                      onChange={(e) => setCouponForm((f) => ({ ...f, endDate: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeCouponModal}
                    className="flex-1 py-2.5 border border-[#E8DFD3] rounded-lg text-sm font-medium text-[#5C4D44] hover:bg-[#F5F0E8] transition-colors"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={createCoupon.isPending}
                    className="flex-1 py-2.5 bg-[#C75C2E] text-white rounded-lg text-sm font-medium hover:bg-[#a84c26] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {createCoupon.isPending && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {isAr ? "إضافة الكوبون" : "Add Coupon"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── CONFIRM DELETE DIALOG ─────────────────────────── */}
      {/* ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-[#2D2420]">
                    {isAr ? "تأكيد الحذف" : "Confirm Delete"}
                  </h3>
                  <p className="text-sm text-[#8B7A6E]">
                    {confirmDelete.type === "customer"
                      ? isAr ? "سيتم حذف العميل نهائياً" : "This customer will be permanently deleted"
                      : isAr ? "سيتم حذف الكوبون نهائياً" : "This coupon will be permanently deleted"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 border border-[#E8DFD3] rounded-lg text-sm font-medium text-[#5C4D44] hover:bg-[#F5F0E8] transition-colors"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={() => {
                    if (confirmDelete.type === "customer") {
                      deleteCustomer.mutate({ id: confirmDelete.id });
                    } else {
                      deleteCoupon.mutate({ id: confirmDelete.id });
                    }
                  }}
                  disabled={deleteCustomer.isPending || deleteCoupon.isPending}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {(deleteCustomer.isPending || deleteCoupon.isPending) && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {isAr ? "حذف" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
