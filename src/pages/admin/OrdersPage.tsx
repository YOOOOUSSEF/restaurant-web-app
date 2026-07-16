import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import StatusBadge from "@/components/StatusBadge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Eye,
  CheckCircle,
  ChefHat,
  PackageCheck,
  Truck,
  Ban,
  Trash2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

const statusActions = [
  { status: "accepted", label: "Accept", icon: <CheckCircle size={14} /> },
  { status: "preparing", label: "Start Prep", icon: <ChefHat size={14} /> },
  { status: "ready", label: "Mark Ready", icon: <PackageCheck size={14} /> },
  { status: "out_for_delivery", label: "Out for Delivery", icon: <Truck size={14} /> },
  { status: "delivered", label: "Delivered", icon: <CheckCircle size={14} /> },
  { status: "cancelled", label: "Cancel", icon: <Ban size={14} /> },
];

const DELETABLE_STATUSES = new Set(["cancelled", "completed", "delivered"]);

// ── Confirmation Dialog ────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = true,
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
          >
            {/* Icon */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
              danger ? "bg-red-100" : "bg-amber-100"
            }`}>
              <AlertTriangle size={28} className={danger ? "text-red-500" : "text-amber-500"} />
            </div>

            <h3 className="text-lg font-bold text-[#2D2420] text-center mb-2">{title}</h3>
            <p className="text-sm text-[#8B7A6E] text-center mb-6 leading-relaxed">{description}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl border border-[#E8DFD3] text-[#5C4D44] font-medium text-sm hover:bg-[#F5F0E8] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  danger
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Toast Feedback ─────────────────────────────────────────
function FeedbackToast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium ${
        type === "success" ? "bg-[#6B7F3E]" : "bg-red-500"
      }`}
    >
      {type === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
      {message}
    </motion.div>
  );
}

