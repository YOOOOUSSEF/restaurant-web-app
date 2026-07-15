import { Routes, Route, Navigate } from "react-router";
import { I18nProvider } from "./i18n/I18nContext";
import { TRPCProvider } from "@/providers/trpc";

// Customer Pages
import CustomerLayout from "./pages/customer/CustomerLayout";
import MenuPage from "./pages/customer/MenuPage";
import CartPage from "./pages/customer/CartPage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import TrackPage from "./pages/customer/TrackPage";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import OrdersPage from "./pages/admin/OrdersPage";
import MenuManagementPage from "./pages/admin/MenuManagementPage";
import PosPage from "./pages/admin/PosPage";
import InventoryPage from "./pages/admin/InventoryPage";
import CustomersPage from "./pages/admin/CustomersPage";
import SettingsPage from "./pages/admin/SettingsPage";
import PlaceholderPage from "./pages/admin/PlaceholderPage";

// Auth
import Login from "./pages/Login";
import SignInPage from "./pages/SignIn";
import SignUpPage from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/hooks/useAuth";

// Placeholder pages for unimplemented routes
const ProcurementPage = () => <PlaceholderPage title="Procurement" />;
const MarketingPage = () => <PlaceholderPage title="Marketing" />;
const ReportsPage = () => <PlaceholderPage title="Reports" />;
const UsersPage = () => <PlaceholderPage title="Users" />;

function RootRedirect() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={isAdmin ? "/admin" : "/menu"} replace />;
}

export default function App() {
  return (
    <TRPCProvider>
      <I18nProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          {/* Customer Routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/track" element={<TrackPage />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="menu" element={<MenuManagementPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="procurement" element={<ProcurementPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="marketing" element={<MarketingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </I18nProvider>
    </TRPCProvider>
  );
}
