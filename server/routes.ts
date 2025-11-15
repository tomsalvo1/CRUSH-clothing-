import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Shopify configuration endpoint
  app.get("/api/config/shopify", (req, res) => {
    res.json({
      domain: process.env.SHOPIFY_STORE_DOMAIN || "",
      storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || "",
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
