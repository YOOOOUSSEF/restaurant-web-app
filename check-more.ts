import { getDb } from "./api/queries/connection";
import * as s from "./db/schema";

async function check() {
  const db = getDb();
  const tables = [
    ["productOptions", s.productOptions],
    ["productOptionValues", s.productOptionValues],
    ["additions", s.additions],
    ["offers", s.offers],
    ["loyaltyRewards", s.loyaltyRewards],
    ["campaigns", s.campaigns],
    ["systemUsers", s.systemUsers],
    ["settings", s.settings],
    ["recipes", s.recipes],
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
