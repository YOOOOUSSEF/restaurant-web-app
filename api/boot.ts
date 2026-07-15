import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = new Hono<{ Bindings: HttpBindings }>();

const uploadsDir = path.resolve(process.cwd(), "uploads");

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

app.post("/api/upload", async (c) => {
  try {
    const formData = await c.req.raw.formData();
    const file = formData.get("file") as Blob | null;
    if (!file || typeof file.arrayBuffer !== "function") {
      return c.json({ error: "No file uploaded" }, 400);
    }

    const fileName = (file as any).name || "upload";
    const extension = path.extname(fileName) || ".jpg";
    const safeName = `${crypto.randomUUID()}${extension}`;
    const uploadPath = path.join(uploadsDir, safeName);

    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(uploadPath, buffer);

    return c.json({ success: true, url: `/uploads/${safeName}` });
  } catch (error) {
    console.error("Upload failed:", error);
    return c.json({ error: "Upload failed" }, 500);
  }
});

app.get("/uploads/*", serveStatic({ root: "./uploads" }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
