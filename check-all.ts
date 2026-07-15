import { getDb } from "./api/queries/connection";
import * as s from "./db/schema";

async function check() {
  const db = getDb();
  const tables = [
    ["restaurants", s.restaurants],
    ["branches", s.branches],
    ["deliveryAreas", s.deliveryAreas],
    ["categories", s.categories],
    ["products", s.products],
    ["tables", s.tables],
    ["inventoryItems", s.inventoryItems],
    ["suppliers", s.suppliers],
    ["coupons", s.coupons],
  ];
  for (const [name, table] of tables) {
    try {
      const rows = await db.select().from(table);
      console.log(`${name}: ${rows.length} rows`);
    } catch (e: any) {
      console.log(`${name}: ERROR - ${e.message}`);
    }
  }
}
check().catch(console.error);
