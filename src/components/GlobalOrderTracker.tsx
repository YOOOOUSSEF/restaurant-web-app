/**
 * GlobalOrderTracker
 *
 * A headless (renders nothing) component that lives inside CustomerLayout.
 * It polls the currently tracked order every 3 seconds — even when the user
 * has navigated away from TrackPage — so the header bell updates instantly.
 *
 * The tracked order number is registered in NotificationContext by TrackPage
 * whenever the user looks up an order.
 */
import { useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import { useNotifications } from "@/providers/NotificationContext";
import {
  useOrderStatusChange,
  type StatusNotification,
} from "@/hooks/useOrderNotifications";

export default function GlobalOrderTracker() {
  const { lang } = useI18nContext();
  const { trackedOrderNumber, addNotification } = useNotifications();

  // Poll every 3 seconds when there is a tracked order.
  // refetchIntervalInBackground: true keeps polling even when the tab is hidden.
  const { data: order } = trpc.order.getByNumber.useQuery(
    { orderNumber: trackedOrderNumber ?? "" },
    {
      enabled: !!trackedOrderNumber,
      refetchInterval: 3000,
      refetchIntervalInBackground: true,
      staleTime: 0,
    }
  );

  const handleNotification = useCallback(
    (n: StatusNotification) => {
      addNotification(n);
    },
    [addNotification]
  );

  // Detects status changes and fires the global notification
  useOrderStatusChange({
    orderNumber: order?.orderNumber,
    status: order?.status as any,
    lang,
    onNotification: handleNotification,
  });

  return null; // No UI rendered
}
