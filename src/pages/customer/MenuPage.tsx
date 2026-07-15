import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useI18nContext } from "@/i18n/I18nContext";
import { useCart } from "@/hooks/useCart";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Pizza, Beef, Croissant, CupSoda, IceCreamCone } from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  Burgers: <Beef size={14} />,
  Pizza: <Pizza size={14} />,
  Appetizers: <Croissant size={14} />,
  Drinks: <CupSoda size={14} />,
  Desserts: <IceCreamCone size={14} />,
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function MenuPage() {
  const { lang, t } = useI18nContext();
  const { addItem } = useCart();
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const { data: categories } = trpc.menu.listCategories.useQuery();
  const { data: products } = trpc.menu.listProducts.useQuery();
  const { data: offers } = trpc.menu.listOffers.useQuery();

  const getCartKey = (prefix: string, id: number) => `${prefix}-${id}`;

  const filteredProducts = activeCategory
    ? products?.filter((p) => p.categoryId === activeCategory)
    : products;

  const handleAddToCart = (product: any) => {
    addItem({
      itemType: "product",
      productId: product.id,
      offerId: undefined,
      code: product.code || `product-${product.id}`,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      price: parseFloat(product.basePrice),
      imageUrl: product.imageUrl || "",
    });

    const key = getCartKey("product", product.id);
    setAddedIds((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 1500);
  };

  const handleAddOfferToCart = (offer: any) => {
    addItem({
      itemType: "offer",
      productId: undefined,
      offerId: offer.id,
      code: offer.code || `offer-${offer.id}`,
      nameEn: offer.nameEn,
      nameAr: offer.nameAr,
      price: parseFloat(offer.price),
      imageUrl: undefined,
    });

    const key = getCartKey("offer", offer.id);
    setAddedIds((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 1500);
  };

  const getCategoryName = (cat: any) => (lang === "ar" ? cat.nameAr : cat.nameEn);
  const getProductName = (p: any) => (lang === "ar" ? p.nameAr : p.nameEn);
  const getProductDesc = (p: any) =>
    lang === "ar" ? p.descriptionAr : p.descriptionEn;

  return (
    <div>
      {/* Category Filter Bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
            activeCategory === null
              ? "bg-[#6B7F3E] text-white shadow-md"
              : "bg-white text-[#5C4D44] border border-[#D4C8B8] hover:bg-[#E8DFD3]"
          }`}
        >
          {t.all}
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeCategory === cat.id
                ? "bg-[#6B7F3E] text-white shadow-md"
                : "bg-white text-[#5C4D44] border border-[#D4C8B8] hover:bg-[#E8DFD3]"
            }`}
          >
            {categoryIcons[cat.nameEn]}
            {getCategoryName(cat)}
          </button>
        ))}
      </div>

      {/* Offers Section */}
      {offers && offers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#2D2420] mb-4">
            {lang === "ar" ? "العروض" : "Special Offers"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="bg-gradient-to-r from-[#C75C2E] to-[#A84A22] rounded-xl p-4 text-white shadow-lg"
              >
                <h3 className="font-bold text-lg">
                  {lang === "ar" ? offer.nameAr : offer.nameEn}
                </h3>
                <p className="text-white/80 text-sm mt-1">
                  {lang === "ar" ? offer.descriptionAr : offer.descriptionEn}
                </p>
                <p className="text-2xl font-bold mt-2">{offer.price} SAR</p>
                <button
                  onClick={() => handleAddOfferToCart(offer)}
                  className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                    addedIds.has(getCartKey("offer", offer.id))
                      ? "bg-white text-[#6B7F3E]"
                      : "bg-white/90 text-[#2D2420] hover:bg-white"
                  }`}
                >
                  {addedIds.has(getCartKey("offer", offer.id)) ? (
                    <>
                      <Check size={14} />
                      {t.added}
                    </>
                  ) : (
                    <>{t.add}</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory ?? "all"}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filteredProducts?.map((product) => {
            const category = categories?.find((c) => c.id === product.categoryId);
            const wasAdded = addedIds.has(getCartKey("product", product.id));

            return (
              <motion.div
                key={product.id}
                variants={fadeInUp}
                className="bg-white rounded-xl border border-[#E8DFD3] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
              >
                {/* Product Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#F5F0E8]">
                  <img
                    src={product.imageUrl || "/burger-classic.jpg"}
                    alt={getProductName(product)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Category Tag */}
                  {category && (
                    <span className="absolute top-3 left-3 bg-[#C75C2E] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide">
                      {getCategoryName(category)}
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-[#2D2420] text-base">
                    {getProductName(product)}
                  </h3>
                  <p className="text-xs text-[#8B7A6E] mt-1 line-clamp-2">
                    {getProductDesc(product)}
                  </p>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[#C75C2E] font-bold text-lg">
                      {parseFloat(product.basePrice).toFixed(2)} SAR
                    </span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                        wasAdded
                          ? "bg-[#6B7F3E] text-white"
                          : "bg-[#6B7F3E] text-white hover:bg-[#5A6B34] active:scale-95"
                      }`}
                    >
                      {wasAdded ? (
                        <>
                          <Check size={14} />
                          {t.added}
                        </>
                      ) : (
                        <>{t.add}</>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {filteredProducts?.length === 0 && (
        <div className="text-center py-16 text-[#8B7A6E]">{t.noData}</div>
      )}
    </div>
  );
}
