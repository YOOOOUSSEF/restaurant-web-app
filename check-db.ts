import { getDb } from "./api/queries/connection";
import { categories, restaurants, branches, deliveryAreas } from "./db/schema";

async function check() {
  const db = getDb();
  const r = await db.select().from(restaurants);
  const b = await db.select().from(branches);
  const d = await db.select().from(deliveryAreas);
  const c = await db.select().from(categories);
  console.log("Restaurants:", r.length);
  console.log("Branches:", b.length);
  console.log("DeliveryAreas:", d.length);
  console.log("Categories:", c.length, JSON.stringify(c, null, 2));
}
check();
