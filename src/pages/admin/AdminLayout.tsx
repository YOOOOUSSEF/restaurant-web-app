import { Navigate, Outlet, Link, useLocation, useNavigate } from "react-router";
import { useI18nContext } from "@/i18n/I18nContext";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  CookingPot,
  Package,
  Truck,
  Users,
  Megaphone,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  Store,
} from "lucide-react";

const navItems = [
  { path: "/admin", label: "dashboard", icon: <LayoutDashboard size={18} /> },
  { path: "/admin/orders", label: "orders", icon: <ClipboardList size={18} /> },
  { path: "/admin/menu", label: "menu", icon: <UtensilsCrossed size={18} /> },
  { path: "/admin/pos", label: "pos", icon: <CookingPot size={18} /> },
  { path: "/admin/inventory", label: "inventory", icon: <Package size={18} /> },
  { path: "/admin/procurement", label: "procurement", icon: <Truck size={18} /> },
  { path: "/admin/customers", label: "customers", icon: <Users size={18} /> },
  { path: "/admin/marketing", label: "marketing", icon: <Megaphone size={18} /> },
  { path: "/admin/reports", label: "reports", icon: <BarChart3 size={18} /> },
  { path: "/admin/users", label: "users", icon: <UserCog size={18} /> },
  { path: "/admin/settings", label: "settings", icon: <Settings size={18} /> },
];

export default function AdminLayout() {
  const { lang, setLang, t, isRTL } = useI18nContext();
  const { logout, isAuthenticated, isLoading, user } = useAuth();
  const { data: profile } = trpc.restaurant.getProfile.useQuery();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8] text-[#2D2420]">
        <p className="text-sm font-medium">Loading admin area…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in?redirectUrl=/admin" replace />;
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8] px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-[#D4C8B8] bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#C75C2E]">Access denied</p>
          <h1 className="mt-3 text-2xl font-semibold text-[#2D2420]">Admin access required</h1>
          <p className="mt-2 text-sm text-[#5C4D44]">
            Sign in with an account that has admin permissions to open this area.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-6 rounded-full bg-[#C75C2E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A84A22]"
          >
            Go back home
          </button>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`min-h-screen bg-[#F5F0E8] ${isRTL ? "rtl" : "ltr"}`}>
      {/* Mobile Header */}
      <div className="lg:hidden bg-[#2D2420] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="font-bold text-lg">{t.appName}</span>
        <div className="w-6" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#2D2420] text-white transform transition-transform lg:transform-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${isRTL ? "lg:order-last" : ""} flex flex-col min-h-screen`}
        >
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <Link to="/" className="no-underline flex items-center gap-2">
              <Store size={24} className="text-[#C75C2E]" />
              <div>
                <h1 className="font-bold text-lg leading-tight text-white">
                  {profile ? (lang === "ar" ? profile.nameAr : profile.nameEn) : t.appName}
                </h1>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">
                  {profile ? t.appSubtitle : t.appSubtitle}
                </p>
              </div>
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all no-underline ${
                  isActive(item.path)
                    ? "bg-[#C75C2E] text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.icon}
                <span>{(t as any)[item.label] || item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-white/10 space-y-1">
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all w-full"
            >
              <Globe size={18} />
              <span>{lang === "en" ? "English" : "العربية"}</span>
            </button>
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all w-full"
            >
              <LogOut size={18} />
              <span>{lang === "en" ? "Logout" : "تسجيل الخروج"}</span>
            </button>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
