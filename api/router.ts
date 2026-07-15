import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { menuRouter } from "./routers/menu";
import { orderRouter } from "./routers/order";
import { customerRouter } from "./routers/customer";
import { inventoryRouter } from "./routers/inventory";
import { dashboardRouter } from "./routers/dashboard";
import { restaurantRouter } from "./routers/restaurant";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  menu: menuRouter,
  order: orderRouter,
  customer: customerRouter,
  inventory: inventoryRouter,
  dashboard: dashboardRouter,
  restaurant: restaurantRouter,
});

export type AppRouter = typeof appRouter;
