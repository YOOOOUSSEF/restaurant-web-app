import { z } from "zod";
import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { calculateMovementStockDelta } from "../inventory-movements";
import {
  inventoryItems,
  recipes,
  stockMovements,
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
} from "@db/schema";

export const inventoryRouter = createRouter({
  // Inventory Items
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(inventoryItems).orderBy(inventoryItems.nameEn);
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(inventoryItems).where(eq(inventoryItems.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  getLowStock: publicQuery.query(async () => {
    const db = getDb();
    const items = await db.select().from(inventoryItems);
    return items.filter(
      (item) => parseFloat(item.currentStock) <= parseFloat(item.minThreshold || "0")
    );
  }),

  createItem: publicQuery
    .input(
      z.object({
        code: z.string().min(1),
        nameEn: z.string().min(1),
        nameAr: z.string().min(1),
        unit: z.string().optional().default("unit"),
        currentStock: z.string().optional().default("0.00"),
        minThreshold: z.string().optional().default("10.00"),
        costPerUnit: z.string().optional().nullable(),
        isActive: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [created] = await db
        .insert(inventoryItems)
        .values({
          code: input.code,
          nameEn: input.nameEn,
          nameAr: input.nameAr,
          currentStock: input.currentStock,
          unit: input.unit,
          minThreshold: input.minThreshold,
          costPerUnit: input.costPerUnit ?? null,
          isActive: input.isActive,
        })
        .$returningId();

      return { id: created?.insertId ?? null, success: true };
    }),

  updateItem: publicQuery
    .input(
      z.object({
        id: z.number(),
        code: z.string().optional(),
        nameEn: z.string().optional(),
        nameAr: z.string().optional(),
        unit: z.string().optional(),
        currentStock: z.string().optional(),
        minThreshold: z.string().optional(),
        costPerUnit: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id));
      return { success: true };
    }),

  deleteItem: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(stockMovements).where(eq(stockMovements.inventoryItemId, input.id));
      await db.delete(recipes).where(eq(recipes.inventoryItemId, input.id));
      await db.delete(inventoryItems).where(eq(inventoryItems.id, input.id));
      return { success: true };
    }),

  adjustStock: publicQuery
    .input(
      z.object({
        inventoryItemId: z.number(),
        quantity: z.number(),
        movementType: z.enum(["in", "out", "adjustment", "waste"]),
        reason: z.string().optional(),
        referenceType: z.string().optional(),
        referenceId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      await db.insert(stockMovements).values({
        inventoryItemId: input.inventoryItemId,
        movementType: input.movementType,
        quantity: Math.abs(input.quantity).toFixed(2),
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      });

      const sign = input.movementType === "in" ? 1 : -1;
      await db
        .update(inventoryItems)
        .set({
          currentStock: sql`CAST(current_stock AS DECIMAL(10,2)) + ${(sign * Math.abs(input.quantity)).toFixed(2)}`,
        })
        .where(eq(inventoryItems.id, input.inventoryItemId));

      return { success: true };
    }),

  updateMovement: publicQuery
    .input(
      z.object({
        id: z.number(),
        quantity: z.string().optional(),
        movementType: z.enum(["in", "out", "adjustment", "waste"]).optional(),
        reason: z.string().optional().nullable(),
        referenceType: z.string().optional().nullable(),
        referenceId: z.number().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [movement] = await db.select().from(stockMovements).where(eq(stockMovements.id, input.id)).limit(1);
      if (!movement) throw new Error("Movement not found");

      const previousQuantity = parseFloat(String(movement.quantity ?? "0"));
      const previousMovementType = movement.movementType ?? "out";
      const nextQuantity = input.quantity !== undefined ? parseFloat(input.quantity) : previousQuantity;
      const nextMovementType = input.movementType ?? previousMovementType;
      const delta = calculateMovementStockDelta({
        previousQuantity,
        previousMovementType,
        nextQuantity,
        nextMovementType,
      });

      if (delta !== 0) {
        await db
          .update(inventoryItems)
          .set({
            currentStock: sql`CAST(current_stock AS DECIMAL(10,2)) + ${(delta.toFixed(2))}`,
          })
          .where(eq(inventoryItems.id, movement.inventoryItemId));
      }

      const updateValues: Record<string, unknown> = {};
      if (input.quantity !== undefined) updateValues.quantity = parseFloat(input.quantity).toFixed(2);
      if (input.movementType !== undefined) updateValues.movementType = input.movementType;
      if (input.reason !== undefined) updateValues.reason = input.reason ?? null;
      if (input.referenceType !== undefined) updateValues.referenceType = input.referenceType ?? null;
      if (input.referenceId !== undefined) updateValues.referenceId = input.referenceId ?? null;

      if (Object.keys(updateValues).length > 0) {
        await db.update(stockMovements).set(updateValues).where(eq(stockMovements.id, input.id));
      }

      return { success: true };
    }),

  getMovements: publicQuery
    .input(z.object({ inventoryItemId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const query = db
        .select({
          id: stockMovements.id,
          inventoryItemId: stockMovements.inventoryItemId,
          movementType: stockMovements.movementType,
          quantity: stockMovements.quantity,
          reason: stockMovements.reason,
          referenceType: stockMovements.referenceType,
          referenceId: stockMovements.referenceId,
          createdBy: stockMovements.createdBy,
          createdAt: stockMovements.createdAt,
          inventoryItemName: inventoryItems.nameEn,
          inventoryItemNameAr: inventoryItems.nameAr,
          inventoryItemCode: inventoryItems.code,
        })
        .from(stockMovements)
        .leftJoin(inventoryItems, eq(stockMovements.inventoryItemId, inventoryItems.id))
        .orderBy(desc(stockMovements.createdAt));

      if (input?.inventoryItemId) {
        return query.where(eq(stockMovements.inventoryItemId, input.inventoryItemId));
      }
      return query;
    }),

  // Recipes
  listRecipes: publicQuery
    .input(z.object({ productId: z.number().optional(), offerId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.productId) {
        return db.select().from(recipes).where(eq(recipes.productId, input.productId));
      }
      if (input?.offerId) {
        return db.select().from(recipes).where(eq(recipes.offerId, input.offerId));
      }
      return db.select().from(recipes);
    }),

  // Suppliers
  listSuppliers: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(suppliers).orderBy(suppliers.name);
  }),

  createSupplier: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        contactPerson: z.string().optional().default(""),
        phone: z.string().optional().default(""),
        email: z.string().optional().default(""),
        address: z.string().optional().default(""),
        isActive: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [created] = await db.insert(suppliers).values(input).$returningId();
      return { id: created?.insertId ?? null, success: true };
    }),

  updateSupplier: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        contactPerson: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(suppliers).set(data).where(eq(suppliers.id, id));
      return { success: true };
    }),

  deleteSupplier: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(suppliers).where(eq(suppliers.id, input.id));
      return { success: true };
    }),

  // Purchase Orders
  listPurchaseOrders: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
  }),

  getPurchaseOrderById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id)).limit(1);
      if (!rows[0]) return null;

      const items = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.poId, input.id));

      return { ...rows[0], items };
    }),

  // ── Recipe CRUD ───────────────────────────────────────────

  /** Returns all recipe rows for a product or offer, joined with inventory item details */
  listRecipesWithDetails: publicQuery
    .input(z.object({ productId: z.number().optional(), offerId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = input.productId
        ? await db.select().from(recipes).where(eq(recipes.productId, input.productId))
        : input.offerId
          ? await db.select().from(recipes).where(eq(recipes.offerId, input.offerId))
          : await db.select().from(recipes);

      const result = [];
      for (const row of rows) {
        if (!row.inventoryItemId) continue;
        const invRows = await db
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, row.inventoryItemId))
          .limit(1);
        result.push({
          id: row.id,
          productId: row.productId,
          offerId: row.offerId,
          inventoryItemId: row.inventoryItemId,
          quantityRequired: row.quantityRequired,
          inventoryItem: invRows[0] ?? null,
        });
      }
      return result;
    }),

  /** Add an ingredient to a product or offer recipe */
  createRecipe: publicQuery
    .input(
      z.object({
        productId: z.number().optional(),
        offerId: z.number().optional(),
        inventoryItemId: z.number(),
        quantityRequired: z.string().default("1.00"),
      }).superRefine((value, ctx) => {
        if (!value.productId && !value.offerId) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "productId or offerId is required" });
        }
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [created] = await db
        .insert(recipes)
        .values({
          productId: input.productId ?? null,
          offerId: input.offerId ?? null,
          inventoryItemId: input.inventoryItemId,
          quantityRequired: parseFloat(input.quantityRequired).toFixed(2),
        })
        .$returningId();
      return { id: created?.insertId ?? null, success: true };
    }),

  /** Update the quantityRequired for a recipe row */
  updateRecipe: publicQuery
    .input(
      z.object({
        id: z.number(),
        quantityRequired: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(recipes)
        .set({ quantityRequired: parseFloat(input.quantityRequired).toFixed(2) })
        .where(eq(recipes.id, input.id));
      return { success: true };
    }),

  /** Remove an ingredient from a product recipe */
  deleteRecipe: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(recipes).where(eq(recipes.id, input.id));
      return { success: true };
    }),
});

