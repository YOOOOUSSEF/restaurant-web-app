import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { StatusNotification } from "@/hooks/useOrderNotifications";

export interface AppNotification extends StatusNotification {
  read: boolean;
}

const STORAGE_KEY = "restaurant-web-app.notifications";
const MAX_NOTIFICATIONS = 50;

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: StatusNotification) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  /** The order number currently being tracked globally (set by TrackPage) */
  trackedOrderNumber: string | null;
  setTrackedOrderNumber: (n: string | null) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AppNotification[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((n): n is AppNotification => Boolean(n && typeof n.id === "string"))
        .slice(0, MAX_NOTIFICATIONS);
    } catch {
      return [];
    }
  });

  const [trackedOrderNumber, setTrackedOrderNumber] = useState<string | null>(null);

  // Persist notifications to localStorage on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((n: StatusNotification) => {
    setNotifications((prev) => {
      if (prev.some((p) => p.id === n.id)) return prev;
      return [{ ...n, read: false }, ...prev].slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAllRead,
        markRead,
        clearAll,
        trackedOrderNumber,
        setTrackedOrderNumber,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
