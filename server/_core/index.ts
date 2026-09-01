import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import Stripe from "stripe";
import { getDb } from "../db";
import { availability, bookings, hotels, partnerApplications } from "../../drizzle/schema";
import { and, eq, gte, lt } from "drizzle-orm";
import { handleScheduledPriceRefresh } from "../scheduledPriceRefresh";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripeWebhookSecret || !process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: "Stripe is not configured" });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"] as string, stripeWebhookSecret);
    } catch {
      return res.status(400).send("Invalid webhook signature");
    }
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.payment_purpose === "partner_onboarding") {
        const db = await getDb();
        const hotelId = Number(session.metadata.hotel_id);
        if (db && hotelId) {
          await db.update(partnerApplications).set({ status: "payment_confirmed", stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null }).where(eq(partnerApplications.hotelId, hotelId));
          await db.update(hotels).set({ status: "pending_approval" }).where(eq(hotels.id, hotelId));
        }
      }
      if (session.metadata?.payment_purpose === "booking") {
        const db = await getDb();
        const bookingId = Number(session.metadata.booking_id);
        if (db && bookingId) {
          const booking = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
          if (booking[0]) {
            await db.update(bookings).set({ status: "confirmed", stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null }).where(eq(bookings.id, bookingId));
            const inventory = await db.select().from(availability).where(and(eq(availability.roomId, booking[0].roomId), gte(availability.stayDate, booking[0].checkIn), lt(availability.stayDate, booking[0].checkOut)));
            for (const day of inventory) await db.update(availability).set({ availableUnits: Math.max(0, day.availableUnits - 1) }).where(eq(availability.id, day.id));
          }
        }
      }
    }
    return res.json({ received: true });
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/scheduled/refresh-prices", handleScheduledPriceRefresh);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
