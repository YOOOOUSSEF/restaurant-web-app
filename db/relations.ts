import { relations } from "drizzle-orm";
import {
  restaurants,
  branches,
  deliveryAreas,
  categories,
  products,
  offers,
  productOptions,
  productOptionValues,
  productOptionMappings,
  additions,
  productAdditionMappings,
  orders,
  orderItems,
  orderStatusHistory,
  inventoryItems,
  recipes,
  stockMovements,
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
  customers,
  reviews,
  systemUsers,
  activityLogs,
} from "./schema";

export const restaurantRelations = relations(restaurants, ({ many }) => ({
  branches: many(branches),
}));

export const branchRelations = relations(branches, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [branches.restaurantId],
    references: [restaurants.id],
  }),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
  optionMappings: many(productOptionMappings),
  additionMappings: many(productAdditionMappings),
  recipes: many(recipes),
}));

export const productOptionRelations = relations(productOptions, ({ many }) => ({
  values: many(productOptionValues),
  mappings: many(productOptionMappings),
}));

export const productOptionValueRelations = relations(productOptionValues, ({ one }) => ({
  option: one(productOptions, {
    fields: [productOptionValues.optionId],
    references: [productOptions.id],
  }),
}));

export const productOptionMappingRelations = relations(productOptionMappings, ({ one }) => ({
  product: one(products, {
    fields: [productOptionMappings.productId],
    references: [products.id],
  }),
  option: one(productOptions, {
    fields: [productOptionMappings.optionId],
    references: [productOptions.id],
  }),
}));

export const additionRelations = relations(additions, ({ many }) => ({
  mappings: many(productAdditionMappings),
}));

export const productAdditionMappingRelations = relations(productAdditionMappings, ({ one }) => ({
  product: one(products, {
    fields: [productAdditionMappings.productId],
    references: [products.id],
  }),
  addition: one(additions, {
    fields: [productAdditionMappings.additionId],
    references: [additions.id],
  }),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  deliveryArea: one(deliveryAreas, {
    fields: [orders.deliveryAreaId],
    references: [deliveryAreas.id],
  }),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  offer: one(offers, {
    fields: [orderItems.offerId],
    references: [offers.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));

export const deliveryAreaRelations = relations(deliveryAreas, ({ many }) => ({
  orders: many(orders),
}));

export const inventoryItemRelations = relations(inventoryItems, ({ many }) => ({
  recipes: many(recipes),
  stockMovements: many(stockMovements),
}));

export const recipeRelations = relations(recipes, ({ one }) => ({
  product: one(products, {
    fields: [recipes.productId],
    references: [products.id],
  }),
  offer: one(offers, {
    fields: [recipes.offerId],
    references: [offers.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [recipes.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const supplierRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
}));

export const purchaseOrderRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemRelations = relations(purchaseOrderItems, ({ one }) => ({
  po: one(purchaseOrders, {
    fields: [purchaseOrderItems.poId],
    references: [purchaseOrders.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [purchaseOrderItems.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const customerRelations = relations(customers, ({ many }) => ({
  reviews: many(reviews),
}));

export const reviewRelations = relations(reviews, ({ one }) => ({
  customer: one(customers, {
    fields: [reviews.customerId],
    references: [customers.id],
  }),
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
}));

export const systemUserRelations = relations(systemUsers, ({ many }) => ({
  activityLogs: many(activityLogs),
}));

export const activityLogRelations = relations(activityLogs, ({ one }) => ({
  user: one(systemUsers, {
    fields: [activityLogs.userId],
    references: [systemUsers.id],
  }),
}));
