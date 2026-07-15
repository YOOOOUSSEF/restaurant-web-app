import { z } from "zod";
import { eq, and, like } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import {
  categories,
  products,
  productOptions,
  productOptionValues,
  productOptionMappings,
  additions,
  productAdditionMappings,
  offers,
} from "@db/schema";

export const menuRouter = createRouter({
  // Categories
  listCategories: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder);
  }),

  getCategoryById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(categories).where(eq(categories.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  // Products
  listProducts: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(products).where(eq(products.isActive, true));
  }),

  getProductById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  getProductsByCategory: publicQuery
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(products)
        .where(and(eq(products.categoryId, input.categoryId), eq(products.isActive, true)));
    }),

  createProduct: publicQuery
    .input(
      z.object({
        code: z.string().min(1),
        categoryId: z.number().nullable().optional(),
        nameEn: z.string().min(1),
        nameAr: z.string().min(1),
        descriptionEn: z.string().optional().default(""),
        descriptionAr: z.string().optional().default(""),
        basePrice: z.string().default("0.00"),
        imageUrl: z.string().optional().default(""),
        isActive: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [created] = await db
        .insert(products)
        .values({
          code: input.code,
          categoryId: input.categoryId ?? null,
          nameEn: input.nameEn,
          nameAr: input.nameAr,
          descriptionEn: input.descriptionEn || null,
          descriptionAr: input.descriptionAr || null,
          basePrice: input.basePrice,
          imageUrl: input.imageUrl || null,
          isActive: input.isActive,
        })
        .$returningId();

      return { id: created?.insertId ?? null, success: true };
    }),

  deleteProduct: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
      const product = rows[0];
      if (product?.imageUrl?.startsWith("/uploads/")) {
        const filePath = path.resolve(process.cwd(), product.imageUrl.slice(1));
        try {
          await fs.promises.unlink(filePath);
        } catch (err) {
          console.warn("Failed to delete product image:", err);
        }
      }
      await db.update(products).set({ isActive: false }).where(eq(products.id, input.id));
      return { success: true };
    }),

  getProductWithDetails: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const productRows = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
      if (!productRows[0]) return null;

      // Get category
      const catRows = productRows[0].categoryId
        ? await db.select().from(categories).where(eq(categories.id, productRows[0].categoryId)).limit(1)
        : [];

      // Get option mappings
      const optMappings = await db
        .select()
        .from(productOptionMappings)
        .where(eq(productOptionMappings.productId, input.id));

      const options = [];
      for (const mapping of optMappings) {
        if (!mapping.optionId) continue;
        const opt = await db.select().from(productOptions).where(eq(productOptions.id, mapping.optionId)).limit(1);
        if (opt[0]) {
          const values = await db
            .select()
            .from(productOptionValues)
            .where(eq(productOptionValues.optionId, opt[0].id));
          options.push({ ...opt[0], values });
        }
      }

      // Get addition mappings
      const addMappings = await db
        .select()
        .from(productAdditionMappings)
        .where(eq(productAdditionMappings.productId, input.id));

      const productAdditions = [];
      for (const mapping of addMappings) {
        if (!mapping.additionId) continue;
        const add = await db.select().from(additions).where(eq(additions.id, mapping.additionId)).limit(1);
        if (add[0]) productAdditions.push(add[0]);
      }

      return {
        product: productRows[0],
        category: catRows[0] ?? null,
        options,
        additions: productAdditions,
      };
    }),

  searchProducts: publicQuery
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            like(products.nameEn, `%${input.query}%`)
          )
        );
    }),

  // Offers
  listOffers: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(offers).where(eq(offers.isActive, true));
  }),

  // Additions (for admin)
  listAdditions: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(additions).where(eq(additions.isActive, true));
  }),
});
