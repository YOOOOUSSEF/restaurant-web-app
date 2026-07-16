import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, XCircle, Truck, ChefHat, Package, Star, Home } from "lucide-react";
import {
  type StatusNotification,
  STATUS_NOTIFICATION_CONFIG,
  type OrderStatus,
} from "@/hooks/useOrderNotifications";

interface Props {
  notifications: StatusNotification[];
  lang: "en" | "ar";
  onDismiss: (id: string) => void;
}

const STATUS_ICON: Record<OrderStatus, React.ReactNode> = {
  new: <Package size={20} />,
  accepted: <CheckCircle size={20} />,
  preparing: <ChefHat size={20} />,
  ready: <CheckCircle size={20} />,
  out_for_delivery: <Truck size={20} />,
  driver_assigned: <Truck size={20} />,
  on_the_way: <Truck size={20} />,
  delivered: <Home size={20} />,
  completed: <Star size={20} />,
  cancelled: <XCircle size={20} />,
};

const STATUS_COLORS: Record<OrderStatus, { bg: string; border: string; icon: string; progress: string }> = {
  new: {
    bg: "from-blue-50 to-blue-100/60",
    border: "border-blue-200",
    icon: "bg-blue-500 text-white",
    progress: "bg-blue-500",
  },
  accepted: {
    bg: "from-purple-50 to-purple-100/60",
    border: "border-purple-200",
    icon: "bg-purple-500 text-white",
    progress: "bg-purple-500",
  },
  preparing: {
    bg: "from-orange-50 to-orange-100/60",
    border: "border-orange-200",
    icon: "bg-orange-500 text-white",
    progress: "bg-orange-500",
  },
  ready: {
    bg: "from-green-50 to-green-100/60",
    border: "border-green-200",
    icon: "bg-green-500 text-white",
    progress: "bg-green-500",
  },
  out_for_delivery: {
    bg: "from-teal-50 to-teal-100/60",
    border: "border-teal-200",
    icon: "bg-teal-500 text-white",
    progress: "bg-teal-500",
  },
  driver_assigned: {
    bg: "from-cyan-50 to-cyan-100/60",
    border: "border-cyan-200",
    icon: "bg-cyan-500 text-white",
    progress: "bg-cyan-500",
  },
  on_the_way: {
    bg: "from-teal-50 to-teal-100/60",
    border: "border-teal-200",
    icon: "bg-teal-500 text-white",
    progress: "bg-teal-500",
  },
  delivered: {
    bg: "from-emerald-50 to-emerald-100/60",
    border: "border-emerald-200",
    icon: "bg-emerald-500 text-white",
    progress: "bg-emerald-500",
  },
  completed: {
    bg: "from-yellow-50 to-yellow-100/60",
    border: "border-yellow-200",
    icon: "bg-yellow-500 text-white",
    progress: "bg-yellow-500",
  },
  cancelled: {
    bg: "from-red-50 to-red-100/60",
    border: "border-red-200",
    icon: "bg-red-500 text-white",
    progress: "bg-red-500",
  },
};

const TOAST_DURATION_MS = 6000;

function ToastItem({
  notification,
  lang,
  onDismiss,
}: {
  notification: StatusNotification;
  lang: "en" | "ar";
  onDismiss: (id: string) => void;
}) {
  const cfg = STATUS_NOTIFICATION_CONFIG[notification.status];
  const colors = STATUS_COLORS[notification.status];
  const isAr = lang === "ar";

  // Auto-dismiss after TOAST_DURATION_MS
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: isAr ? -80 : 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: isAr ? -60 : 60, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`relative w-80 rounded-2xl border bg-gradient-to-br ${colors.bg} ${colors.border} shadow-xl overflow-hidden`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-1 ${colors.progress} opacity-60`}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: TOAST_DURATION_MS / 1000, ease: "linear" }}
      />

      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.icon} shadow-md`}>
          {STATUS_ICON[notification.status]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 leading-tight">
            {cfg.emoji} {isAr ? cfg.title.ar : cfg.title.en}
          </p>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
            {isAr ? cfg.message.ar : cfg.message.en}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-mono">
            {notification.orderNumber}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={() => onDismiss(notification.id)}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors"
          aria-label="Dismiss"
        >
          <X size={12} />
        </button>
      </div>
    </motion.div>
  );
}

export default function OrderStatusToast({ notifications, lang, onDismiss }: Props) {
  const isAr = lang === "ar";

  return (
    <div
      className={`fixed bottom-6 z-[9999] flex flex-col gap-3 pointer-events-none ${
        isAr ? "left-4 items-start" : "right-4 items-end"
      }`}
      style={{ maxWidth: "320px" }}
    >
      <AnimatePresence mode="sync">
        {notifications.map((n) => (
          <div key={n.id} className="pointer-events-auto">
            <ToastItem notification={n} lang={lang} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
