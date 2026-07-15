import { useState, useCallback, useMemo, useEffect } from "react";
import { trpc } from "@/providers/trpc";

export interface CartItem {
  itemType: "product" | "offer";
  productId?: number;
  offerId?: number;
  code?: string;
  nameEn: string;
  nameAr: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  selectedOptions?: string;
  selectedAdditions?: string;
  notes?: string;
}

const CART_KEY = "urbanbites-cart";

function normalizeCartItem(item: any): CartItem {
  const resolvedItemType = item?.itemType ?? (item?.offerId ? "offer" : "product");
  return {
    ...item,
    itemType: resolvedItemType,
    productId: item?.productId ?? undefined,
    offerId: item?.offerId ?? undefined,
    code: item?.code ?? item?.offerCode ?? item?.productCode ?? undefined,
    nameEn: item?.nameEn ?? "",
    nameAr: item?.nameAr ?? "",
    price: Number(item?.price ?? 0),
    quantity: Number(item?.quantity ?? 1),
    imageUrl: item?.imageUrl ?? "",
  } as CartItem;
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeCartItem) : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(globalCart);
  const { data: profile } = trpc.restaurant.getProfile.useQuery();

  useEffect(() => {
    const listener = () => setCart(globalCart);
    cartListeners.push(listener);
    return () => {
      cartListeners = cartListeners.filter((l) => l !== listener);
    };
  }, []);

  const setCartAndBroadcast = useCallback(
    (nextCart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
      const resolvedCart = typeof nextCart === "function" ? nextCart(globalCart) : nextCart;
      setGlobalCart(resolvedCart);
    },
    []
  );

  const getItemKey = (item: Pick<CartItem, "itemType" | "productId" | "offerId" | "code">) =>
    item.itemType === "offer"
      ? `offer-${item.offerId ?? item.code ?? "unknown"}`
      : `product-${item.productId ?? item.code ?? "unknown"}`;

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      setCartAndBroadcast((prev) => {
        const incomingKey = getItemKey(item);
        const existing = prev.find((i) => getItemKey(i) === incomingKey);
        if (existing) {
          return prev.map((i) =>
            getItemKey(i) === incomingKey ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    },
    [setCartAndBroadcast]
  );

  const removeItem = useCallback(
    (key: string) => {
      setCartAndBroadcast((prev) => prev.filter((i) => getItemKey(i) !== key));
    },
    [setCartAndBroadcast]
  );

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      setCartAndBroadcast((prev) => {
        if (quantity <= 0) {
          return prev.filter((i) => getItemKey(i) !== key);
        }
        return prev.map((i) =>
          getItemKey(i) === key ? { ...i, quantity } : i
        );
      });
    },
    [setCartAndBroadcast]
  );

  const clearCart = useCallback(() => {
    setCartAndBroadcast([]);
  }, [setCartAndBroadcast]);

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2),
    [cart]
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const taxRate = useMemo(() => {
    const rate = profile?.taxRate ? parseFloat(String(profile.taxRate)) : NaN;
    return Number.isFinite(rate) ? rate / 100 : 0.15;
  }, [profile?.taxRate]);

  const tax = useMemo(() => subtotal * taxRate, [subtotal, taxRate]);

  return {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    subtotal,
    tax,
    getItemKey,
  };
}

// Hook to access cart from any component via a global event
let cartListeners: (() => void)[] = [];
let globalCart: CartItem[] = loadCart();

export function getGlobalCart(): CartItem[] {
  return globalCart;
}

export function setGlobalCart(cart: CartItem[]) {
  globalCart = cart;
  saveCart(cart);
  cartListeners.forEach((fn) => fn());
}

export function useGlobalCart() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    cartListeners.push(listener);
    return () => {
      cartListeners = cartListeners.filter((l) => l !== listener);
    };
  }, []);

  const cart = globalCart;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);

  return { cart, totalItems, totalPrice };
}
