import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import { getCurrencyLabel } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ToggleLeft,
  ToggleRight,
  Tag,
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Pencil,
  Check,
  X,
} from "lucide-react";

type Tab = "products" | "categories" | "offers";

type RecipeEntityType = "product" | "offer";

// ── Recipe Manager ─────────────────────────────────────────
// Inline component managing recipes for a single product or offer.
function RecipeManager({
  entityType,
  entityId,
  lang,
}: {
  entityType: RecipeEntityType;
  entityId: number;
  lang: "en" | "ar";
}) {
  const isAr = lang === "ar";
  const utils = trpc.useUtils();
  const { data: inventory } = trpc.inventory.list.useQuery();
  const recipeFilter = entityType === "product" ? { productId: entityId } : { offerId: entityId };
  const { data: recipes, isLoading } = trpc.inventory.listRecipesWithDetails.useQuery(recipeFilter);

  const [newItemId, setNewItemId] = useState("");
  const [newQty, setNewQty] = useState("1.00");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState("");

  const invalidate = () => utils.inventory.listRecipesWithDetails.invalidate(recipeFilter);

  const createRecipe = trpc.inventory.createRecipe.useMutation({ onSuccess: () => { invalidate(); setNewItemId(""); setNewQty("1.00"); } });
  const updateRecipe = trpc.inventory.updateRecipe.useMutation({ onSuccess: () => { invalidate(); setEditingId(null); } });
  const deleteRecipe = trpc.inventory.deleteRecipe.useMutation({ onSuccess: invalidate });

  const alreadyUsed = new Set(recipes?.map((r) => r.inventoryItemId) ?? []);
  const available = inventory?.filter((i) => i.isActive && !alreadyUsed.has(i.id)) ?? [];

  return (
    <div className="border-t border-[#F0EAE0] pt-3 mt-3">
      <p className="text-xs font-semibold text-[#5C4D44] uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <FlaskConical size={12} />
        {isAr ? "المكونات (الوصفة)" : "Recipe / Ingredients"}
      </p>

      {isLoading ? (
        <div className="h-6 flex items-center">
          <div className="w-4 h-4 border-2 border-[#C75C2E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : recipes && recipes.length > 0 ? (
        <div className="space-y-1.5 mb-3">
          {recipes.map((r) => (
            <div key={r.id} className="flex items-center gap-2 bg-[#F5F0E8] rounded-lg px-3 py-1.5">
              {/* Item name */}
              <span className="flex-1 text-xs text-[#2D2420] font-medium truncate">
                {isAr ? r.inventoryItem?.nameAr : r.inventoryItem?.nameEn}
              </span>

              {/* Qty (editable) */}
              {editingId === r.id ? (
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="w-20 text-xs border border-[#C75C2E] rounded px-2 py-0.5 focus:outline-none"
                  autoFocus
                />
              ) : (
                <span className="text-xs font-mono text-[#C75C2E] whitespace-nowrap">
                  {parseFloat(r.quantityRequired ?? "0").toFixed(2)} {r.inventoryItem?.unit}
                </span>
              )}

              {/* Edit / Save / Cancel */}
              {editingId === r.id ? (
                <>
                  <button
                    onClick={() => updateRecipe.mutate({ id: r.id, quantityRequired: editQty })}
                    disabled={updateRecipe.isPending}
                    className="p-1 rounded text-[#6B7F3E] hover:bg-[#6B7F3E]/10 transition-colors"
                    title={isAr ? "حفظ" : "Save"}
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 rounded text-[#8B7A6E] hover:bg-[#8B7A6E]/10 transition-colors"
                    title={isAr ? "إلغاء" : "Cancel"}
                  >
                    <X size={13} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setEditingId(r.id); setEditQty(r.quantityRequired ?? "1.00"); }}
                  className="p-1 rounded text-[#8B7A6E] hover:text-[#C75C2E] hover:bg-[#C75C2E]/10 transition-colors"
                  title={isAr ? "تعديل" : "Edit qty"}
                >
                  <Pencil size={12} />
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => deleteRecipe.mutate({ id: r.id })}
                disabled={deleteRecipe.isPending}
                className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title={isAr ? "حذف" : "Remove"}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#B0A096] mb-2 italic">
          {isAr ? "لا توجد مكونات — أضف مكوناً أدناه" : "No ingredients yet — add one below"}
        </p>
      )}

      {/* Add ingredient row */}
      <div className="flex items-center gap-2">
        <select
          value={newItemId}
          onChange={(e) => setNewItemId(e.target.value)}
          className="flex-1 text-xs border border-[#D4C8B8] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C75C2E] min-w-0"
        >
          <option value="">{isAr ? "اختر مكوناً..." : "Pick ingredient…"}</option>
          {available.map((i) => (
            <option key={i.id} value={i.id}>
              {isAr ? i.nameAr : i.nameEn} ({i.unit})
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={newQty}
          onChange={(e) => setNewQty(e.target.value)}
          placeholder={isAr ? "الكمية" : "Qty"}
          className="w-20 text-xs border border-[#D4C8B8] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C75C2E]"
        />
        <button
          disabled={!newItemId || createRecipe.isPending}
          onClick={() =>
            createRecipe.mutate({
              ...recipeFilter,
              inventoryItemId: Number(newItemId),
              quantityRequired: parseFloat(newQty).toFixed(2),
            })
          }
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#6B7F3E] text-white text-xs font-medium hover:bg-[#5A6C34] disabled:opacity-40 transition-colors"
        >
          <Plus size={13} />
          {isAr ? "أضف" : "Add"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function MenuManagementPage() {
  const { lang, t } = useI18nContext();
  const isAr = lang === "ar";
  const currencyLabel = getCurrencyLabel(lang);
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [expandedRecipeKey, setExpandedRecipeKey] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ code: "", nameEn: "", nameAr: "" });

  const [productForm, setProductForm] = useState({
    code: "",
    categoryId: "",
    nameEn: "",
    nameAr: "",
    descriptionEn: "",
    descriptionAr: "",
    basePrice: "0.00",
    imageUrl: "",
    imageFile: null as File | null,
  });
  const [offerForm, setOfferForm] = useState({
    code: "",
    nameEn: "",
    nameAr: "",
    descriptionEn: "",
    descriptionAr: "",
    price: "0.00",
    imageUrl: "",
    imageFile: null as File | null,
  });

  const utils = trpc.useUtils();
  const { data: categories } = trpc.menu.listCategories.useQuery();
  const { data: products } = trpc.menu.listProducts.useQuery();
  const { data: offers } = trpc.restaurant.listAllOffers.useQuery();

  const createProduct = trpc.menu.createProduct.useMutation({
    onSuccess: () => {
      void utils.menu.listProducts.invalidate();
      setProductForm({ code: "", categoryId: "", nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", basePrice: "0.00", imageUrl: "", imageFile: null });
    },
  });
  const deleteProduct = trpc.menu.deleteProduct.useMutation({
    onSuccess: () => void utils.menu.listProducts.invalidate(),
  });
  const createOffer = trpc.restaurant.createOffer.useMutation({
    onSuccess: () => {
      void utils.restaurant.listAllOffers.invalidate();
      setOfferForm({ code: "", nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", price: "0.00", imageUrl: "", imageFile: null });
    },
  });
  const deleteOffer = trpc.restaurant.deleteOffer.useMutation({
    onSuccess: () => void utils.restaurant.listAllOffers.invalidate(),
  });
  const createCategory = trpc.menu.createCategory.useMutation({
    onSuccess: () => {
      void utils.menu.listCategories.invalidate();
      setCategoryForm({ code: "", nameEn: "", nameAr: "" });
    },
  });
  const deleteCategory = trpc.menu.deleteCategory.useMutation({
    onSuccess: () => void utils.menu.listCategories.invalidate(),
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "products", label: isAr ? "المنتجات" : "Products", icon: <Tag size={16} /> },
    { key: "categories", label: isAr ? "التصنيفات" : "Categories", icon: <Tag size={16} /> },
    { key: "offers", label: isAr ? "العروض" : "Offers", icon: <Sparkles size={16} /> },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2D2420] mb-6">{t.menu}</h1>

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

      {/* ── Products Tab ── */}
      {activeTab === "products" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Add product form */}
          <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-[#2D2420]">{isAr ? "إضافة منتج" : "Add product"}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={productForm.code} onChange={(e) => setProductForm({ ...productForm, code: e.target.value })} placeholder={isAr ? "الكود" : "Code"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <select value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })} className="rounded-lg border border-[#D4C8B8] px-3 py-2">
                <option value="">{isAr ? "اختر تصنيف" : "Select category"}</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{isAr ? cat.nameAr : cat.nameEn}</option>
                ))}
              </select>
              <input value={productForm.nameEn} onChange={(e) => setProductForm({ ...productForm, nameEn: e.target.value })} placeholder={isAr ? "الاسم بالإنجليزية" : "Name (EN)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={productForm.nameAr} onChange={(e) => setProductForm({ ...productForm, nameAr: e.target.value })} placeholder={isAr ? "الاسم بالعربية" : "Name (AR)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={productForm.descriptionEn} onChange={(e) => setProductForm({ ...productForm, descriptionEn: e.target.value })} placeholder={isAr ? "الوصف بالإنجليزية" : "Description (EN)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={productForm.descriptionAr} onChange={(e) => setProductForm({ ...productForm, descriptionAr: e.target.value })} placeholder={isAr ? "الوصف بالعربية" : "Description (AR)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={productForm.basePrice} onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })} placeholder={isAr ? "السعر" : "Price"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[#5C4D44]">{isAr ? "صورة المنتج" : "Product image"}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProductForm({ ...productForm, imageFile: e.target.files?.[0] ?? null })}
                  className="rounded-lg border border-[#D4C8B8] px-3 py-2"
                />
              </div>
            </div>
            <button
              onClick={async () => {
                if (!productForm.code || !productForm.nameEn || !productForm.nameAr) return;
                let imageUrl = productForm.imageUrl;
                if (productForm.imageFile) {
                  const formData = new FormData();
                  formData.append("file", productForm.imageFile);
                  const response = await fetch("/api/upload", { method: "POST", body: formData });
                  const data = await response.json();
                  if (response.ok && data.url) imageUrl = data.url;
                }
                createProduct.mutate({
                  code: productForm.code,
                  categoryId: productForm.categoryId ? Number(productForm.categoryId) : undefined,
                  nameEn: productForm.nameEn,
                  nameAr: productForm.nameAr,
                  descriptionEn: productForm.descriptionEn,
                  descriptionAr: productForm.descriptionAr,
                  basePrice: productForm.basePrice,
                  imageUrl,
                });
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#C75C2E] px-3 py-2 text-sm font-medium text-white"
            >
              <Plus size={16} /> {isAr ? "إضافة" : "Add"}
            </button>
          </div>

          {/* Products list with recipe panels */}
          <div className="space-y-3">
            {products?.map((product) => {
              const category = categories?.find((c) => c.id === product.categoryId);
              const recipeKey = `product-${product.id}`;
              const isExpanded = expandedRecipeKey === recipeKey;

              return (
                <div key={product.id} className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden">
                  {/* Product row */}
                  <div className="flex items-center gap-4 px-4 py-3">
                    <img
                      src={product.imageUrl || "/burger-classic.jpg"}
                      alt={product.nameEn}
                      className="w-12 h-12 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-[#C75C2E]">{product.code}</span>
                        {category && (
                          <span className="bg-[#F5F0E8] text-[#5C4D44] px-2 py-0.5 rounded-full text-xs">
                            {isAr ? category.nameAr : category.nameEn}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-[#2D2420] mt-0.5 truncate">
                        {isAr ? product.nameAr : product.nameEn}
                      </div>
                      <div className="text-xs text-[#8B7A6E] line-clamp-1">
                        {isAr ? product.descriptionAr : product.descriptionEn}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold text-[#C75C2E] text-sm">
                        {parseFloat(product.basePrice).toFixed(2)} {currencyLabel}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                        {/* Recipe toggle */}
                        <button
                          onClick={() => setExpandedRecipeKey(isExpanded ? null : recipeKey)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isExpanded
                              ? "bg-[#6B7F3E] text-white border-[#6B7F3E]"
                              : "bg-[#F5F0E8] text-[#5C4D44] border-[#D4C8B8] hover:bg-[#E8DFD3]"
                          }`}
                          title={isAr ? "المكونات" : "Recipe"}
                        >
                          <FlaskConical size={13} />
                          {isAr ? "الوصفة" : "Recipe"}
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {/* Status toggle */}
                        {product.isActive ? (
                          <span className="text-[#6B7F3E]"><ToggleRight size={20} /></span>
                        ) : (
                          <span className="text-[#8B7A6E]"><ToggleLeft size={20} /></span>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => deleteProduct.mutate({ id: product.id })}
                          className="rounded-lg border border-[#D4C8B8] p-1.5 text-[#C0392B] transition-colors hover:bg-[#F5F0E8]"
                          title={isAr ? "حذف المنتج" : "Delete product"}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Recipe panel */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="recipe"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <RecipeManager entityType="product" entityId={product.id} lang={lang} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Categories Tab ── */}
      {activeTab === "categories" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm p-4">
            <h2 className="text-lg font-semibold text-[#2D2420] mb-3">
              {isAr ? "إضافة تصنيف" : "Add category"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={categoryForm.code}
                onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                placeholder={isAr ? "الكود (اختياري)" : "Code (optional)"}
                className="rounded-lg border border-[#D4C8B8] px-3 py-2"
              />
              <input
                value={categoryForm.nameEn}
                onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
                placeholder={isAr ? "الاسم بالإنجليزية" : "Name (EN)"}
                className="rounded-lg border border-[#D4C8B8] px-3 py-2"
              />
              <input
                value={categoryForm.nameAr}
                onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })}
                placeholder={isAr ? "الاسم بالعربية" : "Name (AR)"}
                className="rounded-lg border border-[#D4C8B8] px-3 py-2"
              />
            </div>
            <button
              onClick={() => {
                if (!categoryForm.nameEn.trim() || !categoryForm.nameAr.trim()) return;
                createCategory.mutate({
                  code: categoryForm.code || undefined,
                  nameEn: categoryForm.nameEn,
                  nameAr: categoryForm.nameAr,
                });
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#C75C2E] px-3 py-2 text-sm font-medium text-white"
            >
              <Plus size={16} /> {isAr ? "إضافة" : "Add"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories?.map((cat) => {
              const productCount = products?.filter((p) => p.categoryId === cat.id).length || 0;

              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-xl p-5 border border-[#E8DFD3] shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-[#C75C2E]">{cat.code}</span>
                    <button
                      onClick={() => deleteCategory.mutate({ id: cat.id })}
                      className="rounded-lg border border-[#D4C8B8] p-1.5 text-[#C0392B] transition-colors hover:bg-[#F5F0E8]"
                      title={isAr ? "حذف التصنيف" : "Delete category"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 className="font-semibold text-[#2D2420]">{isAr ? cat.nameAr : cat.nameEn}</h3>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="bg-[#F5F0E8] text-[#5C4D44] px-2 py-1 rounded-full text-xs">
                      {productCount} {isAr ? "منتج" : "products"}
                    </span>
                    {cat.isActive ? (
                      <span className="text-xs text-[#6B7F3E] bg-[#6B7F3E]/10 px-2 py-1 rounded-full">{isAr ? "نشط" : "Active"}</span>
                    ) : (
                      <span className="text-xs text-[#C0392B] bg-[#C0392B]/10 px-2 py-1 rounded-full">{isAr ? "غير نشط" : "Inactive"}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Offers Tab ── */}
      {activeTab === "offers" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Add offer form */}
          <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm p-4">
            <h2 className="text-lg font-semibold text-[#2D2420] mb-3">{isAr ? "إضافة عرض" : "Add offer"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={offerForm.code} onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value })} placeholder={isAr ? "الكود" : "Code"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={offerForm.nameEn} onChange={(e) => setOfferForm({ ...offerForm, nameEn: e.target.value })} placeholder={isAr ? "الاسم بالإنجليزية" : "Name (EN)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={offerForm.nameAr} onChange={(e) => setOfferForm({ ...offerForm, nameAr: e.target.value })} placeholder={isAr ? "الاسم بالعربية" : "Name (AR)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={offerForm.descriptionEn} onChange={(e) => setOfferForm({ ...offerForm, descriptionEn: e.target.value })} placeholder={isAr ? "الوصف بالإنجليزية" : "Description (EN)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={offerForm.descriptionAr} onChange={(e) => setOfferForm({ ...offerForm, descriptionAr: e.target.value })} placeholder={isAr ? "الوصف بالعربية" : "Description (AR)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={offerForm.price} onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })} placeholder={isAr ? "السعر" : "Price"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm text-[#5C4D44]">{isAr ? "صورة العرض" : "Offer image"}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setOfferForm({ ...offerForm, imageFile: e.target.files?.[0] ?? null })}
                  className="rounded-lg border border-[#D4C8B8] px-3 py-2"
                />
              </div>
            </div>
            <button
              onClick={async () => {
                if (!offerForm.nameEn || !offerForm.nameAr) return;
                let imageUrl = offerForm.imageUrl;
                if (offerForm.imageFile) {
                  const formData = new FormData();
                  formData.append("file", offerForm.imageFile);
                  const response = await fetch("/api/upload", { method: "POST", body: formData });
                  const data = await response.json();
                  if (response.ok && data.url) imageUrl = data.url;
                }
                createOffer.mutate({
                  code: offerForm.code || undefined,
                  nameEn: offerForm.nameEn,
                  nameAr: offerForm.nameAr,
                  descriptionEn: offerForm.descriptionEn,
                  descriptionAr: offerForm.descriptionAr,
                  price: offerForm.price,
                  imageUrl,
                });
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#C75C2E] px-3 py-2 text-sm font-medium text-white"
            >
              <Plus size={16} /> {isAr ? "إضافة" : "Add"}
            </button>
          </div>

          {/* Offers list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers?.map((offer) => {
              const recipeKey = `offer-${offer.id}`;
              const isExpanded = expandedRecipeKey === recipeKey;

              return (
                <div
                  key={offer.id}
                  className="bg-gradient-to-br from-[#C75C2E] to-[#A84A22] rounded-xl p-5 text-white shadow-lg overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{isAr ? offer.nameAr : offer.nameEn}</h3>
                      <p className="text-white/80 text-sm mt-1">{isAr ? offer.descriptionAr : offer.descriptionEn}</p>
                    </div>
                    <button
                      onClick={() => deleteOffer.mutate({ id: offer.id })}
                      className="rounded-lg border border-white/20 bg-white/10 p-2 transition-colors hover:bg-white/20"
                      title={isAr ? "حذف العرض" : "Delete offer"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {offer.imageUrl ? (
                    <img src={offer.imageUrl} alt={isAr ? offer.nameAr : offer.nameEn} className="w-full h-32 object-cover rounded-lg mt-3" />
                  ) : null}
                  <div className="flex items-center justify-between mt-4 gap-2">
                    <span className="text-2xl font-bold">{offer.price} {currencyLabel}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedRecipeKey(isExpanded ? null : recipeKey)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                          isExpanded
                            ? "border-white bg-white text-[#C75C2E]"
                            : "border-white/30 bg-white/10 text-white hover:bg-white/20"
                        }`}
                        title={isAr ? "الوصفة" : "Recipe"}
                      >
                        <FlaskConical size={13} />
                        {isAr ? "الوصفة" : "Recipe"}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      <span className={`text-xs px-2 py-1 rounded-full ${offer.isActive ? "bg-white/20" : "bg-black/20"}`}>
                        {offer.isActive ? (isAr ? "نشط" : "Active") : (isAr ? "غير نشط" : "Inactive")}
                      </span>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="recipe"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 rounded-xl border border-[#E8DFD3] bg-[#FFF8F1] p-3 text-[#2D2420] shadow-sm">
                          <RecipeManager entityType="offer" entityId={offer.id} lang={lang} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
