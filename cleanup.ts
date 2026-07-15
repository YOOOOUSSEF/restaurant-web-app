import { getDb } from "./api/queries/connection";
import { restaurants, branches, deliveryAreas } from "./db/schema";
import { sql } from "drizzle-orm";

async function cleanup() {
  const db = getDb();
  // Delete duplicate restaurants (keep id=1)
  await db.delete(restaurants).where(sql`id > 1`);
  // Delete duplicate branches (keep id=1)
  await db.delete(branches).where(sql`id > 1`);
  // Delete duplicate delivery areas (keep first 3)
  await db.delete(deliveryAreas).where(sql`id > 3`);
  console.log("Cleanup done");
}
cleanup().catch(console.error);
