import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  kimiAuthUrl: process.env.VITE_KIMI_AUTH_URL || "https://kimi-auth.example.com",
  kimiOpenUrl: process.env.VITE_KIMI_OPEN_URL || "https://kimi-open.example.com",
  ownerUnionId: process.env.OWNER_UNION_ID || "",
};
