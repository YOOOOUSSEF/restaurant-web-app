import { useMemo, useState } from "react";
import { resolveInventoryMovementItemName } from "@/lib/inventory-movements";
import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import { motion } from "framer-motion";
import {
  Package,
  AlertTriangle,
  Truck,
  TrendingDown,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

type Tab = "inventory" | "suppliers" | "movements";

export default function InventoryPage() {
  const { lang, t } = useI18nContext();
  const [activeTab, setActiveTab] = useState<Tab>("inventory");
  const [itemForm, setItemForm] = useState({
    code: "",
    nameEn: "",
    nameAr: "",
    unit: "kg",
    currentStock: "0.00",
    minThreshold: "10.00",
    costPerUnit: "",
    isActive: true,
  });
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    isActive: true,
  });
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: inventory, refetch: refetchInventory } = trpc.inventory.list.useQuery();
  const { data: lowStock } = trpc.inventory.getLowStock.useQuery();
  const { data: suppliers, refetch: refetchSuppliers } = trpc.inventory.listSuppliers.useQuery();
  const { data: movements } = trpc.inventory.getMovements.useQuery();
  const createItem = trpc.inventory.createItem.useMutation({
    onSuccess: async () => {
      await utils.inventory.list.invalidate();
      await utils.inventory.getLowStock.invalidate();
      setItemForm({ code: "", nameEn: "", nameAr: "", unit: "kg", currentStock: "0.00", minThreshold: "10.00", costPerUnit: "", isActive: true });
      setEditingItemId(null);
    },
  });
  const updateItem = trpc.inventory.updateItem.useMutation({
    onSuccess: async () => {
      await utils.inventory.list.invalidate();
      await utils.inventory.getLowStock.invalidate();
      setItemForm({ code: "", nameEn: "", nameAr: "", unit: "kg", currentStock: "0.00", minThreshold: "10.00", costPerUnit: "", isActive: true });
      setEditingItemId(null);
    },
  });
  const deleteItem = trpc.inventory.deleteItem.useMutation({
    onSuccess: async () => {
      await utils.inventory.list.invalidate();
      await utils.inventory.getLowStock.invalidate();
    },
  });
  const updateQuantity = trpc.inventory.updateItem.useMutation({
    onSuccess: async () => {
      await utils.inventory.list.invalidate();
      await utils.inventory.getLowStock.invalidate();
      await utils.inventory.getMovements.invalidate();
    },
  });
  const updateMovement = trpc.inventory.updateMovement.useMutation({
    onSuccess: async () => {
      await utils.inventory.list.invalidate();
      await utils.inventory.getLowStock.invalidate();
      await utils.inventory.getMovements.invalidate();
    },
  });
  const createSupplier = trpc.inventory.createSupplier.useMutation({
    onSuccess: async () => {
      await utils.inventory.listSuppliers.invalidate();
      setSupplierForm({ name: "", contactPerson: "", phone: "", email: "", address: "", isActive: true });
      setEditingSupplierId(null);
    },
  });
  const updateSupplier = trpc.inventory.updateSupplier.useMutation({
    onSuccess: async () => {
      await utils.inventory.listSuppliers.invalidate();
      setSupplierForm({ name: "", contactPerson: "", phone: "", email: "", address: "", isActive: true });
      setEditingSupplierId(null);
    },
  });
  const deleteSupplier = trpc.inventory.deleteSupplier.useMutation({
    onSuccess: async () => {
      await utils.inventory.listSuppliers.invalidate();
    },
  });

  const editingItem = useMemo(() => inventory?.find((item) => item.id === editingItemId) ?? null, [inventory, editingItemId]);
  const [quantityInput, setQuantityInput] = useState<Record<number, string>>({});
  const [movementQuantityInput, setMovementQuantityInput] = useState<Record<number, string>>({});

  const getStatus = (item: any) => {
    const stock = parseFloat(item.currentStock);
    const threshold = parseFloat(item.minThreshold || "0");
    if (stock <= threshold * 0.5) return "critical";
    if (stock <= threshold) return "low";
    return "ok";
  };

  const statusColors: Record<string, string> = {
    ok: "bg-[#6B7F3E]",
    low: "bg-[#D4A017]",
    critical: "bg-[#C0392B]",
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "inventory", label: lang === "ar" ? "المخزون" : "Inventory", icon: <Package size={16} /> },
    { key: "suppliers", label: lang === "ar" ? "الموردون" : "Suppliers", icon: <Truck size={16} /> },
    { key: "movements", label: lang === "ar" ? "الحركات" : "Movements", icon: <TrendingDown size={16} /> },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2D2420] mb-2">{t.inventory}</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-[#E8DFD3] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8B7A6E]">{lang === "ar" ? "إجمالي المواد" : "Total Materials"}</p>
              <p className="text-2xl font-bold text-[#2D2420]">{inventory?.length || 0}</p>
            </div>
            <div className="bg-[#4A7FB5] text-white p-2.5 rounded-lg">
              <Package size={18} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#E8DFD3] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8B7A6E]">{lang === "ar" ? "منخفض المخزون" : "Low Stock"}</p>
              <p className="text-2xl font-bold text-[#D4A017]">{lowStock?.length || 0}</p>
            </div>
            <div className="bg-[#D4A017] text-white p-2.5 rounded-lg">
              <AlertTriangle size={18} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#E8DFD3] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8B7A6E]">{lang === "ar" ? "الموردون" : "Suppliers"}</p>
              <p className="text-2xl font-bold text-[#2D2420]">{suppliers?.length || 0}</p>
            </div>
            <div className="bg-[#6B7F3E] text-white p-2.5 rounded-lg">
              <Truck size={18} />
            </div>
          </div>
        </div>
      </div>

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

      {/* Inventory Tab */}
      {activeTab === "inventory" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-[#2D2420]">{lang === "ar" ? "إدارة المخزون" : "Inventory management"}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={itemForm.code} onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })} placeholder={lang === "ar" ? "الكود" : "Code"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={itemForm.nameEn} onChange={(e) => setItemForm({ ...itemForm, nameEn: e.target.value })} placeholder={lang === "ar" ? "الاسم بالإنجليزية" : "Name (EN)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={itemForm.nameAr} onChange={(e) => setItemForm({ ...itemForm, nameAr: e.target.value })} placeholder={lang === "ar" ? "الاسم بالعربية" : "Name (AR)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder={lang === "ar" ? "الوحدة" : "Unit"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={itemForm.currentStock} onChange={(e) => setItemForm({ ...itemForm, currentStock: e.target.value })} placeholder={lang === "ar" ? "المخزون الحالي" : "Current stock"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={itemForm.minThreshold} onChange={(e) => setItemForm({ ...itemForm, minThreshold: e.target.value })} placeholder={lang === "ar" ? "الحد الأدنى" : "Min threshold"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={itemForm.costPerUnit} onChange={(e) => setItemForm({ ...itemForm, costPerUnit: e.target.value })} placeholder={lang === "ar" ? "التكلفة لكل وحدة" : "Cost per unit"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <label className="flex items-center gap-2 text-sm text-[#5C4D44]">
                <input type="checkbox" checked={itemForm.isActive} onChange={(e) => setItemForm({ ...itemForm, isActive: e.target.checked })} />
                {lang === "ar" ? "نشط" : "Active"}
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  if (!itemForm.code || !itemForm.nameEn || !itemForm.nameAr) return;
                  if (editingItemId) {
                    updateItem.mutate({ id: editingItemId, ...itemForm });
                  } else {
                    createItem.mutate(itemForm);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C75C2E] px-3 py-2 text-sm font-medium text-white"
              >
                <Plus size={16} /> {editingItemId ? (lang === "ar" ? "تحديث" : "Update") : (lang === "ar" ? "إضافة" : "Add")}
              </button>
              {editingItemId && (
                <button onClick={() => { setEditingItemId(null); setItemForm({ code: "", nameEn: "", nameAr: "", unit: "kg", currentStock: "0.00", minThreshold: "10.00", costPerUnit: "", isActive: true }); }} className="rounded-lg border border-[#D4C8B8] px-3 py-2 text-sm">{lang === "ar" ? "إلغاء" : "Cancel"}</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F0E8] text-[#5C4D44]">
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الكود" : "Code"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "المادة" : "Item"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "المخزون" : "Stock"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الوحدة" : "Unit"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الحد الأدنى" : "Min"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {inventory?.map((item) => {
                  const status = getStatus(item);
                  return (
                    <tr key={item.id} className="border-t border-[#F5F0E8] hover:bg-[#F5F0E8]/50">
                      <td className="px-4 py-3 font-mono text-xs text-[#C75C2E]">{item.code}</td>
                      <td className="px-4 py-3 font-medium">{lang === "ar" ? item.nameAr : item.nameEn}</td>
                      <td className="px-4 py-3">{item.currentStock}</td>
                      <td className="px-4 py-3 text-[#8B7A6E]">{item.unit}</td>
                      <td className="px-4 py-3 text-[#8B7A6E]">{item.minThreshold}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white ${statusColors[status]}`}>
                            {status === "ok" ? "OK" : status === "low" ? "Low" : "Critical"}
                          </span>
                          <button
                            onClick={() => {
                              setEditingItemId(item.id);
                              setItemForm({
                                code: item.code || "",
                                nameEn: item.nameEn || "",
                                nameAr: item.nameAr || "",
                                unit: item.unit || "kg",
                                currentStock: item.currentStock?.toString() || "0.00",
                                minThreshold: item.minThreshold?.toString() || "10.00",
                                costPerUnit: item.costPerUnit?.toString() || "",
                                isActive: item.isActive ?? true,
                              });
                            }}
                            className="rounded-lg border border-[#D4C8B8] p-2 text-[#4A7FB5]"
                            title={lang === "ar" ? "تعديل" : "Edit"}
                          >
                            <Pencil size={16} />
                          </button>
                          <div className="flex items-center gap-1 rounded-lg border border-[#D4C8B8] px-2 py-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={quantityInput[item.id] ?? ""}
                              onChange={(e) => setQuantityInput((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder={lang === "ar" ? "كمية" : "Qty"}
                              className="w-16 border-none bg-transparent text-sm outline-none"
                            />
                            <button
                              onClick={() => {
                                const parsed = parseFloat(quantityInput[item.id] ?? "0");
                                if (Number.isNaN(parsed) || parsed <= 0) return;
                                updateQuantity.mutate({ id: item.id, currentStock: (parseFloat(item.currentStock || "0") + parsed).toFixed(2) });
                                setQuantityInput((prev) => ({ ...prev, [item.id]: "" }));
                              }}
                              className="rounded bg-[#6B7F3E] px-2 py-1 text-[11px] font-semibold text-white"
                            >
                              {lang === "ar" ? "إضافة" : "Add"}
                            </button>
                          </div>
                          <button
                            onClick={() => deleteItem.mutate({ id: item.id })}
                            className="rounded-lg border border-[#D4C8B8] p-2 text-[#C0392B]"
                            title={lang === "ar" ? "حذف" : "Delete"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Suppliers Tab */}
      {activeTab === "suppliers" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm p-4">
            <h2 className="text-lg font-semibold text-[#2D2420] mb-3">{lang === "ar" ? "إدارة الموردين" : "Supplier management"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} placeholder={lang === "ar" ? "الاسم" : "Name"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={supplierForm.contactPerson} onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} placeholder={lang === "ar" ? "الشخص المسؤول" : "Contact person"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} placeholder={lang === "ar" ? "الهاتف" : "Phone"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} placeholder={lang === "ar" ? "البريد" : "Email"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} placeholder={lang === "ar" ? "العنوان" : "Address"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <label className="flex items-center gap-2 text-sm text-[#5C4D44]">
                <input type="checkbox" checked={supplierForm.isActive} onChange={(e) => setSupplierForm({ ...supplierForm, isActive: e.target.checked })} />
                {lang === "ar" ? "نشط" : "Active"}
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { if (!supplierForm.name) return; if (editingSupplierId) { updateSupplier.mutate({ id: editingSupplierId, ...supplierForm }); } else { createSupplier.mutate(supplierForm); } }} className="inline-flex items-center gap-2 rounded-lg bg-[#C75C2E] px-3 py-2 text-sm font-medium text-white">
                <Plus size={16} /> {editingSupplierId ? (lang === "ar" ? "تحديث" : "Update") : (lang === "ar" ? "إضافة" : "Add")}
              </button>
              {editingSupplierId && <button onClick={() => { setEditingSupplierId(null); setSupplierForm({ name: "", contactPerson: "", phone: "", email: "", address: "", isActive: true }); }} className="rounded-lg border border-[#D4C8B8] px-3 py-2 text-sm">{lang === "ar" ? "إلغاء" : "Cancel"}</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers?.map((supplier) => (
              <div key={supplier.id} className="bg-white rounded-xl p-5 border border-[#E8DFD3] shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#2D2420]">{supplier.name}</h3>
                    <p className="text-sm text-[#5C4D44] mt-1">{supplier.contactPerson}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingSupplierId(supplier.id); setSupplierForm({ name: supplier.name || "", contactPerson: supplier.contactPerson || "", phone: supplier.phone || "", email: supplier.email || "", address: supplier.address || "", isActive: supplier.isActive ?? true }); }} className="rounded-lg border border-[#D4C8B8] p-2 text-[#4A7FB5]" title={lang === "ar" ? "تعديل" : "Edit"}><Pencil size={16} /></button>
                    <button onClick={() => deleteSupplier.mutate({ id: supplier.id })} className="rounded-lg border border-[#D4C8B8] p-2 text-[#C0392B]" title={lang === "ar" ? "حذف" : "Delete"}><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-[#8B7A6E]">
                  <p>{supplier.phone}</p>
                  <p>{supplier.email}</p>
                  <p>{supplier.address}</p>
                </div>
                <div className="mt-3">
                  {supplier.isActive ? (
                    <span className="text-xs text-[#6B7F3E] bg-[#6B7F3E]/10 px-2 py-1 rounded-full">{lang === "ar" ? "نشط" : "Active"}</span>
                  ) : (
                    <span className="text-xs text-[#C0392B] bg-[#C0392B]/10 px-2 py-1 rounded-full">{lang === "ar" ? "غير نشط" : "Inactive"}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Movements Tab */}
      {activeTab === "movements" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F0E8] text-[#5C4D44]">
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "النوع" : "Type"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الكمية" : "Quantity"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "السبب" : "Reason"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "المرجع" : "Reference"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الوقت" : "Time"}</th>
                </tr>
              </thead>
              <tbody>
                {movements?.map((m) => (
                  <tr key={m.id} className="border-t border-[#F5F0E8] hover:bg-[#F5F0E8]/50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          m.movementType === "in" ? "bg-[#6B7F3E]/10 text-[#6B7F3E]" :
                          m.movementType === "out" ? "bg-[#C75C2E]/10 text-[#C75C2E]" :
                          m.movementType === "waste" ? "bg-[#C0392B]/10 text-[#C0392B]" :
                          "bg-[#D4A017]/10 text-[#D4A017]"
                        }`}>
                          {m.movementType === "in" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {m.movementType}
                        </span>
                        <span className="text-xs text-[#5C4D44] font-medium">
                          {resolveInventoryMovementItemName({
                            inventoryItemName: m.inventoryItemName,
                            inventoryItemNameAr: m.inventoryItemNameAr,
                            inventoryItemCode: m.inventoryItemCode,
                          }, lang === "ar" ? "ar" : "en")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={movementQuantityInput[m.id] ?? String(m.quantity ?? "")}
                          onChange={(e) => setMovementQuantityInput((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          className="w-20 rounded border border-[#D4C8B8] px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => {
                            const parsed = parseFloat(movementQuantityInput[m.id] ?? String(m.quantity ?? "0"));
                            if (Number.isNaN(parsed) || parsed < 0) return;
                            updateMovement.mutate({
                              id: m.id,
                              quantity: parsed.toFixed(2),
                              movementType: m.movementType,
                              reason: m.reason ?? undefined,
                              referenceType: m.referenceType ?? undefined,
                              referenceId: m.referenceId ?? undefined,
                            });
                          }}
                          className="rounded bg-[#4A7FB5] px-2 py-1 text-[11px] font-semibold text-white"
                        >
                          {lang === "ar" ? "حفظ" : "Save"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#5C4D44]">{m.reason || "-"}</td>
                    <td className="px-4 py-3 text-[#8B7A6E]">{m.referenceType || "-"}</td>
                    <td className="px-4 py-3 text-[#8B7A6E]">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))}
                {(!movements || movements.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#8B7A6E]">{t.noData}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
