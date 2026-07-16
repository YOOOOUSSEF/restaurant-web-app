import { z } from "zod";
import { eq, and, desc, sql, like, or, inArray } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  orders,
  orderItems,
  orderStatusHistory,
  deliveryAreas,
  products,
  offers,
  inventoryItems,
  recipes,
  stockMovements,
  coupons,
  customers,
  restaurants,
  invoices,
} from "@db/schema";
import { canUpdateOrderStatus, isDeletableOrderStatus, isTerminalOrderStatus } from "../order-status-guards";
 
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ORD-${timestamp}-${random}`;
}

function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("966")) {
    const local = digits.slice(3);
    return `+966 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }

  if (digits.startsWith("05") && digits.length >= 10) {
    const local = digits.slice(1);
    return `+966 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }

  return value.trim();
}

function phoneDigitsSql(column: typeof orders.customerPhone) {
  return sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${column}, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '')`;
}

function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("966")) {
    return digits;
  }

  if (digits.startsWith("05") && digits.length >= 10) {
    return `966${digits.slice(1)}`;
  }

  if (digits.startsWith("5") && digits.length === 9) {
    return `966${digits}`;
  }

  return digits;
}
 
export const orderRouter = createRouter({
  // List orders with filters
  list: publicQuery
    .input(
      z.object({
        status: z.string().optional(),
        orderType: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters = [];
 
      if (input?.status) filters.push(eq(orders.status, input.status as any));
      if (input?.orderType) filters.push(eq(orders.orderType, input.orderType as any));
      if (input?.search) {
        filters.push(
          or(
            like(orders.orderNumber, `%${input.search}%`),
            like(orders.customerName, `%${input.search}%`),
            like(orders.customerPhone, `%${input.search}%`)
          )
        );
      }
 
      const whereClause = filters.length > 0 ? and(...filters) : undefined;
 
      const rows = await db
        .select()
        .from(orders)
        .where(whereClause)
        .orderBy(desc(orders.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      return rows;
    }),

  // Get order by ID with items
  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const orderRows = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!orderRows[0]) return null;

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, input.id));
      const history = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, input.id))
        .orderBy(orderStatusHistory.createdAt);
 
      return { ...orderRows[0], items, history };
    }),
 
  // Get order by order number (for tracking)
  getByNumber: publicQuery
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const orderRows = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, input.orderNumber))
        .limit(1);
      if (!orderRows[0]) return null;
 
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderRows[0].id));
      const history = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, orderRows[0].id))
        .orderBy(orderStatusHistory.createdAt);
 
      return { ...orderRows[0], items, history };
    }),

  // Get active orders by phone number (for tracking)
  getActiveByPhone: publicQuery
    .input(z.object({ phone: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const phoneDigits = normalizePhoneDigits(input.phone);

      if (!phoneDigits) return [];

      return db
        .select()
        .from(orders)
        .where(
          and(
            sql`${phoneDigitsSql(orders.customerPhone)} = ${phoneDigits}`,
            sql`${orders.status} NOT IN ('delivered', 'completed', 'cancelled', 'canceled')`
          )
        )
        .orderBy(desc(orders.createdAt));
    }),
 
  // Create order
  create: publicQuery
    .input(
      z.object({
        customerName: z.string().min(1),
        customerPhone: z.string().min(1),
        customerEmail: z.string().email().optional(),
        customerAddress: z.string().optional(),
        deliveryAreaId: z.number().optional(),
        orderType: z.enum(["delivery", "pickup", "dine_in"]),
        tableNumber: z.string().optional(),
        paymentMethod: z.enum(["mada", "apple_pay", "stc_pay", "visa", "cash"]),
        items: z.array(
          z.object({
            itemType: z.enum(["product", "offer"]).optional(),
            code: z.string().optional(),
            productId: z.number().optional().nullable(),
            offerId: z.number().optional().nullable(),
            quantity: z.number().min(1),
            selectedOptions: z.string().optional(),
            selectedAdditions: z.string().optional(),
            notes: z.string().optional(),
          }).superRefine((item, ctx) => {
            const resolvedItemType = item.itemType ?? (item.offerId ? "offer" : "product");
            if (resolvedItemType === "offer" && (item.offerId == null || item.offerId === undefined)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "offerId is required for offer items",
                path: ["offerId"],
              });
            }
            if (resolvedItemType === "product" && (item.productId == null || item.productId === undefined)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "productId is required for product items",
                path: ["productId"],
              });
            }
          })
        ),
        couponCode: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const customerPhone = normalizePhoneNumber(input.customerPhone);
 
      // Calculate totals
      type OrderItemSource = {
        nameEn: string;
        nameAr: string;
        price?: string;
        basePrice?: string;
      };

      let subtotal = 0;
      const orderItemsData = [];
 
      for (const item of input.items) {
        let itemRow: OrderItemSource | null = null;
        const itemType: "product" | "offer" = item.itemType ?? (item.offerId ? "offer" : "product");
        let productId: number | null = null;
        let offerId: number | null = null;
        let unitPrice = 0;
        let productNameEn = "";
        let productNameAr = "";
        let itemCode = item.code?.trim();
 
        if (itemType === "offer" && item.offerId) {
          const offerRows = await db.select().from(offers).where(eq(offers.id, item.offerId)).limit(1);
          itemRow = offerRows[0] ?? null;
          if (!itemRow) continue;
          offerId = item.offerId;
          productNameEn = itemRow.nameEn;
          productNameAr = itemRow.nameAr;
          unitPrice = parseFloat(String(itemRow.price ?? "0"));
          itemCode = itemCode || offerRows[0]?.code || `offer-${item.offerId}`;
        } else if (itemType === "product" && item.productId) {
          const productRows = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
          itemRow = productRows[0] ?? null;
          if (!itemRow) continue;
          productId = item.productId;
          productNameEn = itemRow.nameEn;
          productNameAr = itemRow.nameAr;
          unitPrice = parseFloat(String(itemRow.basePrice ?? "0"));
          itemCode = itemCode || `product-${item.productId}`;
        } else {
          continue;
        }
 
        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;
 
        orderItemsData.push({
          itemType,
          code: itemCode,
          productId,
          offerId,
          productNameEn,
          productNameAr,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: itemTotal.toFixed(2),
          selectedOptions: item.selectedOptions,
          selectedAdditions: item.selectedAdditions,
          notes: item.notes,
        });
      }
 
      // Get delivery fee
      let deliveryFee = 0;
      if (input.deliveryAreaId && input.orderType === "delivery") {
        const areaRows = await db.select().from(deliveryAreas).where(eq(deliveryAreas.id, input.deliveryAreaId)).limit(1);
        if (areaRows[0]) deliveryFee = parseFloat(areaRows[0].fee);
      }
 
      const restaurantProfileRows = await db.select().from(restaurants).limit(1);
      const restaurantTaxRate = restaurantProfileRows[0]?.taxRate
        ? parseFloat(String(restaurantProfileRows[0].taxRate)) / 100
        : 0.15;
      const taxAmount = subtotal * restaurantTaxRate;
 
      // Apply coupon if provided
      let discountAmount = 0;
      if (input.couponCode) {
        const couponRows = await db.select().from(coupons).where(eq(coupons.code, input.couponCode)).limit(1);
        if (couponRows[0] && couponRows[0].isActive) {
          if (couponRows[0].discountType === "percentage") {
            discountAmount = subtotal * (parseFloat(couponRows[0].discountValue) / 100);
          } else {
            discountAmount = parseFloat(couponRows[0].discountValue);
          }
          // Increment coupon usage
          await db
            .update(coupons)
            .set({ usedCount: sql`COALESCE(used_count, 0) + 1` })
            .where(eq(coupons.id, couponRows[0].id));
        }
      }
 
      const total = subtotal + taxAmount + deliveryFee - discountAmount;
      const orderNumber = generateOrderNumber();
 
      // Insert order
      const result = await db.insert(orders).values({
        orderNumber,
        customerName: input.customerName,
        customerPhone,
        customerEmail: input.customerEmail,
        customerAddress: input.customerAddress,
        deliveryAreaId: input.deliveryAreaId,
        orderType: input.orderType,
        tableNumber: input.tableNumber,
        paymentMethod: input.paymentMethod,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        total: total.toFixed(2),
        couponCode: input.couponCode,
        notes: input.notes,
        status: "new",
      });
 
      const orderId = Number(result[0].insertId);
 
      // Insert order items
      for (const item of orderItemsData) {
        await db.insert(orderItems).values({
          orderId,
          ...item,
        });
      }
 
      // Add status history
      await db.insert(orderStatusHistory).values({
        orderId,
        status: "new",
        notes: "Order placed",
      });
 
      // Deduct inventory only for products with recipes
      for (const item of input.items) {
        if (item.itemType !== "product" || !item.productId) continue;
        const recipeRows = await db.select().from(recipes).where(eq(recipes.productId, item.productId));
        for (const recipe of recipeRows) {
          if (!recipe.inventoryItemId) continue;
          const qty = parseFloat(recipe.quantityRequired) * item.quantity;
          await db.insert(stockMovements).values({
            inventoryItemId: recipe.inventoryItemId,
            movementType: "out",
            quantity: qty.toFixed(2),
            reason: `Order ${orderNumber}`,
            referenceType: "order",
            referenceId: orderId,
          });
 
          await db
            .update(inventoryItems)
            .set({
              currentStock: sql`CAST(current_stock AS DECIMAL(10,2)) - ${qty}`,
            })
            .where(eq(inventoryItems.id, recipe.inventoryItemId));
        }
      }
 
      // Ensure customer exists without applying completed-order totals yet.
      const existingCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, customerPhone))
        .limit(1);
 
      if (existingCustomer[0]) {
        // Preserve customer profile details only.
        await db
          .update(customers)
          .set({
            ...(input.customerName ? { name: input.customerName } : {}),
            ...(input.customerEmail ? { email: input.customerEmail } : {}),
            ...(input.customerAddress ? { address: input.customerAddress } : {}),
          })
          .where(eq(customers.phone, customerPhone));
      } else {
        // Create new customer record now; totals are assigned when the order is completed.
        const lastCustomer = await db
          .select({ code: customers.code })
          .from(customers)
          .orderBy(desc(customers.id))
          .limit(1);
 
        let nextNum = 1;
        if (lastCustomer[0]?.code) {
          const match = lastCustomer[0].code.match(/(\d+)$/);
          if (match) nextNum = parseInt(match[1], 10) + 1;
        }
        const code = `CUS${String(nextNum).padStart(4, "0")}`;
 
        await db.insert(customers).values({
          code,
          name: input.customerName,
          phone: customerPhone,
          email: input.customerEmail,
          address: input.customerAddress,
          totalOrders: 0,
          totalSpent: "0.00",
          loyaltyPoints: 0,
        });
      }
 
      return { orderId, orderNumber, total: total.toFixed(2) };
    }),
 
  // Update order status
  updateStatus: publicQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "new", "accepted", "preparing", "ready",
          "out_for_delivery", "driver_assigned", "on_the_way",
          "delivered", "completed", "cancelled",
        ]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
 
      const orderRows = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!orderRows[0]) {
        return { success: false, message: "Order not found" };
      }
 
      const previousStatus = orderRows[0].status;
      const normalizedStatus = input.status === "delivered" ? "completed" : input.status;
      if (!canUpdateOrderStatus(previousStatus, normalizedStatus)) {
        return { success: false, message: "This order is already in a terminal state and can no longer be changed" };
      }

      const shouldApplyCompletion = normalizedStatus === "completed" && previousStatus !== "completed" && previousStatus !== "cancelled";
 
      await db
        .update(orders)
        .set({ status: normalizedStatus, updatedAt: new Date() })
        .where(eq(orders.id, input.id));
 
      if (shouldApplyCompletion) {
        const order = orderRows[0];
        const totalValue = parseFloat(order.total || "0");
 
        const existingCustomer = await db
          .select()
          .from(customers)
          .where(eq(customers.phone, order.customerPhone))
          .limit(1);
 
        if (existingCustomer[0]) {
          await db
            .update(customers)
            .set({
              totalOrders: sql`COALESCE(total_orders, 0) + 1`,
              totalSpent: sql`CAST(COALESCE(total_spent, 0) AS DECIMAL(10,2)) + ${totalValue}`,
              loyaltyPoints: sql`FLOOR(CAST(COALESCE(total_spent, 0) AS DECIMAL(10,2)) + ${totalValue})`,
            })
            .where(eq(customers.phone, order.customerPhone));
        } else {
          const lastCustomer = await db
            .select({ code: customers.code })
            .from(customers)
            .orderBy(desc(customers.id))
            .limit(1);
 
          let nextNum = 1;
          if (lastCustomer[0]?.code) {
            const match = lastCustomer[0].code.match(/(\d+)$/);
            if (match) nextNum = parseInt(match[1], 10) + 1;
          }
          const code = `CUS${String(nextNum).padStart(4, "0")}`;
 
          await db.insert(customers).values({
            code,
            name: order.customerName,
            phone: order.customerPhone,
            email: order.customerEmail,
            address: order.customerAddress,
            totalOrders: 1,
            totalSpent: order.total,
            loyaltyPoints: sql`FLOOR(CAST(${totalValue} AS DECIMAL(10,2)))`,
          });
        }
      }
 
      await db.insert(orderStatusHistory).values({
        orderId: input.id,
        status: normalizedStatus,
        notes: input.notes ?? `Status updated to ${normalizedStatus}`,
      });
 
      return { success: true };
    }),
 
  // Get recent orders
  getRecent: publicQuery
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(input?.limit ?? 10);
    }),
 
  // Get order stats
  getStats: publicQuery.query(async () => {
    const db = getDb();
 
    const allOrders = await db.select().from(orders);
    const nonCancelledOrders = allOrders.filter((order) => {
      const status = (order.status || "").toLowerCase();
      return status !== "cancelled" && status !== "canceled";
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
 
    const todayOrders = nonCancelledOrders.filter((o) => {
      const d = o.createdAt ? new Date(o.createdAt) : null;
      return d && d >= today;
    });
 
    const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
 
    const statusCounts: Record<string, number> = {};
    for (const order of nonCancelledOrders) {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    }
 
    return {
      totalOrders: nonCancelledOrders.length,
      todayOrders: todayOrders.length,
      totalRevenue: totalRevenue.toFixed(2),
      todayRevenue: todayRevenue.toFixed(2),
      statusCounts,
    };
  }),

  // ── Delete a single order (only cancelled or completed) ──
  deleteOne: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const orderRows = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!orderRows[0]) return { success: false, message: "Order not found" };

      const { status } = orderRows[0];
      if (!isDeletableOrderStatus(status)) {
        return { success: false, message: "Only completed or cancelled orders can be deleted" };
      }

      // Cascade: history → items → invoices → order
      await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, input.id));
      await db.delete(orderItems).where(eq(orderItems.orderId, input.id));
      await db.delete(invoices).where(eq(invoices.orderId, input.id));
      await db.delete(orders).where(eq(orders.id, input.id));

      return { success: true };
    }),

  // ── Delete all cancelled orders ──
  deleteAllCancelled: publicQuery.mutation(async () => {
    const db = getDb();

    const cancelledOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.status, "cancelled"));

    if (cancelledOrders.length === 0) return { success: true, deleted: 0 };

    const ids = cancelledOrders.map((o) => o.id);

    await db.delete(orderStatusHistory).where(inArray(orderStatusHistory.orderId, ids));
    await db.delete(orderItems).where(inArray(orderItems.orderId, ids));
    await db.delete(invoices).where(inArray(invoices.orderId, ids));
    await db.delete(orders).where(inArray(orders.id, ids));

    return { success: true, deleted: ids.length };
  }),

  // ── Delete ALL orders (nuclear option) ──
  deleteAll: publicQuery.mutation(async () => {
    const db = getDb();

    await db.delete(orderStatusHistory);
    await db.delete(orderItems);
    await db.delete(invoices);
    await db.delete(orders);

    return { success: true };
  }),
});