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
} from "lucide-react";

const statusActions = [
  { status: "accepted", label: "Accept", icon: <CheckCircle size={14} /> },
  { status: "preparing", label: "Start Prep", icon: <ChefHat size={14} /> },
  { status: "ready", label: "Mark Ready", icon: <PackageCheck size={14} /> },
  { status: "out_for_delivery", label: "Out for Delivery", icon: <Truck size={14} /> },
  { status: "delivered", label: "Delivered", icon: <CheckCircle size={14} /> },
  { status: "cancelled", label: "Cancel", icon: <Ban size={14} /> },
];

export default function OrdersPage() {
  const { lang, t } = useI18nContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: orders, isLoading } = trpc.order.list.useQuery({
    status: statusFilter || undefined,
    search: search || undefined,
    limit: 50,
  });

  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => {
      utils.order.list.invalidate();
      utils.order.getById.invalidate();
      if (selectedOrder) {
        utils.order.getById.invalidate({ id: selectedOrder.id });
      }
    },
  });

  const { data: orderDetail } = trpc.order.getById.useQuery(
    { id: selectedOrder?.id },
    { enabled: !!selectedOrder }
  );

  const handleStatusUpdate = (orderId: number, status: string) => {
    updateStatus.mutate({ id: orderId, status: status as any });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2D2420] mb-6">{t.orders}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7A6E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث برقم الطلب أو العميل..." : "Search by order number or customer..."}
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
          <option value="cancelled">{t.status_cancelled}</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F0E8] text-[#5C4D44]">
                <th className="text-left px-4 py-3 font-medium">{t.orderNumber}</th>
                <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "العميل" : "Customer"}</th>
                <th className="text-left px-4 py-3 font-medium">{t.orderType}</th>
                <th className="text-left px-4 py-3 font-medium">{t.total}</th>
                <th className="text-left px-4 py-3 font-medium">{t.orderStatus}</th>
                <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.id} className="border-t border-[#F5F0E8] hover:bg-[#F5F0E8]/50">
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
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#4A7FB5] transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      {order.status !== "cancelled" && order.status !== "completed" && (
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
                    </div>
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#8B7A6E]">{t.noData}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
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
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-[#F5F0E8] rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-[#8B7A6E] uppercase tracking-wide">{lang === "ar" ? "معلومات العميل" : "Customer Info"}</p>
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
                      <span>{item.quantity}x {lang === "ar" ? item.productNameAr : item.productNameEn}</span>
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

                {/* Quick Actions */}
                {orderDetail.status !== "cancelled" && orderDetail.status !== "completed" && (
                  <div className="border-t border-[#F5F0E8] pt-4">
                    <p className="text-xs text-[#8B7A6E] uppercase tracking-wide mb-2">{lang === "ar" ? "تحديث الحالة" : "Update Status"}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          handleStatusUpdate(orderDetail.id, "completed");
                          setSelectedOrder(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6B7F3E] text-white text-xs font-medium transition-colors hover:bg-[#5A6C34]"
                      >
                        <CheckCircle size={14} />
                        {lang === "ar" ? "إكمال الطلب" : "Complete Order"}
                      </button>
                      {statusActions
                        .filter((a) => a.status !== orderDetail.status && a.status !== "completed")
                        .map((action) => (
                          <button
                            key={action.status}
                            onClick={() => {
                              handleStatusUpdate(orderDetail.id, action.status);
                              setSelectedOrder(null);
                            }}
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
    </div>
  );
}
