import { useEffect, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import { getCurrencyLabel } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Store,
  MapPin,
  CreditCard,
  Users,
  Clock,
  Percent,
  Save,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

type Tab = "restaurant" | "areas" | "payment" | "users";

export default function SettingsPage() {
  const { lang, t } = useI18nContext();
  const currencyLabel = getCurrencyLabel(lang);
  const [activeTab, setActiveTab] = useState<Tab>("restaurant");
  const [profileForm, setProfileForm] = useState({
    id: 0,
    nameEn: "",
    nameAr: "",
    city: "",
    district: "",
    phone: "",
    email: "",
    openTime: "",
    closeTime: "",
    taxRate: "15.00",
  });
  const [areaForm, setAreaForm] = useState({ nameEn: "", nameAr: "", fee: "0.00", isActive: true });
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: profile } = trpc.restaurant.getProfile.useQuery();

  useEffect(() => {
    if (profile) {
      setProfileForm({
        id: profile.id,
        nameEn: profile.nameEn || "",
        nameAr: profile.nameAr || "",
        city: profile.city || "",
        district: profile.district || "",
        phone: profile.phone || "",
        email: profile.email || "",
        openTime: profile.openTime || "",
        closeTime: profile.closeTime || "",
        taxRate: profile.taxRate?.toString() || "15.00",
      });
    }
  }, [profile]);
  const { data: deliveryAreas, refetch: refetchAreas } = trpc.restaurant.listDeliveryAreas.useQuery();
  const { data: settings } = trpc.restaurant.listSettings.useQuery();
  const { data: systemUsers } = trpc.restaurant.listSystemUsers.useQuery();

  const createArea = trpc.restaurant.createDeliveryArea.useMutation({
    onSuccess: async () => {
      await utils.restaurant.listDeliveryAreas.invalidate();
      setAreaForm({ nameEn: "", nameAr: "", fee: "0.00", isActive: true });
      setEditingAreaId(null);
    },
  });
  const updateArea = trpc.restaurant.updateDeliveryArea.useMutation({
    onSuccess: async () => {
      await utils.restaurant.listDeliveryAreas.invalidate();
      setAreaForm({ nameEn: "", nameAr: "", fee: "0.00", isActive: true });
      setEditingAreaId(null);
    },
  });
  const deleteArea = trpc.restaurant.deleteDeliveryArea.useMutation({
    onSuccess: async () => {
      await utils.restaurant.listDeliveryAreas.invalidate();
    },
  });
  const updateProfile = trpc.restaurant.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.restaurant.getProfile.invalidate();
    },
  });
  const updateSetting = trpc.restaurant.updateSetting.useMutation({
    onSuccess: async () => {
      await utils.restaurant.listSettings.invalidate();
    },
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "restaurant", label: lang === "ar" ? "المطعم" : "Restaurant", icon: <Store size={16} /> },
    { key: "areas", label: lang === "ar" ? "مناطق التوصيل" : "Delivery Areas", icon: <MapPin size={16} /> },
    { key: "payment", label: lang === "ar" ? "الدفع" : "Payment", icon: <CreditCard size={16} /> },
    { key: "users", label: lang === "ar" ? "المستخدمون" : "Users", icon: <Users size={16} /> },
  ];

  const paymentSettings = settings?.filter((s) => s.group === "payment") || [];

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    branch_manager: "Branch Manager",
    cashier: "Cashier",
    kitchen: "Kitchen",
    inventory: "Inventory",
    marketing: "Marketing",
  };

  const roleColors: Record<string, string> = {
    admin: "bg-[#C75C2E] text-white",
    branch_manager: "bg-[#4A7FB5] text-white",
    cashier: "bg-[#6B7F3E] text-white",
    kitchen: "bg-[#D4A017] text-[#2D2420]",
    inventory: "bg-[#8B7A6E] text-white",
    marketing: "bg-[#9B59B6] text-white",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2D2420] mb-6">{t.settings}</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-[#C75C2E] text-white"
                : "bg-white text-[#5C4D44] border border-[#D4C8B8] hover:bg-[#F5F0E8]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Restaurant Settings */}
      {activeTab === "restaurant" && profile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-[#E8DFD3] shadow-sm space-y-6 max-w-2xl"
        >
          <div className="flex justify-end">
            <button
              onClick={() => {
                updateProfile.mutate(profileForm);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#C75C2E] text-white rounded-lg font-medium"
            >
              <Save size={16} />
              {t.save}
            </button>
          </div>
<div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
                  {lang === "ar" ? "اسم المطعم" : "Restaurant Name"}
                </label>
                <input
                  type="text"
                  value={lang === "ar" ? profileForm.nameAr : profileForm.nameEn}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      nameEn: e.target.value,
                      nameAr: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-[#F5F0E8]/50 text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
                    {lang === "ar" ? "المدينة" : "City"}
                  </label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-[#F5F0E8]/50 text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
                    {lang === "ar" ? "الحي" : "District"}
                  </label>
                  <input
                    type="text"
                    value={profileForm.district}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, district: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-[#F5F0E8]/50 text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
                    {lang === "ar" ? "الهاتف" : "Phone"}
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-[#F5F0E8]/50 text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4D44] mb-1.5">
                    {lang === "ar" ? "البريد" : "Email"}
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-[#F5F0E8]/50 text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
                  />
                </div>
              </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#5C4D44] mb-1.5">
                <Percent size={14} />
                {lang === "ar" ? "نسبة الضريبة" : "Tax Rate"}
              </label>
              <input
                type="text"
                value={profileForm.taxRate}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, taxRate: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-[#F5F0E8]/50 text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#5C4D44] mb-1.5">
                <Clock size={14} />
                {lang === "ar" ? "من" : "Open"}
              </label>
              <input
                type="text"
                value={profileForm.openTime}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, openTime: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-[#F5F0E8]/50 text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#5C4D44] mb-1.5">
                <Clock size={14} />
                {lang === "ar" ? "إلى" : "Close"}
              </label>
              <input
                type="text"
                value={profileForm.closeTime}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, closeTime: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-[#D4C8B8] bg-[#F5F0E8]/50 text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C75C2E]"
              />
            </div>
          </div>

        </motion.div>
      )}

      {/* Delivery Areas */}
      {activeTab === "areas" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm p-4">
            <h3 className="font-semibold text-[#2D2420] mb-3">{lang === "ar" ? "إدارة مناطق التوصيل" : "Delivery areas management"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={areaForm.nameEn} onChange={(e) => setAreaForm({ ...areaForm, nameEn: e.target.value })} placeholder={lang === "ar" ? "الاسم بالإنجليزية" : "Name (EN)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={areaForm.nameAr} onChange={(e) => setAreaForm({ ...areaForm, nameAr: e.target.value })} placeholder={lang === "ar" ? "الاسم بالعربية" : "Name (AR)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={areaForm.fee} onChange={(e) => setAreaForm({ ...areaForm, fee: e.target.value })} placeholder={lang === "ar" ? "الرسوم" : "Fee"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <label className="flex items-center gap-2 text-sm text-[#5C4D44]">
                <input type="checkbox" checked={areaForm.isActive} onChange={(e) => setAreaForm({ ...areaForm, isActive: e.target.checked })} />
                {lang === "ar" ? "نشط" : "Active"}
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { if (!areaForm.nameEn || !areaForm.nameAr) return; if (editingAreaId) { updateArea.mutate({ id: editingAreaId, ...areaForm }); } else { createArea.mutate(areaForm); } }} className="inline-flex items-center gap-2 rounded-lg bg-[#C75C2E] px-3 py-2 text-sm font-medium text-white">
                <Plus size={16} /> {editingAreaId ? (lang === "ar" ? "تحديث" : "Update") : (lang === "ar" ? "إضافة" : "Add")}
              </button>
              {editingAreaId && <button onClick={() => { setEditingAreaId(null); setAreaForm({ nameEn: "", nameAr: "", fee: "0.00", isActive: true }); }} className="rounded-lg border border-[#D4C8B8] px-3 py-2 text-sm">{lang === "ar" ? "إلغاء" : "Cancel"}</button>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden">
            <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F0E8] text-[#5C4D44]">
                <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "المنطقة" : "Area"}</th>
                <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الرسوم" : "Fee"}</th>
                <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {deliveryAreas?.map((area) => (
                <tr key={area.id} className="border-t border-[#F5F0E8]">
                  <td className="px-4 py-3 font-medium">{lang === "ar" ? area.nameAr : area.nameEn}</td>
                  <td className="px-4 py-3">{area.fee} {currencyLabel}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {area.isActive ? (
                        <span className="text-xs text-[#6B7F3E] bg-[#6B7F3E]/10 px-2 py-1 rounded-full">{lang === "ar" ? "نشط" : "Active"}</span>
                      ) : (
                        <span className="text-xs text-[#C0392B] bg-[#C0392B]/10 px-2 py-1 rounded-full">{lang === "ar" ? "غير نشط" : "Inactive"}</span>
                      )}
                      <button onClick={() => { setEditingAreaId(area.id); setAreaForm({ nameEn: area.nameEn || "", nameAr: area.nameAr || "", fee: area.fee?.toString() || "0.00", isActive: area.isActive ?? true }); }} className="rounded-lg border border-[#D4C8B8] p-2 text-[#4A7FB5]" title={lang === "ar" ? "تعديل" : "Edit"}><Pencil size={16} /></button>
                      <button onClick={() => deleteArea.mutate({ id: area.id })} className="rounded-lg border border-[#D4C8B8] p-2 text-[#C0392B]" title={lang === "ar" ? "حذف" : "Delete"}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </motion.div>
      )}

      {/* Payment Settings */}
      {activeTab === "payment" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm p-6 max-w-2xl"
        >
          <h3 className="font-semibold text-[#2D2420] mb-4">
            {lang === "ar" ? "طرق الدفع" : "Payment Methods"}
          </h3>
          <div className="space-y-3">
            {paymentSettings.map((setting) => (
              <div
                key={setting.key}
                className="flex items-center justify-between py-3 border-b border-[#F5F0E8] last:border-0"
              >
                <span className="text-[#2D2420] font-medium capitalize">
                  {setting.key.replace("enable_", "").replace("_", " ")}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${setting.value === "true" ? "bg-[#6B7F3E]/10 text-[#6B7F3E]" : "bg-[#C0392B]/10 text-[#C0392B]"}`}>
                    {setting.value === "true" ? (lang === "ar" ? "مفعل" : "Enabled") : (lang === "ar" ? "معطل" : "Disabled")}
                  </span>
                  <button
                    onClick={() => {
                      const nextValue = setting.value === "true" ? "false" : "true";
                      updateSetting.mutate({ key: setting.key, value: nextValue });
                    }}
                    className="rounded-lg border border-[#D4C8B8] px-3 py-1.5 text-sm"
                  >
                    {lang === "ar" ? "تبديل" : "Toggle"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* System Users */}
      {activeTab === "users" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-[#E8DFD3]">
            <h3 className="font-semibold text-[#2D2420]">{lang === "ar" ? "مستخدمي النظام" : "System Users"}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F0E8] text-[#5C4D44]">
                <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الاسم" : "Name"}</th>
                <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "البريد" : "Email"}</th>
                <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الدور" : "Role"}</th>
                <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {systemUsers?.map((user) => (
                <tr key={user.id} className="border-t border-[#F5F0E8]">
                  <td className="px-4 py-3 font-medium">{user.fullName}</td>
                  <td className="px-4 py-3 text-[#5C4D44]">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || "bg-gray-200"}`}>
                      {roleLabels[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.isActive ? (
                      <span className="text-xs text-[#6B7F3E] bg-[#6B7F3E]/10 px-2 py-1 rounded-full">{lang === "ar" ? "نشط" : "Active"}</span>
                    ) : (
                      <span className="text-xs text-[#C0392B] bg-[#C0392B]/10 px-2 py-1 rounded-full">{lang === "ar" ? "غير نشط" : "Inactive"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