export default function OrdersPage() {
  const { lang, t } = useI18nContext();
  const isAr = lang === "ar";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const utils = trpc.useUtils();

  // ── Confirm dialog state ──
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    type: "single" | "cancelled" | "all";
    orderId?: number;
    orderNumber?: string;
  }>({ open: false, type: "single" });

  // ── Feedback toast ──
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showFeedback = (message: string, type: "success" | "error") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const invalidateOrders = () => {
    utils.order.list.invalidate();
    utils.order.getStats.invalidate();
  };

  // ── Queries ──
  const { data: orders, isLoading } = trpc.order.list.useQuery({
    status: statusFilter || undefined,
    search: search || undefined,
    limit: 100,
  });

  const { data: orderDetail } = trpc.order.getById.useQuery(
    { id: selectedOrder?.id },
    { enabled: !!selectedOrder }
  );

  // ── Mutations ──
  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => {
      utils.order.list.invalidate();
      utils.order.getById.invalidate();
      if (selectedOrder) utils.order.getById.invalidate({ id: selectedOrder.id });
    },
  });

  const deleteOne = trpc.order.deleteOne.useMutation({
    onSuccess: (data) => {
      setConfirmState({ open: false, type: "single" });
      if (selectedOrder?.id === confirmState.orderId) setSelectedOrder(null);
      invalidateOrders();
      showFeedback(
        data.success
          ? isAr ? "تم حذف الطلب بنجاح" : "Order deleted successfully"
          : data.message ?? "Failed to delete order",
        data.success ? "success" : "error"
      );
    },
  });

  const deleteAllCancelled = trpc.order.deleteAllCancelled.useMutation({
    onSuccess: (data) => {
      setConfirmState({ open: false, type: "cancelled" });
      invalidateOrders();
      showFeedback(
        data.success
          ? isAr ? `تم حذف ${data.deleted} طلب ملغي` : `Deleted ${data.deleted} cancelled order${data.deleted !== 1 ? "s" : ""}`
          : "Failed",
        data.success ? "success" : "error"
      );
    },
  });

  const deleteAll = trpc.order.deleteAll.useMutation({
    onSuccess: () => {
      setConfirmState({ open: false, type: "all" });
      setSelectedOrder(null);
      invalidateOrders();
      showFeedback(
        isAr ? "تم حذف جميع الطلبات" : "All orders deleted",
        "success"
      );
    },
  });

  const handleStatusUpdate = (orderId: number, status: string) => {
    updateStatus.mutate({ id: orderId, status: status as any });
  };

  const handleConfirmDelete = () => {
    if (confirmState.type === "single" && confirmState.orderId) {
      deleteOne.mutate({ id: confirmState.orderId });
    } else if (confirmState.type === "cancelled") {
      deleteAllCancelled.mutate();
    } else if (confirmState.type === "all") {
      deleteAll.mutate();
    }
  };

  const isDeleting = deleteOne.isPending || deleteAllCancelled.isPending || deleteAll.isPending;

  const cancelledCount = orders?.filter((o) => o.status === "cancelled").length ?? 0;
  const deletableCount = orders?.filter((o) => DELETABLE_STATUSES.has(o.status)).length ?? 0;

  return (
    <div>
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#2D2420]">{t.orders}</h1>

        {/* Bulk delete buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {cancelledCount > 0 && (
            <button
              onClick={() => setConfirmState({ open: true, type: "cancelled" })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
            >
              <Trash2 size={15} />
              {isAr ? `حذف الملغية (${cancelledCount})` : `Delete Cancelled (${cancelledCount})`}
            </button>
          )}
          {(orders?.length ?? 0) > 0 && (
            <button
              onClick={() => setConfirmState({ open: true, type: "all" })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              <Trash2 size={15} />
              {isAr ? `حذف الكل (${orders?.length ?? 0})` : `Delete All (${orders?.length ?? 0})`}
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7A6E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "ابحث برقم الطلب أو العميل..." : "Search by order number or customer..."}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-white text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-white text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
        >
          <option value="">{t.all}</option>
          <option value="new">{t.status_new}</option>
          <option value="accepted">{t.status_accepted}</option>
          <option value="preparing">{t.status_preparing}</option>
          <option value="ready">{t.status_ready}</option>
          <option value="out_for_delivery">{t.status_out_for_delivery}</option>
          <option value="delivered">{t.status_delivered}</option>
          <option value="completed">{t.status_completed}</option>
          <option value="cancelled">{t.status_cancelled}</option>
        </select>
      </div>

      {/* ── Deletable count hint ── */}
      {deletableCount > 0 && (
        <p className="text-xs text-[#8B7A6E] mb-3 flex items-center gap-1.5">
          <Trash2 size={12} />
          {isAr
            ? `${deletableCount} طلب قابل للحذف (ملغي / منتهي / مكتمل)`
            : `${deletableCount} order${deletableCount !== 1 ? "s" : ""} eligible for deletion (cancelled / delivered / completed)`}
        </p>
      )}

      {/* ── Orders Table ── */}
      <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F0E8] text-[#5C4D44]">
                <th className="text-left px-4 py-3 font-medium">{t.orderNumber}</th>
                <th className="text-left px-4 py-3 font-medium">{isAr ? "العميل" : "Customer"}</th>
                <th className="text-left px-4 py-3 font-medium">{t.orderType}</th>
                <th className="text-left px-4 py-3 font-medium">{t.total}</th>
                <th className="text-left px-4 py-3 font-medium">{t.orderStatus}</th>
                <th className="text-left px-4 py-3 font-medium">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => {
                const isDeletable = DELETABLE_STATUSES.has(order.status);
                return (
                  <tr
                    key={order.id}
                    className="border-t border-[#F5F0E8] hover:bg-[#F5F0E8]/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[#C75C2E] text-xs">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-xs text-[#8B7A6E]">{order.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize">{order.orderType?.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{parseFloat(order.total).toFixed(2)} SAR</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* View */}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#4A7FB5] transition-colors"
                          title={isAr ? "عرض" : "View"}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Status actions for active orders */}
                        {!isDeletable && (
                          <div className="flex gap-0.5">
                            {statusActions
                              .filter((a) => a.status !== order.status)
                              .slice(0, 2)
                              .map((action) => (
                                <button
                                  key={action.status}
                                  onClick={() => handleStatusUpdate(order.id, action.status)}
                                  className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#6B7F3E] transition-colors"
                                  title={action.label}
                                >
                                  {action.icon}
                                </button>
                              ))}
                          </div>
                        )}

                        {/* Delete button for completed/cancelled/delivered */}
                        {isDeletable && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() =>
                              setConfirmState({
                                open: true,
                                type: "single",
                                orderId: order.id,
                                orderNumber: order.orderNumber,
                              })
                            }
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title={isAr ? "حذف الطلب" : "Delete order"}
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!orders || orders.length === 0) && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#8B7A6E]">
                    {t.noData}
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="w-6 h-6 border-2 border-[#C75C2E] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Order Detail Modal ── */}
      <AnimatePresence>
        {selectedOrder && orderDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[#E8DFD3] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-[#2D2420]">{orderDetail.orderNumber}</h3>
                  <StatusBadge status={orderDetail.status} />
                </div>
                <div className="flex items-center gap-2">
                  {/* Delete from modal for eligible orders */}
                  {DELETABLE_STATUSES.has(orderDetail.status) && (
                    <button
                      onClick={() => {
                        setConfirmState({
                          open: true,
                          type: "single",
                          orderId: orderDetail.id,
                          orderNumber: orderDetail.orderNumber,
                        });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={13} />
                      {isAr ? "حذف" : "Delete"}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-[#F5F0E8] rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-[#8B7A6E] uppercase tracking-wide">{isAr ? "معلومات العميل" : "Customer Info"}</p>
                  <p className="font-medium text-[#2D2420]">{orderDetail.customerName}</p>
                  <p className="text-sm text-[#5C4D44]">{orderDetail.customerPhone}</p>
                  {orderDetail.customerAddress && (
                    <p className="text-sm text-[#5C4D44]">{orderDetail.customerAddress}</p>
                  )}
                </div>

                <div className="border-t border-[#F5F0E8] pt-4">
                  <p className="text-xs text-[#8B7A6E] uppercase tracking-wide mb-2">{t.orderDetails}</p>
                  {orderDetail.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between py-1.5 text-sm">
                      <span>{item.quantity}x {isAr ? item.productNameAr : item.productNameEn}</span>
                      <span className="font-medium">{parseFloat(item.totalPrice).toFixed(2)} SAR</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#F5F0E8] pt-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-[#5C4D44]">{t.subtotal}</span><span>{parseFloat(orderDetail.subtotal || "0").toFixed(2)} SAR</span></div>
                  <div className="flex justify-between"><span className="text-[#5C4D44]">{t.tax}</span><span>{parseFloat(orderDetail.taxAmount || "0").toFixed(2)} SAR</span></div>
                  {parseFloat(orderDetail.deliveryFee || "0") > 0 && (
                    <div className="flex justify-between"><span className="text-[#5C4D44]">{t.deliveryFee}</span><span>{parseFloat(orderDetail.deliveryFee || "0").toFixed(2)} SAR</span></div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-[#F5F0E8]">
                    <span>{t.total}</span>
                    <span className="text-[#C75C2E]">{parseFloat(orderDetail.total || "0").toFixed(2)} SAR</span>
                  </div>
                </div>

                {/* Quick status actions (active orders only) */}
                {!DELETABLE_STATUSES.has(orderDetail.status) && (
                  <div className="border-t border-[#F5F0E8] pt-4">
                    <p className="text-xs text-[#8B7A6E] uppercase tracking-wide mb-2">{isAr ? "تحديث الحالة" : "Update Status"}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => { handleStatusUpdate(orderDetail.id, "completed"); setSelectedOrder(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6B7F3E] text-white text-xs font-medium hover:bg-[#5A6C34] transition-colors"
                      >
                        <CheckCircle size={14} />
                        {isAr ? "إكمال الطلب" : "Complete Order"}
                      </button>
                      {statusActions
                        .filter((a) => a.status !== orderDetail.status && a.status !== "completed")
                        .map((action) => (
                          <button
                            key={action.status}
                            onClick={() => { handleStatusUpdate(orderDetail.id, action.status); setSelectedOrder(null); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5F0E8] hover:bg-[#C75C2E] hover:text-white text-[#5C4D44] text-xs font-medium transition-colors"
                          >
                            {action.icon}
                            {action.label}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirmation Dialogs ── */}
      <ConfirmDialog
        open={confirmState.open && confirmState.type === "single"}
        title={isAr ? "حذف الطلب" : "Delete Order"}
        description={
          isAr
            ? `هل أنت متأكد من حذف الطلب ${confirmState.orderNumber ?? ""}؟ لا يمكن التراجع عن هذا الإجراء.`
            : `Are you sure you want to delete order ${confirmState.orderNumber ?? ""}? This cannot be undone.`
        }
        confirmLabel={isAr ? "نعم، احذف" : "Yes, Delete"}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmState({ open: false, type: "single" })}
        isLoading={isDeleting}
      />

      <ConfirmDialog
        open={confirmState.open && confirmState.type === "cancelled"}
        title={isAr ? "حذف جميع الملغية" : "Delete All Cancelled"}
        description={
          isAr
            ? `سيتم حذف ${cancelledCount} طلب ملغي بشكل نهائي. هل تريد المتابعة؟`
            : `This will permanently delete ${cancelledCount} cancelled order${cancelledCount !== 1 ? "s" : ""}. Continue?`
        }
        confirmLabel={isAr ? "حذف الكل" : "Delete All"}
        danger={false}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmState({ open: false, type: "cancelled" })}
        isLoading={isDeleting}
      />

      <ConfirmDialog
        open={confirmState.open && confirmState.type === "all"}
        title={isAr ? "⚠️ حذف جميع الطلبات" : "⚠️ Delete ALL Orders"}
        description={
          isAr
            ? `سيتم حذف جميع الطلبات (${orders?.length ?? 0}) بشكل نهائي ولا يمكن استرجاعها. هل أنت متأكد تمامًا؟`
            : `This will permanently delete all ${orders?.length ?? 0} orders. This action is irreversible. Are you absolutely sure?`
        }
        confirmLabel={isAr ? "نعم، احذف الكل" : "Yes, Delete Everything"}
        danger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmState({ open: false, type: "all" })}
        isLoading={isDeleting}
      />

      {/* ── Feedback Toast ── */}
      <AnimatePresence>
        {feedback && <FeedbackToast message={feedback.message} type={feedback.type} />}
      </AnimatePresence>
    </div>
  );
}
