import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  restaurants,
  branches,
  deliveryAreas,
  tables,
  systemUsers,
  settings,
  campaigns,
  notifications,
  offers,
} from "@db/schema";

export const restaurantRouter = createRouter({
  // Restaurant Profile
  getProfile: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(restaurants).limit(1);
    return rows[0] ?? null;
  }),

  updateProfile: publicQuery
    .input(
      z.object({
        id: z.number(),
        nameEn: z.string().optional(),
        nameAr: z.string().optional(),
        city: z.string().optional(),
        district: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        openTime: z.string().optional(),
        closeTime: z.string().optional(),
        taxRate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
      );
      await db.update(restaurants).set(updateData).where(eq(restaurants.id, id));
      return { success: true };
    }),

  // Branches
  listBranches: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(branches);
  }),

  // Delivery Areas
  listDeliveryAreas: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(deliveryAreas).orderBy(deliveryAreas.nameEn);
  }),

  createDeliveryArea: publicQuery
    .input(
      z.object({
        nameEn: z.string().min(1),
        nameAr: z.string().min(1),
        fee: z.string().default("0.00"),
        isActive: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [created] = await db
        .insert(deliveryAreas)
        .values({
          nameEn: input.nameEn,
          nameAr: input.nameAr,
          fee: input.fee,
          isActive: input.isActive,
        })
        .$returningId();

      return { id: created?.insertId ?? null, success: true };
    }),

  updateDeliveryArea: publicQuery
    .input(
      z.object({
        id: z.number(),
        nameEn: z.string().optional(),
        nameAr: z.string().optional(),
        fee: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(deliveryAreas).set(data).where(eq(deliveryAreas.id, id));
      return { success: true };
    }),

  deleteDeliveryArea: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(deliveryAreas).where(eq(deliveryAreas.id, input.id));
      return { success: true };
    }),

  // Tables
  listTables: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(tables);
  }),

  updateTableStatus: publicQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["available", "occupied", "reserved"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(tables).set({ status: input.status }).where(eq(tables.id, input.id));
      return { success: true };
    }),

  // System Users
  listSystemUsers: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(systemUsers);
  }),

  // Settings
  listSettings: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(settings);
  }),

  updateSetting: publicQuery
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(settings).set({ value: input.value }).where(eq(settings.key, input.key));
      return { success: true };
    }),

  // Campaigns
  listCampaigns: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(campaigns);
  }),

  // Notifications
  listNotifications: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }),

  markNotificationRead: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, input.id));
      return { success: true };
    }),

  // Offers (admin)
  listAllOffers: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(offers);
  }),

  createOffer: publicQuery
    .input(
      z.object({
        code: z.string().trim().min(1).max(30).optional(),
        nameEn: z.string().min(1),
        nameAr: z.string().min(1),
        descriptionEn: z.string().optional().default(""),
        descriptionAr: z.string().optional().default(""),
        price: z.string().default("0.00"),
        imageUrl: z.string().optional().default(""),
        isActive: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const offerCode = input.code?.trim() || `OFF-${Date.now().toString(36).toUpperCase()}`;
      const [created] = await db
        .insert(offers)
        .values({
          code: offerCode,
          nameEn: input.nameEn,
          nameAr: input.nameAr,
          descriptionEn: input.descriptionEn || null,
          descriptionAr: input.descriptionAr || null,
          price: input.price,
          imageUrl: input.imageUrl || null,
          isActive: input.isActive,
        })
        .$returningId();

      return { id: created?.insertId ?? null, success: true, code: offerCode };
    }),

  deleteOffer: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(offers).where(eq(offers.id, input.id)).limit(1);
      const offer = rows[0];
      if (offer?.imageUrl?.startsWith("/uploads/")) {
        const filePath = path.resolve(process.cwd(), offer.imageUrl.slice(1));
        try {
          await fs.promises.unlink(filePath);
        } catch (err) {
          console.warn("Failed to delete offer image:", err);
        }
      }
      await db.delete(offers).where(eq(offers.id, input.id));
      return { success: true };
    }),
});
