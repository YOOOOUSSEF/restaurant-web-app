import { getDb } from "../api/queries/connection";
import {
  restaurants,
  branches,
  deliveryAreas,
  categories,
  products,
  productOptions,
  productOptionValues,
  productOptionMappings,
  additions,
  productAdditionMappings,
  offers,
  tables,
  inventoryItems,
  recipes,
  suppliers,
  coupons,
  loyaltyRewards,
  campaigns,
  systemUsers,
  settings,
} from "./schema";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // 1. Restaurant
  await db.insert(restaurants).values({
    nameEn: "Urban Bites",
    nameAr: "أوربان بايتس",
    city: "Riyadh",
    district: "Al-Yasmin",
    phone: "+966 11 555 0000",
    email: "info@urbanbites.demo",
    openTime: "10:00",
    closeTime: "01:00",
    taxRate: "15.00",
    currency: "SAR",
  });
  console.log("Restaurant created");

  // 2. Branches
  await db.insert(branches).values({
    restaurantId: 1,
    nameEn: "Urban Bites - Riyadh",
    nameAr: "أوربان بايتس - الرياض",
    address: "Al-Yasmin District, Riyadh, Saudi Arabia",
    isActive: true,
  });
  console.log("Branch created");

  // 3. Delivery Areas
  await db.insert(deliveryAreas).values([
    { nameEn: "Al-Yasmin", nameAr: "الياسمين", fee: "10.00", isActive: true },
    { nameEn: "Al-Narjis", nameAr: "النرجس", fee: "15.00", isActive: true },
    { nameEn: "Al-Sahafah", nameAr: "الصحافة", fee: "18.00", isActive: true },
  ]);
  console.log("Delivery areas created");

  // 4. Categories
  const existingCategories = await db.select({ code: categories.code }).from(categories);
  const existingCategoryCodes = new Set(existingCategories.map((c) => c.code));
  const categoryRows = [
    { code: "CAT001", nameEn: "Burgers", nameAr: "البرجر", sortOrder: 1, isActive: true },
    { code: "CAT002", nameEn: "Pizza", nameAr: "البيتزا", sortOrder: 2, isActive: true },
    { code: "CAT003", nameEn: "Appetizers", nameAr: "المقبلات", sortOrder: 3, isActive: true },
    { code: "CAT004", nameEn: "Drinks", nameAr: "المشروبات", sortOrder: 4, isActive: true },
    { code: "CAT005", nameEn: "Desserts", nameAr: "الحلويات", sortOrder: 5, isActive: true },
  ].filter((row) => !existingCategoryCodes.has(row.code));
  if (categoryRows.length > 0) {
    await db.insert(categories).values(categoryRows);
  }
  console.log("Categories created");

  // 5. Products
  const existingProducts = await db.select({ code: products.code }).from(products);
  const existingProductCodes = new Set(existingProducts.map((p) => p.code));
  const productRows = [
    {
      code: "PRD001",
      categoryId: 1,
      nameEn: "Classic Burger",
      nameAr: "كلاسيك برجر",
      descriptionEn: "Beef patty, cheddar cheese, lettuce, tomato, pickles, brioche bun",
      descriptionAr: "لحم بقري، جبنة شيدر، خس، طماطم، مخلل، خبز بريوش",
      basePrice: "24.00",
      imageUrl: "/burger-classic.jpg",
      isActive: true,
    },
    {
      code: "PRD002",
      categoryId: 1,
      nameEn: "Double Burger",
      nameAr: "دبل برجر",
      descriptionEn: "Double beef patties, double cheese, caramelized onions, special sauce",
      descriptionAr: "قطعتان لحم، جبنة مزدوجة، بصل مكرمل، صوص خاص",
      basePrice: "32.00",
      imageUrl: "/burger-double.jpg",
      isActive: true,
    },
    {
      code: "PRD003",
      categoryId: 1,
      nameEn: "Chicken Burger",
      nameAr: "برجر دجاج",
      descriptionEn: "Crispy chicken breast, coleslaw, pickles, mayo, brioche bun",
      descriptionAr: "صدر دجاج مقرمش، سلطة ملفوف، مخلل، مايونيز، خبز بريوش",
      basePrice: "26.00",
      imageUrl: "/burger-chicken.jpg",
      isActive: true,
    },
    {
      code: "PRD004",
      categoryId: 2,
      nameEn: "Margherita Pizza",
      nameAr: "بيتزا مارجريتا",
      descriptionEn: "San Marzano tomato sauce, fresh mozzarella, basil, olive oil",
      descriptionAr: "صلصة طماطم سان مارزانو، موزاريلا طازجة، ريحان، زيت زيتون",
      basePrice: "34.00",
      imageUrl: "/pizza-margherita.jpg",
      isActive: true,
    },
    {
      code: "PRD005",
      categoryId: 2,
      nameEn: "Pepperoni Pizza",
      nameAr: "بيتزا بيبروني",
      descriptionEn: "Tomato sauce, mozzarella, crispy pepperoni, Italian herbs",
      descriptionAr: "صلصة طماطم، موزاريلا، بيبروني مقرمش، أعشاب إيطالية",
      basePrice: "38.00",
      imageUrl: "/pizza-pepperoni.jpg",
      isActive: true,
    },
    {
      code: "PRD006",
      categoryId: 3,
      nameEn: "French Fries",
      nameAr: "بطاطا مقلية",
      descriptionEn: "Golden crispy French fries, lightly salted",
      descriptionAr: "بطاطا مقلية ذهبية مقرمشة، مملح خفيف",
      basePrice: "10.00",
      imageUrl: "/fries.jpg",
      isActive: true,
    },
    {
      code: "PRD007",
      categoryId: 3,
      nameEn: "Chicken Wings",
      nameAr: "أجنحة دجاج",
      descriptionEn: "Glazed chicken wings with BBQ sauce, served with ranch dip",
      descriptionAr: "أجنحة دجاج بصوص الباربكيو، تقدم مع صوص الرانش",
      basePrice: "22.00",
      imageUrl: "/chicken-wings.jpg",
      isActive: true,
    },
    {
      code: "PRD008",
      categoryId: 4,
      nameEn: "Cola",
      nameAr: "كولا",
      descriptionEn: "Refreshing cola drink, served cold",
      descriptionAr: "مشروب كولا منعش، يقدم بارد",
      basePrice: "7.00",
      imageUrl: "/fries.jpg",
      isActive: true,
    },
    {
      code: "PRD009",
      categoryId: 4,
      nameEn: "Orange Juice",
      nameAr: "عصير برتقال",
      descriptionEn: "Freshly squeezed orange juice",
      descriptionAr: "عصير برتقال طازج",
      basePrice: "12.00",
      imageUrl: "/fries.jpg",
      isActive: true,
    },
    {
      code: "PRD010",
      categoryId: 5,
      nameEn: "Chocolate Brownie",
      nameAr: "براوني شوكولاتة",
      descriptionEn: "Warm chocolate brownie with vanilla ice cream and chocolate drizzle",
      descriptionAr: "براوني شوكولاتة دافئ مع آيس كريم فانيليا وصوص شوكولاتة",
      basePrice: "15.00",
      imageUrl: "/brownie.jpg",
      isActive: true,
    },
  ].filter((row) => !existingProductCodes.has(row.code));
  if (productRows.length > 0) {
    await db.insert(products).values(productRows);
  }
  console.log("Products created");

  // 6. Product Options
  await db.insert(productOptions).values([
    { nameEn: "Size", nameAr: "الحجم", isActive: true },
    { nameEn: "Bread", nameAr: "الخبز", isActive: true },
    { nameEn: "Sauce", nameAr: "الصوص", isActive: true },
  ]);
  console.log("Product options created");

  // 7. Product Option Values
  await db.insert(productOptionValues).values([
    { optionId: 1, nameEn: "Regular", nameAr: "عادي", priceAdjustment: "0.00" },
    { optionId: 1, nameEn: "Large", nameAr: "كبير", priceAdjustment: "5.00" },
    { optionId: 2, nameEn: "Regular Bun", nameAr: "خبز عادي", priceAdjustment: "0.00" },
    { optionId: 2, nameEn: "Brioche", nameAr: "بريوش", priceAdjustment: "3.00" },
    { optionId: 3, nameEn: "BBQ", nameAr: "باربكيو", priceAdjustment: "0.00" },
    { optionId: 3, nameEn: "Ranch", nameAr: "رانش", priceAdjustment: "0.00" },
    { optionId: 3, nameEn: "Garlic", nameAr: "ثوم", priceAdjustment: "0.00" },
  ]);
  console.log("Product option values created");

  // 8. Product Option Mappings (burger products get Size and Bread options)
  await db.insert(productOptionMappings).values([
    { productId: 1, optionId: 1 },
    { productId: 1, optionId: 2 },
    { productId: 2, optionId: 1 },
    { productId: 2, optionId: 2 },
    { productId: 3, optionId: 1 },
    { productId: 3, optionId: 2 },
    { productId: 6, optionId: 3 },
    { productId: 7, optionId: 3 },
  ]);
  console.log("Product option mappings created");

  // 9. Additions
  await db.insert(additions).values([
    { nameEn: "Extra Cheese", nameAr: "جبنة إضافية", price: "3.00", isActive: true },
    { nameEn: "Extra Meat", nameAr: "لحم إضافي", price: "8.00", isActive: true },
    { nameEn: "Jalapeno", nameAr: "هالبينو", price: "2.00", isActive: true },
  ]);
  console.log("Additions created");

  // 10. Product Addition Mappings
  await db.insert(productAdditionMappings).values([
    { productId: 1, additionId: 1 },
    { productId: 1, additionId: 2 },
    { productId: 1, additionId: 3 },
    { productId: 2, additionId: 1 },
    { productId: 2, additionId: 2 },
    { productId: 3, additionId: 1 },
    { productId: 3, additionId: 3 },
    { productId: 4, additionId: 1 },
    { productId: 5, additionId: 1 },
  ]);
  console.log("Product addition mappings created");

  // 11. Offers
  const existingOffers = await db.select({ code: offers.code }).from(offers);
  const existingOfferCodes = new Set(existingOffers.map((offer) => offer.code));
  const offerRows = [
    {
      code: "OFF-BURGER-MEAL",
      nameEn: "Burger Meal",
      nameAr: "وجبة البرجر",
      descriptionEn: "Classic Burger + Fries + Cola",
      descriptionAr: "كلاسيك برجر + بطاطا + كولا",
      price: "35.00",
      isActive: true,
    },
    {
      code: "OFF-PIZZA-MEAL",
      nameEn: "Pizza Meal",
      nameAr: "وجبة البيتزا",
      descriptionEn: "Margherita Pizza + Wings + Orange Juice",
      descriptionAr: "بيتزا مارجريتا + أجنحة دجاج + عصير برتقال",
      price: "42.00",
      isActive: true,
    },
  ].filter((row) => !existingOfferCodes.has(row.code));
  if (offerRows.length > 0) {
    await db.insert(offers).values(offerRows);
  }
  console.log("Offers created");

  // 12. Tables
  await db.insert(tables).values([
    { tableNumber: "T01", capacity: 2, status: "available" },
    { tableNumber: "T02", capacity: 4, status: "available" },
    { tableNumber: "T03", capacity: 6, status: "available" },
    { tableNumber: "T04", capacity: 8, status: "available" },
  ]);
  console.log("Tables created");

  // 13. Inventory Items
  await db.insert(inventoryItems).values([
    { code: "INV001", nameEn: "Beef", nameAr: "لحم بقري", currentStock: "50.00", unit: "kg", minThreshold: "10.00", costPerUnit: "35.00", isActive: true },
    { code: "INV002", nameEn: "Chicken", nameAr: "دجاج", currentStock: "40.00", unit: "kg", minThreshold: "8.00", costPerUnit: "22.00", isActive: true },
    { code: "INV003", nameEn: "Burger Buns", nameAr: "خبز برجر", currentStock: "200.00", unit: "pcs", minThreshold: "50.00", costPerUnit: "1.50", isActive: true },
    { code: "INV004", nameEn: "Pizza Dough", nameAr: "عجينة بيتزا", currentStock: "100.00", unit: "pcs", minThreshold: "20.00", costPerUnit: "3.00", isActive: true },
    { code: "INV005", nameEn: "Cheese", nameAr: "جبنة", currentStock: "30.00", unit: "kg", minThreshold: "5.00", costPerUnit: "28.00", isActive: true },
    { code: "INV006", nameEn: "Lettuce", nameAr: "خس", currentStock: "15.00", unit: "kg", minThreshold: "3.00", costPerUnit: "8.00", isActive: true },
    { code: "INV007", nameEn: "Tomato", nameAr: "طماطم", currentStock: "20.00", unit: "kg", minThreshold: "5.00", costPerUnit: "6.00", isActive: true },
    { code: "INV008", nameEn: "Potato", nameAr: "بطاطا", currentStock: "80.00", unit: "kg", minThreshold: "15.00", costPerUnit: "4.00", isActive: true },
    { code: "INV009", nameEn: "Cola Syrup", nameAr: "شراب كولا", currentStock: "25.00", unit: "liter", minThreshold: "5.00", costPerUnit: "12.00", isActive: true },
    { code: "INV010", nameEn: "Brownie Mix", nameAr: "خليط براوني", currentStock: "20.00", unit: "kg", minThreshold: "4.00", costPerUnit: "18.00", isActive: true },
  ]);
  console.log("Inventory items created");

  // 14. Recipes
  await db.insert(recipes).values([
    { productId: 1, inventoryItemId: 1, quantityRequired: "0.15" },
    { productId: 1, inventoryItemId: 3, quantityRequired: "1.00" },
    { productId: 1, inventoryItemId: 5, quantityRequired: "0.03" },
    { productId: 1, inventoryItemId: 6, quantityRequired: "0.05" },
    { productId: 1, inventoryItemId: 7, quantityRequired: "0.03" },
    { productId: 2, inventoryItemId: 1, quantityRequired: "0.30" },
    { productId: 2, inventoryItemId: 3, quantityRequired: "1.00" },
    { productId: 2, inventoryItemId: 5, quantityRequired: "0.06" },
    { productId: 2, inventoryItemId: 6, quantityRequired: "0.05" },
    { productId: 2, inventoryItemId: 7, quantityRequired: "0.03" },
    { productId: 3, inventoryItemId: 2, quantityRequired: "0.20" },
    { productId: 3, inventoryItemId: 3, quantityRequired: "1.00" },
    { productId: 4, inventoryItemId: 4, quantityRequired: "1.00" },
    { productId: 4, inventoryItemId: 5, quantityRequired: "0.15" },
    { productId: 4, inventoryItemId: 7, quantityRequired: "0.10" },
    { productId: 6, inventoryItemId: 8, quantityRequired: "0.20" },
    { productId: 8, inventoryItemId: 9, quantityRequired: "0.10" },
    { productId: 10, inventoryItemId: 10, quantityRequired: "0.12" },
  ]);
  console.log("Recipes created");

  // 15. Suppliers
  await db.insert(suppliers).values([
    { name: "Riyadh Meats", contactPerson: "Ahmed Al-Rashid", phone: "+966 11 444 1111", email: "orders@riyadhmeats.sa", address: "Industrial Area, Riyadh", isActive: true },
    { name: "Saudi Foods", contactPerson: "Fahad Al-Otaibi", phone: "+966 11 333 2222", email: "sales@saudifoods.sa", address: "Al-Malaz, Riyadh", isActive: true },
    { name: "Gulf Beverages", contactPerson: "Khalid Al-Saud", phone: "+966 11 222 3333", email: "info@gulfbeverages.sa", address: "Al-Olaya, Riyadh", isActive: true },
  ]);
  console.log("Suppliers created");

  // 16. Coupons
  await db.insert(coupons).values([
    { code: "WELCOME10", discountType: "percentage", discountValue: "10.00", minOrderAmount: "50.00", maxUsage: 100, usedCount: 0, isActive: true },
    { code: "FREEDELIVERY", discountType: "fixed", discountValue: "15.00", minOrderAmount: "80.00", maxUsage: 50, usedCount: 0, isActive: true },
    { code: "BURGER20", discountType: "percentage", discountValue: "20.00", minOrderAmount: "60.00", maxUsage: 30, usedCount: 0, isActive: true },
  ]);
  console.log("Coupons created");

  // 17. Loyalty Rewards
  await db.insert(loyaltyRewards).values([
    { nameEn: "10 SAR Discount", nameAr: "خصم 10 ريال", pointsRequired: 100, rewardType: "discount", rewardValue: "10.00", isActive: true },
    { nameEn: "Free Classic Burger", nameAr: "برجر كلاسيك مجاني", pointsRequired: 250, rewardType: "free_item", rewardValue: null, freeProductId: 1, isActive: true },
  ]);
  console.log("Loyalty rewards created");

  // 18. Campaigns
  await db.insert(campaigns).values([
    { nameEn: "Weekend Offer", nameAr: "عرض نهاية الأسبوع", campaignType: "weekend_offer", description: "20% off on all burgers every Friday-Saturday", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), isActive: true },
    { nameEn: "Pizza Night", nameAr: "ليلة البيتزا", campaignType: "pizza_night", description: "Buy one pizza get one free every Tuesday", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), isActive: true },
    { nameEn: "Free Delivery", nameAr: "توصيل مجاني", campaignType: "free_delivery", description: "Free delivery on orders above 100 SAR", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), isActive: true },
  ]);
  console.log("Campaigns created");

  // 19. System Users
  await db.insert(systemUsers).values([
    { fullName: "System Admin", email: "admin@urbanbites.demo", phone: "+966 50 000 0001", role: "admin", isActive: true },
    { fullName: "Branch Manager", email: "manager@urbanbites.demo", phone: "+966 50 000 0002", role: "branch_manager", isActive: true },
    { fullName: "Head Cashier", email: "cashier@urbanbites.demo", phone: "+966 50 000 0003", role: "cashier", isActive: true },
    { fullName: "Kitchen Supervisor", email: "kitchen@urbanbites.demo", phone: "+966 50 000 0004", role: "kitchen", isActive: true },
    { fullName: "Inventory Clerk", email: "inventory@urbanbites.demo", phone: "+966 50 000 0005", role: "inventory", isActive: true },
    { fullName: "Marketing Lead", email: "marketing@urbanbites.demo", phone: "+966 50 000 0006", role: "marketing", isActive: true },
  ]);
  console.log("System users created");

  // 20. Settings
  await db.insert(settings).values([
    { key: "tax_rate", value: "15", group: "restaurant" },
    { key: "currency", value: "SAR", group: "restaurant" },
    { key: "auto_refresh_interval", value: "30", group: "system" },
    { key: "loyalty_points_per_sar", value: "1", group: "loyalty" },
    { key: "enable_mada", value: "true", group: "payment" },
    { key: "enable_apple_pay", value: "true", group: "payment" },
    { key: "enable_stc_pay", value: "true", group: "payment" },
    { key: "enable_visa", value: "true", group: "payment" },
    { key: "enable_cash", value: "true", group: "payment" },
    { key: "working_hours_start", value: "10:00", group: "restaurant" },
    { key: "working_hours_end", value: "01:00", group: "restaurant" },
  ]);
  console.log("Settings created");

  console.log("Seed complete! All data populated successfully.");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
