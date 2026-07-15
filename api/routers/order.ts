import { z } from "zod";
import { eq, and, desc, sql, like, or } from "drizzle-orm";
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
} from "@db/schema";
 
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ORD-${timestamp}-${random}`;
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
            productId: z.number().optional(),
            offerId: z.number().optional(),
            quantity: z.number().min(1),
            selectedOptions: z.string().optional(),
            selectedAdditions: z.string().optional(),
            notes: z.string().optional(),
            code: z.string().optional(),
          })
        ),
        couponCode: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
 
      // Calculate totals
      let subtotal = 0;
      const orderItemsData: any[] = [];
 
      for (const item of input.items) {
        const resolvedType = item.itemType ?? (item.offerId ? "offer" : "product");

        if (resolvedType === "offer" && item.offerId) {
          const offerRows = await db.select().from(offers).where(eq(offers.id, item.offerId)).limit(1);
          if (!offerRows[0]) continue;
          const unitPrice = parseFloat(offerRows[0].price);
          const itemTotal = unitPrice * item.quantity;
          subtotal += itemTotal;
          orderItemsData.push({
            itemType: "offer" as const,
            offerId: item.offerId,
            code: item.code ?? offerRows[0].code,
            productNameEn: offerRows[0].nameEn,
            productNameAr: offerRows[0].nameAr,
            quantity: item.quantity,
            unitPrice: offerRows[0].price,
            totalPrice: itemTotal.toFixed(2),
            selectedOptions: item.selectedOptions,
            selectedAdditions: item.selectedAdditions,
            notes: item.notes,
          });
        } else if (item.productId) {
          const productRows = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
          if (!productRows[0]) continue;
          const unitPrice = parseFloat(productRows[0].basePrice);
          const itemTotal = unitPrice * item.quantity;
          subtotal += itemTotal;
          orderItemsData.push({
            itemType: "product" as const,
            productId: item.productId,
            code: item.code ?? productRows[0].code,
            productNameEn: productRows[0].nameEn,
            productNameAr: productRows[0].nameAr,
            quantity: item.quantity,
            unitPrice: productRows[0].basePrice,
            totalPrice: itemTotal.toFixed(2),
            selectedOptions: item.selectedOptions,
            selectedAdditions: item.selectedAdditions,
            notes: item.notes,
          });
        }
      }
 
      // Get delivery fee
      let deliveryFee = 0;
      if (input.deliveryAreaId && input.orderType === "delivery") {
        const areaRows = await db.select().from(deliveryAreas).where(eq(deliveryAreas.id, input.deliveryAreaId)).limit(1);
        if (areaRows[0]) deliveryFee = parseFloat(areaRows[0].fee);
      }
 
      // Calculate tax (15%)
      const taxAmount = subtotal * 0.15;
 
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
        customerPhone: input.customerPhone,
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
 
      // Deduct inventory (only for product items)
      for (const item of input.items) {
        if (!item.productId) continue;
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
 
      // Upsert customer record by phone
      const existingCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, input.customerPhone))
        .limit(1);
 
      if (existingCustomer[0]) {
        // Update existing customer stats
        await db
          .update(customers)
          .set({
            totalOrders: sql`COALESCE(total_orders, 0) + 1`,
            totalSpent: sql`CAST(COALESCE(total_spent, 0) AS DECIMAL(10,2)) + ${total}`,
            loyaltyPoints: sql`FLOOR(CAST(COALESCE(total_spent, 0) AS DECIMAL(10,2)) + ${total})`,
            // Update name/email if provided
            ...(input.customerName ? { name: input.customerName } : {}),
            ...(input.customerEmail ? { email: input.customerEmail } : {}),
          })
          .where(eq(customers.phone, input.customerPhone));
      } else {
        // Create new customer record automatically.
        // Derive the next code from the highest existing code's number,
        // NOT from row count (row count breaks after any deletion and
        // can produce a code that's already taken).
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
          phone: input.customerPhone,
          email: input.customerEmail,
          address: input.customerAddress,
          totalOrders: 1,
          totalSpent: total.toFixed(2),
          loyaltyPoints: Math.floor(total),
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
 
      await db
        .update(orders)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(orders.id, input.id));
 
      await db.insert(orderStatusHistory).values({
        orderId: input.id,
        status: input.status,
        notes: input.notes ?? `Status updated to ${input.status}`,
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
});