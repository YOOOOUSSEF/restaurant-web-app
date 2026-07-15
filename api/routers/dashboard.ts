import { z } from "zod";
import { sql } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  orders,
  orderItems,
  inventoryItems,
  customers,
} from "@db/schema";

export const dashboardRouter = createRouter({
  getStats: publicQuery.query(async () => {
    const db = getDb();

    const allOrders = await db.select().from(orders);
    const allCustomers = await db.select().from(customers);
    const allInventory = await db.select().from(inventoryItems);

    const completedOrders = allOrders.filter((order) => {
      const status = (order.status || "").toLowerCase();
      return status === "completed" || status === "delivered";
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = completedOrders.filter((o) => {
      const d = o.createdAt ? new Date(o.createdAt) : null;
      return d && d >= today;
    });

    const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);

    const lowStockItems = allInventory.filter(
      (item) => parseFloat(item.currentStock) <= parseFloat(item.minThreshold || "0")
    );

    const statusCounts: Record<string, number> = {};
    for (const order of completedOrders) {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    }

    return {
      totalOrders: completedOrders.length,
      todayOrders: todayOrders.length,
      totalRevenue: totalRevenue.toFixed(2),
      todayRevenue: todayRevenue.toFixed(2),
      totalCustomers: allCustomers.length,
      lowStockAlerts: lowStockItems.length,
      statusCounts,
    };
  }),

  getSalesChart: publicQuery
    .input(z.object({ days: z.number().default(7) }).optional())
    .query(async ({ input }) => {
      const days = input?.days ?? 7;
      const result = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const db = getDb();
        const dayOrders = await db
          .select()
          .from(orders)
          .where(sql`created_at >= ${date} AND created_at < ${nextDate}`);

        const completedDayOrders = dayOrders.filter((order) => {
          const status = (order.status || "").toLowerCase();
          return status === "completed" || status === "delivered";
        });

        const dayRevenue = completedDayOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);

        result.push({
          date: date.toISOString().split("T")[0],
          orders: completedDayOrders.length,
          revenue: dayRevenue,
        });
      }

      return result;
    }),

  getTopProducts: publicQuery
    .input(z.object({ limit: z.number().default(5) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const items = await db.select().from(orderItems);
      const orderRows = await db.select().from(orders);
      const completedOrderIds = new Set(
        orderRows
          .filter((order) => {
            const status = (order.status || "").toLowerCase();
            return status === "completed" || status === "delivered";
          })
          .map((order) => order.id)
      );

      const productMap: Record<number, { name: string; quantity: number; revenue: number }> = {};

      for (const item of items) {
        if (!item.orderId || !completedOrderIds.has(item.orderId)) continue;

        const pid = item.productId ?? 0;
        if (!productMap[pid]) {
          productMap[pid] = {
            name: item.productNameEn,
            quantity: 0,
            revenue: 0,
          };
        }
        productMap[pid].quantity += item.quantity;
        productMap[pid].revenue += parseFloat(item.totalPrice || "0");
      }

      return Object.values(productMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, input?.limit ?? 5);
    }),

  getOrdersByHour: publicQuery.query(async () => {
    const db = getDb();
    const allOrders = await db.select().from(orders);
    const completedOrders = allOrders.filter((order) => {
      const status = (order.status || "").toLowerCase();
      return status === "completed" || status === "delivered";
    });
    const hourCounts: Record<number, number> = {};

    for (let i = 0; i < 24; i++) hourCounts[i] = 0;

    for (const order of completedOrders) {
      const d = order.createdAt ? new Date(order.createdAt) : null;
      if (d) {
        const hour = d.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }

    return Object.entries(hourCounts).map(([hour, count]) => ({
      hour: `${hour}:00`,
      count,
    }));
  }),
});
