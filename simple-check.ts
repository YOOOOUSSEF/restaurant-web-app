import { getDb } from "./api/queries/connection";
import { restaurants } from "./db/schema";

async function check() {
  const db = getDb();
  console.log("Checking restaurants...");
  const r = await db.select().from(restaurants);
  console.log("Found:", r.length, "restaurants");
  console.log(JSON.stringify(r, null, 2));
}
check().catch(console.error);
