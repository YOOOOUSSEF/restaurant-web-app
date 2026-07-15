import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { customers, orders, reviews, coupons } from "@db/schema";

export const customerRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const allCustomers = await db.select().from(customers).orderBy(desc(customers.createdAt));
    const allOrders = await db.select().from(orders).where(eq(orders.status, "completed"));

    const statsByPhone = new Map<string, { total: number; count: number }>();
    for (const order of allOrders) {
      const current = statsByPhone.get(order.customerPhone) || { total: 0, count: 0 };
      statsByPhone.set(order.customerPhone, {
        total: current.total + parseFloat(order.total),
        count: current.count + 1,
      });
    }

    return allCustomers.map((c) => {
      const stats = statsByPhone.get(c.phone) || { total: 0, count: 0 };
      return {
        ...c,
        totalSpent: stats.total.toFixed(2),
        totalOrders: stats.count,
        loyaltyPoints: Math.floor(stats.total),
      };
    });
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(customers).where(eq(customers.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  getByPhone: publicQuery
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(customers).where(eq(customers.phone, input.phone)).limit(1);
      return rows[0] ?? null;
    }),

  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        email: z.string().email().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const count = await db.select().from(customers);
      const code = `CUS${String(count.length + 1).padStart(4, "0")}`;

      const result = await db.insert(customers).values({
        code,
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
      });

      return { id: Number(result[0].insertId), code };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        loyaltyPoints: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(customers).set(data).where(eq(customers.id, id));
      return { success: true };
    }),

  getOrderHistory: publicQuery
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const customer = await db.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
      if (!customer[0]) return [];

      return db
        .select()
        .from(orders)
        .where(eq(orders.customerPhone, customer[0].phone))
        .orderBy(desc(orders.createdAt));
    }),

  // Reviews
  listReviews: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }),

  hasReviewedOrder: publicQuery
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(reviews)
        .where(eq(reviews.orderId, input.orderId))
        .limit(1);
      return { reviewed: rows.length > 0, review: rows[0] ?? null };
    }),

  createReview: publicQuery
    .input(
      z.object({
        customerId: z.number().optional(),
        orderId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
        customerPhone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Resolve customerId from phone if not provided
      let customerId = input.customerId;
      if (!customerId && input.customerPhone) {
        const rows = await db
          .select()
          .from(customers)
          .where(eq(customers.phone, input.customerPhone))
          .limit(1);
        customerId = rows[0]?.id;
      }

      await db.insert(reviews).values({
        customerId,
        orderId: input.orderId,
        rating: input.rating,
        comment: input.comment,
      });
      return { success: true };
    }),

  // Delete customer
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(customers).where(eq(customers.id, input.id));
      return { success: true };
    }),

  // Coupons
  listCoupons: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }),

  createCoupon: publicQuery
    .input(
      z.object({
        code: z.string().min(1),
        discountType: z.enum(["percentage", "fixed"]),
        discountValue: z.number().min(0),
        minOrderAmount: z.number().min(0).optional(),
        maxUsage: z.number().int().positive().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(coupons).values({
        code: input.code.toUpperCase(),
        discountType: input.discountType,
        discountValue: String(input.discountValue),
        minOrderAmount: input.minOrderAmount != null ? String(input.minOrderAmount) : "0.00",
        maxUsage: input.maxUsage,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        isActive: true,
      });
      return { success: true };
    }),

  toggleCoupon: publicQuery
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(coupons).set({ isActive: input.isActive }).where(eq(coupons.id, input.id));
      return { success: true };
    }),

  deleteCoupon: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(coupons).where(eq(coupons.id, input.id));
      return { success: true };
    }),

  validateCoupon: publicQuery
    .input(z.object({ code: z.string(), orderAmount: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(coupons).where(eq(coupons.code, input.code)).limit(1);
      if (!rows[0]) return { valid: false, message: "Coupon not found" };

      const coupon = rows[0];
      if (!coupon.isActive) return { valid: false, message: "Coupon is inactive" };

      if (coupon.maxUsage && coupon.usedCount && coupon.usedCount >= coupon.maxUsage) {
        return { valid: false, message: "Coupon usage limit reached" };
      }

      if (coupon.minOrderAmount && parseFloat(coupon.minOrderAmount) > input.orderAmount) {
        return { valid: false, message: `Minimum order amount is ${coupon.minOrderAmount} SAR` };
      }

      return {
        valid: true,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      };
    }),
});
