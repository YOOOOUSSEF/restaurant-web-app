import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Trash2,
  Package,
  ChefHat,
  CheckCircle,
  Truck,
  Home,
  Star,
  XCircle,
  Clock,
} from "lucide-react";
import { useNotifications } from "@/providers/NotificationContext";
import type { AppNotification } from "@/providers/NotificationContext";
import {
  STATUS_NOTIFICATION_CONFIG,
  type OrderStatus,
} from "@/hooks/useOrderNotifications";

// ── Per-status icon map ────────────────────────────────────
const STATUS_ICON: Record<OrderStatus, React.ReactNode> = {
  new: <Package size={14} />,
  accepted: <CheckCircle size={14} />,
  preparing: <ChefHat size={14} />,
  ready: <CheckCircle size={14} />,
  out_for_delivery: <Truck size={14} />,
  driver_assigned: <Truck size={14} />,
  on_the_way: <Truck size={14} />,
  delivered: <Home size={14} />,
  completed: <Star size={14} />,
  cancelled: <XCircle size={14} />,
};

const STATUS_COLORS: Record<OrderStatus, { icon: string; dot: string }> = {
  new: { icon: "bg-blue-100 text-blue-600", dot: "bg-blue-500" },
  accepted: { icon: "bg-purple-100 text-purple-600", dot: "bg-purple-500" },
  preparing: { icon: "bg-orange-100 text-orange-600", dot: "bg-orange-500" },
  ready: { icon: "bg-green-100 text-green-600", dot: "bg-green-500" },
  out_for_delivery: { icon: "bg-teal-100 text-teal-600", dot: "bg-teal-500" },
  driver_assigned: { icon: "bg-cyan-100 text-cyan-600", dot: "bg-cyan-500" },
  on_the_way: { icon: "bg-teal-100 text-teal-600", dot: "bg-teal-500" },
  delivered: { icon: "bg-emerald-100 text-emerald-600", dot: "bg-emerald-500" },
  completed: { icon: "bg-yellow-100 text-yellow-600", dot: "bg-yellow-500" },
  cancelled: { icon: "bg-red-100 text-red-600", dot: "bg-red-500" },
};

function timeAgo(timestamp: number, isAr: boolean): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return isAr ? "الآن" : "Just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return isAr ? `منذ ${m} د` : `${m}m ago`;
  }
  const h = Math.floor(diff / 3600);
  return isAr ? `منذ ${h} س` : `${h}h ago`;
}

function NotificationItem({
  n,
  lang,
  onRead,
}: {
  n: AppNotification;
  lang: "en" | "ar";
  onRead: (id: string) => void;
}) {
  const isAr = lang === "ar";
  const cfg = STATUS_NOTIFICATION_CONFIG[n.status];
  const colors = STATUS_COLORS[n.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
      onClick={() => onRead(n.id)}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[#FAF7F2] ${
        !n.read ? "bg-[#FDF9F5]" : "bg-white"
      }`}
    >
      {/* Status icon */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colors.icon}`}>
        {STATUS_ICON[n.status]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${!n.read ? "font-semibold text-[#2D2420]" : "font-medium text-[#5C4D44]"}`}>
          {cfg.emoji} {isAr ? cfg.title.ar : cfg.title.en}
        </p>
        <p className="text-xs text-[#8B7A6E] mt-0.5 leading-relaxed">
          {isAr ? cfg.message.ar : cfg.message.en}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock size={10} className="text-[#B0A096]" />
          <span className="text-[10px] text-[#B0A096]">{timeAgo(n.timestamp, isAr)}</span>
          <span className="text-[10px] text-[#B0A096]">·</span>
          <span className="text-[10px] font-mono text-[#B0A096]">{n.orderNumber}</span>
        </div>
      </div>

      {/* Unread dot */}
      {!n.read && (
        <div className={`w-2 h-2 rounded-full shrink-0 mt-2 ${colors.dot}`} />
      )}
    </motion.div>
  );
}

interface Props {
  lang: "en" | "ar";
}

export default function NotificationCenter({ lang }: Props) {
  const isAr = lang === "ar";
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  // Track previous unread count to trigger bell wiggle on new notifications
  const prevUnreadRef = useRef(0);
  const [wiggle, setWiggle] = useState(false);

  // Wiggle bell when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setWiggle(true);
      const t = setTimeout(() => setWiggle(false), 700);
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllRead();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearAll();
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        id="notification-center-btn"
        aria-label={isAr ? "مركز الإشعارات" : "Notification Center"}
        className={`relative flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${
          open
            ? "bg-[#C75C2E] border-[#C75C2E] text-white shadow-lg shadow-[#C75C2E]/30"
            : "bg-white border-[#D4C8B8] text-[#5C4D44] hover:bg-[#E8DFD3]"
        }`}
      >
        <Bell
          size={17}
          style={wiggle ? { animation: "wiggle 0.6s ease-in-out" } : undefined}
        />

        {/* Red badge — Facebook style */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm border-2 border-[#F5F0E8] pointer-events-none"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`absolute top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-[#E8DFD3] overflow-hidden z-[200] ${
              isAr ? "left-0" : "right-0"
            }`}
            style={{ maxHeight: "480px" }}
            dir={isAr ? "rtl" : "ltr"}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0EAE0] bg-gradient-to-r from-[#FDF9F5] to-white">
              <div>
                <p className="font-bold text-sm text-[#2D2420]">
                  {isAr ? "الإشعارات" : "Notifications"}
                </p>
                {unreadCount > 0 && (
                  <p className="text-[10px] text-[#C75C2E] font-medium mt-0.5">
                    {isAr ? `${unreadCount} غير مقروء` : `${unreadCount} unread`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    title={isAr ? "تحديد الكل كمقروء" : "Mark all as read"}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[#5C4D44] hover:bg-[#F0EAE0] transition-colors text-[11px] font-medium"
                  >
                    <CheckCheck size={13} />
                    {isAr ? "الكل مقروء" : "Mark read"}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClear}
                    title={isAr ? "مسح الكل" : "Clear all"}
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-[#8B7A6E] hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: "380px" }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#F5F0E8] flex items-center justify-center mb-3">
                    <Bell size={24} className="text-[#D4C8B8]" />
                  </div>
                  <p className="text-sm font-medium text-[#8B7A6E]">
                    {isAr ? "لا توجد إشعارات" : "No notifications yet"}
                  </p>
                  <p className="text-xs text-[#B0A096] mt-1">
                    {isAr
                      ? "ستظهر تحديثات طلبك هنا تلقائيًا"
                      : "Order status updates will appear here automatically"}
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((n, idx) => (
                    <div key={n.id}>
                      <NotificationItem n={n} lang={lang} onRead={markRead} />
                      {idx < notifications.length - 1 && (
                        <div className="mx-4 h-px bg-[#F5F0E8]" />
                      )}
                    </div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-[#F0EAE0] bg-[#FDFAF6]">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-[10px] text-center text-[#B0A096]">
                    {isAr ? "يتجدد كل 3 ثوانٍ" : "Live — updates every 3s"}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
