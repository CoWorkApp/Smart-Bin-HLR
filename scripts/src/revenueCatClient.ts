import { createClient } from "@replit/revenuecat-sdk/client";
import { createConfig } from "@replit/revenuecat-sdk/client";

export function getRevenueCatClient() {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) throw new Error("REVENUECAT_SECRET_KEY not set");
  return createClient(
    createConfig({ baseUrl: "https://api.revenuecat.com/v2", auth: key }),
  );
}
