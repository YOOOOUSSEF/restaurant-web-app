import { Link, useNavigate } from "react-router";
import { useI18nContext } from "@/i18n/I18nContext";
import { useCart } from "@/hooks/useCart";
import { motion } from "framer-motion";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const { t } = useI18nContext();
  const { cart, removeItem, updateQuantity, clearCart, subtotal, tax } = useCart();
  const navigate = useNavigate();

  const getCartKey = (item: any) =>
    item.itemType === "offer"
      ? `offer-${item.offerId ?? item.code ?? "unknown"}`
      : `product-${item.productId ?? item.code ?? "unknown"}`;

  const deliveryFee = 0;
  const discount = 0;
  const total = subtotal + tax + deliveryFee - discount;

  if (cart.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingBag size={64} className="mx-auto text-[#D4C8B8] mb-4" />
        <h2 className="text-xl font-semibold text-[#2D2420] mb-2">{t.emptyCart}</h2>
        <Link
          to="/"
          className="inline-block mt-4 px-6 py-2.5 bg-[#C75C2E] text-white rounded-full font-medium hover:bg-[#A84A22] transition-colors no-underline"
        >
          {t.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-[#2D2420]">{t.yourCart}</h2>
          <button
            onClick={clearCart}
            className="text-sm text-[#C0392B] hover:text-[#C0392B]/80 font-medium transition-colors"
          >
            {t.clearCart}
          </button>
        </div>

        {cart.map((item, index) => {
          const cartKey = getCartKey(item);
          return (
            <motion.div
              key={cartKey}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 bg-white rounded-xl p-4 border border-[#E8DFD3] shadow-sm"
            >
              {item.itemType === "product" ? (
                <img
                  src={item.imageUrl || "/burger-classic.jpg"}
                  alt={item.nameEn}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-[#F5F0E8] border border-dashed border-[#D4C8B8]" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#2D2420] truncate">
                  {item.nameEn}
                </h3>
                <p className="text-[#C75C2E] font-bold mt-1">
                  {item.price.toFixed(2)} SAR
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(cartKey, item.quantity - 1)}
                  className="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center hover:bg-[#E8DFD3] transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-semibold text-[#2D2420]">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(cartKey, item.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center hover:bg-[#E8DFD3] transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="text-right min-w-[80px]">
                <p className="font-bold text-[#2D2420]">
                  {(item.price * item.quantity).toFixed(2)} SAR
                </p>
              </div>

              <button
                onClick={() => removeItem(cartKey)}
                className="p-2 text-[#C0392B] hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm sticky top-40">
          <h3 className="font-bold text-lg text-[#2D2420] mb-4">{t.cartTotal}</h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5C4D44]">{t.subtotal}</span>
              <span className="font-medium text-[#2D2420]">{subtotal.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5C4D44]">{t.tax}</span>
              <span className="font-medium text-[#2D2420]">{tax.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5C4D44]">{t.deliveryFee}</span>
              <span className="font-medium text-[#2D2420]">{deliveryFee.toFixed(2)} SAR</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[#C75C2E]">
                <span>{t.discount}</span>
                <span className="font-medium">-{discount.toFixed(2)} SAR</span>
              </div>
            )}
          </div>

          <div className="border-t border-[#E8DFD3] mt-4 pt-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#2D2420]">{t.total}</span>
              <span className="text-2xl font-bold text-[#C75C2E]">{total.toFixed(2)} SAR</span>
            </div>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="w-full mt-6 py-3 bg-[#C75C2E] text-white rounded-full font-semibold hover:bg-[#A84A22] active:scale-[0.98] transition-all"
          >
            {t.proceedToCheckout}
          </button>

          <Link
            to="/"
            className="block text-center mt-3 text-sm text-[#5C4D44] hover:text-[#C75C2E] transition-colors no-underline"
          >
            {t.continueShopping}
          </Link>
        </div>
      </div>
    </div>
  );
}
