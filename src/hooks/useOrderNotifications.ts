import { useEffect, useRef, useCallback } from "react";

export type OrderStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "driver_assigned"
  | "on_the_way"
  | "delivered"
  | "completed"
  | "cancelled";

export interface StatusNotification {
  id: string;
  status: OrderStatus;
  orderNumber: string;
  timestamp: number;
}

interface NotificationText {
  title: { en: string; ar: string };
  message: { en: string; ar: string };
  emoji: string;
}

export const STATUS_NOTIFICATION_CONFIG: Record<OrderStatus, NotificationText> = {
  new: {
    title: { en: "Order Received!", ar: "تم استلام طلبك!" },
    message: { en: "Your order has been placed successfully.", ar: "تم تقديم طلبك بنجاح." },
    emoji: "🛒",
  },
  accepted: {
    title: { en: "Order Accepted!", ar: "تم قبول طلبك!" },
    message: { en: "Great news! The restaurant accepted your order.", ar: "بشرى سارة! قبل المطعم طلبك." },
    emoji: "✅",
  },
  preparing: {
    title: { en: "Order is Being Prepared", ar: "جاري تحضير طلبك" },
    message: { en: "Our chefs are working on your order now.", ar: "طباخونا يعملون على طلبك الآن." },
    emoji: "👨‍🍳",
  },
  ready: {
    title: { en: "Order Ready!", ar: "طلبك جاهز!" },
    message: { en: "Your order is ready for pickup or delivery.", ar: "طلبك جاهز للاستلام أو التوصيل." },
    emoji: "🎉",
  },
  out_for_delivery: {
    title: { en: "Out for Delivery!", ar: "في طريقه إليك!" },
    message: { en: "Your order is on its way to you.", ar: "طلبك في الطريق إليك." },
    emoji: "🚗",
  },
  driver_assigned: {
    title: { en: "Driver Assigned", ar: "تم تعيين سائق" },
    message: { en: "A driver has been assigned to your order.", ar: "تم تعيين سائق لطلبك." },
    emoji: "🏍️",
  },
  on_the_way: {
    title: { en: "On the Way!", ar: "في الطريق!" },
    message: { en: "Your order is heading your way right now.", ar: "طلبك في الطريق إليك الآن." },
    emoji: "📍",
  },
  delivered: {
    title: { en: "Order Delivered!", ar: "تم التسليم!" },
    message: { en: "Enjoy your meal! 😋 Don't forget to leave a review.", ar: "بالعافية! 😋 لا تنس ترك تقييمك." },
    emoji: "🏠",
  },
  completed: {
    title: { en: "Order Completed", ar: "اكتمل الطلب" },
    message: { en: "Thank you for dining with us!", ar: "شكراً لتناولك معنا!" },
    emoji: "⭐",
  },
  cancelled: {
    title: { en: "Order Cancelled", ar: "تم إلغاء الطلب" },
    message: { en: "Your order has been cancelled.", ar: "تم إلغاء طلبك." },
    emoji: "❌",
  },
};

/**
 * Request browser notification permission proactively.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Send a native browser notification.
 */
function sendBrowserNotification(
  status: OrderStatus,
  orderNumber: string,
  lang: "en" | "ar"
) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const cfg = STATUS_NOTIFICATION_CONFIG[status];
  if (!cfg) return;
  const title = `${cfg.emoji} ${lang === "ar" ? cfg.title.ar : cfg.title.en}`;
  const body = lang === "ar" ? cfg.message.ar : cfg.message.en;
  new Notification(title, {
    body: `${body} — ${orderNumber}`,
    icon: "/favicon.ico",
    tag: `order-status-${orderNumber}`,
  });
}

interface UseOrderNotificationsOptions {
  orderNumber: string | undefined;
  status: OrderStatus | undefined;
  lang: "en" | "ar";
  onNotification: (n: StatusNotification) => void;
}

/**
 * Detects order status changes and emits notifications.
 * First load silently records the current status (no toast)
 * EXCEPT for "new" and "accepted" which immediately notify the customer.
 * Subsequent changes fire a toast + browser notification.
 */
export function useOrderStatusChange({
  orderNumber,
  status,
  lang,
  onNotification,
}: UseOrderNotificationsOptions) {
  const prevStatusRef = useRef<string | undefined>(undefined);
  const isFirstLoadRef = useRef(true);

  const handleChange = useCallback(
    (newStatus: OrderStatus, num: string) => {
      sendBrowserNotification(newStatus, num, lang);
      onNotification({
        id: `${num}-${newStatus}-${Date.now()}`,
        status: newStatus,
        orderNumber: num,
        timestamp: Date.now(),
      });
    },
    [lang, onNotification]
  );

  useEffect(() => {
    if (!orderNumber || !status) return;

    if (isFirstLoadRef.current) {
      prevStatusRef.current = status;
      isFirstLoadRef.current = false;
      // For 'new' and 'accepted', immediately notify — the customer just
      // placed the order or the restaurant just accepted it, so they
      // absolutely need to see the notification right away.
      if (status === "new" || status === "accepted") {
        handleChange(status as OrderStatus, orderNumber);
      }
      return;
    }

    if (status !== prevStatusRef.current) {
      prevStatusRef.current = status;
      handleChange(status as OrderStatus, orderNumber);
    }
  }, [status, orderNumber, handleChange]);

  // Reset when order number changes
  useEffect(() => {
    prevStatusRef.current = undefined;
    isFirstLoadRef.current = true;
  }, [orderNumber]);
}
