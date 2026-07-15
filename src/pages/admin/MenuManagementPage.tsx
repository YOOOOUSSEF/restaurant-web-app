import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import { motion } from "framer-motion";
import { ToggleLeft, ToggleRight, Tag, Sparkles, Plus, Trash2 } from "lucide-react";

type Tab = "products" | "categories" | "offers";

export default function MenuManagementPage() {
  const { lang, t } = useI18nContext();
  const [activeTab, setActiveTab] = useState<Tab>("products");
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
  });

  const utils = trpc.useUtils();
  const { data: categories } = trpc.menu.listCategories.useQuery();
  const { data: products, refetch: refetchProducts } = trpc.menu.listProducts.useQuery();
  const { data: offers, refetch: refetchOffers } = trpc.restaurant.listAllOffers.useQuery();
  const createProduct = trpc.menu.createProduct.useMutation({
    onSuccess: () => {
      void utils.menu.listProducts.invalidate();
      setProductForm({ code: "", categoryId: "", nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", basePrice: "0.00", imageUrl: "", imageFile: null });
    },
  });
  const deleteProduct = trpc.menu.deleteProduct.useMutation({
    onSuccess: () => {
      void utils.menu.listProducts.invalidate();
    },
  });
  const createOffer = trpc.restaurant.createOffer.useMutation({
    onSuccess: () => {
      void utils.restaurant.listAllOffers.invalidate();
      setOfferForm({ code: "", nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", price: "0.00" });
    },
  });
  const deleteOffer = trpc.restaurant.deleteOffer.useMutation({
    onSuccess: () => {
      void utils.restaurant.listAllOffers.invalidate();
    },
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "products", label: lang === "ar" ? "المنتجات" : "Products", icon: <Tag size={16} /> },
    { key: "categories", label: lang === "ar" ? "التصنيفات" : "Categories", icon: <Tag size={16} /> },
    { key: "offers", label: lang === "ar" ? "العروض" : "Offers", icon: <Sparkles size={16} /> },
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

      {/* Products Tab */}
      {activeTab === "products" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-[#2D2420]">{lang === "ar" ? "إضافة منتج" : "Add product"}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={productForm.code} onChange={(e) => setProductForm({ ...productForm, code: e.target.value })} placeholder={lang === "ar" ? "الكود" : "Code"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <select value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })} className="rounded-lg border border-[#D4C8B8] px-3 py-2">
                <option value="">{lang === "ar" ? "اختر تصنيف" : "Select category"}</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{lang === "ar" ? cat.nameAr : cat.nameEn}</option>
                ))}
              </select>
              <input value={productForm.nameEn} onChange={(e) => setProductForm({ ...productForm, nameEn: e.target.value })} placeholder={lang === "ar" ? "الاسم بالإنجليزية" : "Name (EN)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={productForm.nameAr} onChange={(e) => setProductForm({ ...productForm, nameAr: e.target.value })} placeholder={lang === "ar" ? "الاسم بالعربية" : "Name (AR)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={productForm.descriptionEn} onChange={(e) => setProductForm({ ...productForm, descriptionEn: e.target.value })} placeholder={lang === "ar" ? "الوصف بالإنجليزية" : "Description (EN)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={productForm.descriptionAr} onChange={(e) => setProductForm({ ...productForm, descriptionAr: e.target.value })} placeholder={lang === "ar" ? "الوصف بالعربية" : "Description (AR)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={productForm.basePrice} onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })} placeholder={lang === "ar" ? "السعر" : "Price"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[#5C4D44]">{lang === "ar" ? "صورة المنتج" : "Product image"}</label>
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
                  const response = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                  });
                  const data = await response.json();
                  if (response.ok && data.url) {
                    imageUrl = data.url;
                  } else {
                    console.error("Image upload failed", data);
                  }
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
              <Plus size={16} /> {lang === "ar" ? "إضافة" : "Add"}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F0E8] text-[#5C4D44]">
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الصورة" : "Image"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الكود" : "Code"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الاسم" : "Name"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "التصنيف" : "Category"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "السعر" : "Price"}</th>
                  <th className="text-left px-4 py-3 font-medium">{lang === "ar" ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {products?.map((product) => {
                  const category = categories?.find((c) => c.id === product.categoryId);
                  return (
                    <tr key={product.id} className="border-t border-[#F5F0E8] hover:bg-[#F5F0E8]/50">
                      <td className="px-4 py-3">
                        <img
                          src={product.imageUrl || "/burger-classic.jpg"}
                          alt={product.nameEn}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#C75C2E]">{product.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#2D2420]">{lang === "ar" ? product.nameAr : product.nameEn}</div>
                        <div className="text-xs text-[#8B7A6E] line-clamp-1">
                          {lang === "ar" ? product.descriptionAr : product.descriptionEn}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-[#F5F0E8] text-[#5C4D44] px-2 py-1 rounded-full text-xs">
                          {category ? (lang === "ar" ? category.nameAr : category.nameEn) : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#C75C2E]">{parseFloat(product.basePrice).toFixed(2)} SAR</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {product.isActive ? (
                            <span className="text-[#6B7F3E] flex items-center gap-1">
                              <ToggleRight size={18} />
                            </span>
                          ) : (
                            <span className="text-[#8B7A6E]">
                              <ToggleLeft size={18} />
                            </span>
                          )}
                          <button
                            onClick={() => deleteProduct.mutate({ id: product.id })}
                            className="rounded-lg border border-[#D4C8B8] p-2 text-[#C0392B] transition-colors hover:bg-[#F5F0E8]"
                            title={lang === "ar" ? "حذف المنتج" : "Delete product"}
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

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {categories?.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-xl p-5 border border-[#E8DFD3] shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-[#C75C2E]">{cat.code}</span>
                <span className="bg-[#F5F0E8] text-[#5C4D44] px-2 py-0.5 rounded-full text-xs">
                  {products?.filter((p) => p.categoryId === cat.id).length || 0} {lang === "ar" ? "منتج" : "products"}
                </span>
              </div>
              <h3 className="font-semibold text-[#2D2420]">{lang === "ar" ? cat.nameAr : cat.nameEn}</h3>
              <div className="flex items-center gap-2 mt-3">
                {cat.isActive ? (
                  <span className="text-xs text-[#6B7F3E] bg-[#6B7F3E]/10 px-2 py-1 rounded-full">{lang === "ar" ? "نشط" : "Active"}</span>
                ) : (
                  <span className="text-xs text-[#C0392B] bg-[#C0392B]/10 px-2 py-1 rounded-full">{lang === "ar" ? "غير نشط" : "Inactive"}</span>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Offers Tab */}
      {activeTab === "offers" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-xl border border-[#E8DFD3] shadow-sm p-4">
            <h2 className="text-lg font-semibold text-[#2D2420] mb-3">{lang === "ar" ? "إضافة عرض" : "Add offer"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={offerForm.code} onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value })} placeholder={lang === "ar" ? "الكود" : "Code"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={offerForm.nameEn} onChange={(e) => setOfferForm({ ...offerForm, nameEn: e.target.value })} placeholder={lang === "ar" ? "الاسم بالإنجليزية" : "Name (EN)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={offerForm.nameAr} onChange={(e) => setOfferForm({ ...offerForm, nameAr: e.target.value })} placeholder={lang === "ar" ? "الاسم بالعربية" : "Name (AR)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={offerForm.descriptionEn} onChange={(e) => setOfferForm({ ...offerForm, descriptionEn: e.target.value })} placeholder={lang === "ar" ? "الوصف بالإنجليزية" : "Description (EN)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={offerForm.descriptionAr} onChange={(e) => setOfferForm({ ...offerForm, descriptionAr: e.target.value })} placeholder={lang === "ar" ? "الوصف بالعربية" : "Description (AR)"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
              <input value={offerForm.price} onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })} placeholder={lang === "ar" ? "السعر" : "Price"} className="rounded-lg border border-[#D4C8B8] px-3 py-2" />
            </div>
            <button
              onClick={() => {
                if (!offerForm.nameEn || !offerForm.nameAr) return;
                createOffer.mutate({
                  code: offerForm.code || undefined,
                  nameEn: offerForm.nameEn,
                  nameAr: offerForm.nameAr,
                  descriptionEn: offerForm.descriptionEn,
                  descriptionAr: offerForm.descriptionAr,
                  price: offerForm.price,
                });
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#C75C2E] px-3 py-2 text-sm font-medium text-white"
            >
              <Plus size={16} /> {lang === "ar" ? "إضافة" : "Add"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers?.map((offer) => (
              <div
                key={offer.id}
                className="bg-gradient-to-br from-[#C75C2E] to-[#A84A22] rounded-xl p-5 text-white shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-lg">{lang === "ar" ? offer.nameAr : offer.nameEn}</h3>
                    <p className="text-white/80 text-sm mt-1">{lang === "ar" ? offer.descriptionAr : offer.descriptionEn}</p>
                  </div>
                  <button
                    onClick={() => deleteOffer.mutate({ id: offer.id })}
                    className="rounded-lg border border-white/20 bg-white/10 p-2 transition-colors hover:bg-white/20"
                    title={lang === "ar" ? "حذف العرض" : "Delete offer"}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-2xl font-bold">{offer.price} SAR</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${offer.isActive ? "bg-white/20" : "bg-black/20"}`}>
                    {offer.isActive ? (lang === "ar" ? "نشط" : "Active") : (lang === "ar" ? "غير نشط" : "Inactive")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
