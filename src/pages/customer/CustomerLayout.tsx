import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useI18nContext } from "@/i18n/I18nContext";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import ZigzagDivider from "@/components/ZigzagDivider";
import NotificationCenter from "@/components/NotificationCenter";
import GlobalOrderTracker from "@/components/GlobalOrderTracker";
import { ShoppingCart, Globe, LogOut } from "lucide-react";
import { useState } from "react";

const steps = [
  { path: "/", label: "MENU", num: "01" },
  { path: "/cart", label: "CART", num: "02" },
  { path: "/checkout", label: "CHECKOUT", num: "03" },
  { path: "/track", label: "TRACK", num: "04" },
];

export default function CustomerLayout() {
  const { lang, setLang, t, isRTL } = useI18nContext();
  const { totalItems, totalPrice } = useCart();
  const { logout, isAuthenticated } = useAuth();
  const { data: profile } = trpc.restaurant.getProfile.useQuery();
  const navigate = useNavigate();
  const location = useLocation();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const currentPath = location.pathname;

  return (
    <div className={`min-h-screen bg-[#F5F0E8] ${isRTL ? "rtl" : "ltr"}`}>
      {/* Global order status tracker — polls every 3s regardless of active page */}
      <GlobalOrderTracker />
      {/* Header */}
      <header className="bg-[#F5F0E8] border-b border-[#D4C8B8] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <Link to="/" className="no-underline">
              <h1 className="text-2xl font-bold text-[#2D2420] tracking-tight">
                {profile ? (lang === "ar" ? profile.nameAr : profile.nameEn) : t.appName}
              </h1>
            </Link>
            <p className="text-xs text-[#5C4D44] mt-0.5">
              {t.branch} &middot; {t.openUntil} {profile?.closeTime ?? "1:00 AM"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D4C8B8] bg-white text-[#2D2420] text-sm hover:bg-[#E8DFD3] transition-colors"
              >
                <Globe size={14} />
                {lang === "en" ? "EN" : "عربي"}
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-[#D4C8B8] rounded-lg shadow-lg py-1 min-w-[100px] z-50">
                  <button
                    onClick={() => { setLang("en"); setLangMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F5F0E8] ${lang === "en" ? "font-semibold text-[#C75C2E]" : "text-[#2D2420]"}`}
                  >
                    {t.en}
                  </button>
                  <button
                    onClick={() => { setLang("ar"); setLangMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F5F0E8] ${lang === "ar" ? "font-semibold text-[#C75C2E]" : "text-[#2D2420]"}`}
                  >
                    {t.ar}
                  </button>
                </div>
              )}
            </div>

            {/* Notification Center */}
            <NotificationCenter lang={lang} />

            {/* Cart Badge */}
            <Link to="/cart" className="no-underline">
              <div className="flex items-center gap-2 bg-[#C75C2E] text-white px-4 py-2 rounded-full hover:bg-[#A84A22] transition-colors">
                <ShoppingCart size={16} />
                <span className="text-sm font-medium">
                  {totalItems} {t.items} &middot; {parseFloat(totalPrice).toFixed(2)} SAR
                </span>
              </div>
            </Link>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="flex items-center gap-2 rounded-full border border-[#D4C8B8] bg-white px-3 py-2 text-sm text-[#2D2420] transition-colors hover:bg-[#E8DFD3]"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <ZigzagDivider height={16} />

      {/* Step Progress Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-4">
        <div className="grid grid-cols-4 gap-2">
          {steps.map((step) => {
            const isActive = currentPath === step.path;
            return (
              <Link key={step.path} to={step.path} className="no-underline">
                <div
                  className={`text-center py-3 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-[#C75C2E] text-white shadow-md"
                      : "bg-white text-[#5C4D44] border border-[#D4C8B8] hover:bg-[#E8DFD3]"
                  }`}
                >
                  <div className={`text-xs font-semibold mb-0.5 ${isActive ? "text-white/80" : "text-[#8B7A6E]"}`}>
                    {step.num}
                  </div>
                  <div className="text-xs font-semibold tracking-wider">
                    {(t as any)[step.label.toLowerCase()] || step.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#2D2420] text-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-lg font-bold">{t.appName}</p>
          <p className="text-sm text-white/60 mt-1">{t.appSubtitle}</p>
          <p className="text-xs text-white/40 mt-3">
            &copy; 2026 Urban Bites. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
