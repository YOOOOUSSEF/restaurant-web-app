import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import { getCurrencyLabel } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import { motion } from "framer-motion";
import {
  ClipboardList,
  DollarSign,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const statCards = [
  { key: "totalOrders", icon: <ClipboardList size={20} />, color: "bg-[#C75C2E]" },
  { key: "totalRevenue", icon: <DollarSign size={20} />, color: "bg-[#6B7F3E]" },
  { key: "lowStockAlerts", icon: <AlertTriangle size={20} />, color: "bg-[#D4A017]" },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.08 } },
};

export default function DashboardPage() {
  const { lang, t } = useI18nContext();
  const currencyLabel = getCurrencyLabel(lang);
  const { data: stats } = trpc.dashboard.getStats.useQuery();
  const { data: salesData } = trpc.dashboard.getSalesChart.useQuery({ days: 7 });
  const { data: topProducts } = trpc.dashboard.getTopProducts.useQuery({ limit: 5 });
  const { data: ordersByHour } = trpc.dashboard.getOrdersByHour.useQuery();
  const { data: recentOrders } = trpc.order.getRecent.useQuery({ limit: 10 });

  const statValues: Record<string, string> = {
    totalOrders: stats?.totalOrders?.toString() || "0",
    totalRevenue: `${parseFloat(stats?.totalRevenue || "0").toFixed(0)} ${currencyLabel}`,
    lowStockAlerts: stats?.lowStockAlerts?.toString() || "0",
  };

  const todayRevenue = parseFloat(stats?.todayRevenue || "0").toFixed(0);
  const todayOrders = stats?.todayOrders || 0;
  const topProductsChartData = (topProducts || []).map((product: any) => ({
    name: product?.name || "Unknown",
    quantity: Number(product?.quantity || 0),
    revenue: Number(product?.revenue || 0),
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2420]">{t.dashboard}</h1>
          <p className="text-sm text-[#8B7A6E] mt-1">
            {lang === "ar" ? "نظرة عامة على أداء مطعمك" : "Overview of your restaurant performance"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#5C4D44]">
          <Clock size={14} />
          <span>{t.today}: {todayOrders} {t.orders} &middot; {todayRevenue} {currencyLabel}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {statCards.map((card) => (
          <motion.div
            key={card.key}
            variants={fadeInUp}
            className="bg-white rounded-xl p-5 border border-[#E8DFD3] shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B7A6E] font-medium">
                  {(t as any)[card.key] || card.key}
                </p>
                <p className="text-2xl font-bold text-[#2D2420] mt-1">
                  {statValues[card.key]}
                </p>
              </div>
              <div className={`${card.color} text-white p-2.5 rounded-lg`}>
                {card.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Chart */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="show"
          className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm"
        >
          <h3 className="font-semibold text-[#2D2420] mb-4">{t.salesOverview}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={salesData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8DFD3" />
              <XAxis dataKey="date" stroke="#8B7A6E" fontSize={12} />
              <YAxis stroke="#8B7A6E" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #E8DFD3", borderRadius: "8px" }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#C75C2E" strokeWidth={2} dot={{ fill: "#C75C2E" }} />
              <Line type="monotone" dataKey="orders" stroke="#6B7F3E" strokeWidth={2} dot={{ fill: "#6B7F3E" }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Products */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="show"
          className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm"
        >
          <h3 className="font-semibold text-[#2D2420] mb-4">{t.topProducts}</h3>
          {topProductsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProductsChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DFD3" />
                <XAxis type="number" stroke="#8B7A6E" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#8B7A6E" fontSize={11} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #E8DFD3", borderRadius: "8px" }}
                />
                <Bar dataKey="quantity" fill="#C75C2E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-[#8B7A6E]">
              {lang === "ar" ? "لا توجد بيانات للمنتجات حتى الآن" : "No top product data yet"}
            </div>
          )}
        </motion.div>
      </div>

      {/* Orders by Hour */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="show"
        className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm mb-6"
      >
        <h3 className="font-semibold text-[#2D2420] mb-4">{t.ordersByHour}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ordersByHour || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8DFD3" />
            <XAxis dataKey="hour" stroke="#8B7A6E" fontSize={10} />
            <YAxis stroke="#8B7A6E" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #E8DFD3", borderRadius: "8px" }}
            />
            <Bar dataKey="count" fill="#4A7FB5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recent Orders */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="show"
        className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-[#E8DFD3] flex items-center justify-between">
          <h3 className="font-semibold text-[#2D2420]">{t.recentOrders}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F0E8] text-[#5C4D44]">
                <th className="text-left px-6 py-3 font-medium">{t.orderNumber}</th>
                <th className="text-left px-6 py-3 font-medium">{lang === "ar" ? "العميل" : "Customer"}</th>
                <th className="text-left px-6 py-3 font-medium">{t.paymentMethod}</th>
                <th className="text-left px-6 py-3 font-medium">{t.total}</th>
                <th className="text-left px-6 py-3 font-medium">{t.orderStatus}</th>
                <th className="text-left px-6 py-3 font-medium">{lang === "ar" ? "الوقت" : "Time"}</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders?.map((order) => (
                <tr key={order.id} className="border-t border-[#F5F0E8] hover:bg-[#F5F0E8]/50 transition-colors">
                  <td className="px-6 py-3 font-mono text-[#C75C2E]">{order.orderNumber}</td>
                  <td className="px-6 py-3">{order.customerName}</td>
                  <td className="px-6 py-3 uppercase">{order.paymentMethod}</td>
                  <td className="px-6 py-3 font-semibold">{parseFloat(order.total).toFixed(2)} {currencyLabel}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-3 text-[#8B7A6E]">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))}
              {(!recentOrders || recentOrders.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#8B7A6E]">{t.noData}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
