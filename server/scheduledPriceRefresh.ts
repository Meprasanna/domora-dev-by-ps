import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { hotels, notifications, priceRefreshJobs, refreshAlertSettings, refreshExecutionRuns, supplierOffers } from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import { createDemoSupplierAdapter } from "./supplierAdapters";
import { searchHotelbeds } from "./hotelbedsAdapter";
import { shouldSendRefreshFailureAlert, shouldSkipRefreshRun } from "./refreshGuards";
import { configuredRefreshAlertChannels, sendWhatsApp } from "./notifications";

export async function handleScheduledPriceRefresh(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "database-unavailable" });
    const jobs = await db.select().from(priceRefreshJobs).where(eq(priceRefreshJobs.scheduleCronTaskUid, user.taskUid)).limit(1);
    const job = jobs[0];
    if (!job) return res.json({ ok: true, skipped: "orphan" });
    const runKey = `${user.taskUid}:${job.checkIn}:${job.checkOut}`;
    if (shouldSkipRefreshRun(job.lastRunKey, runKey, job.lastSuccessAt)) return res.json({ ok: true, skipped: "idempotent" });
    const startedAt = new Date();
    const [run] = await db.insert(refreshExecutionRuns).values({ refreshJobId: job.id, providerKey: job.providerKey, status: "running", startedAt }).returning();
    await db.update(priceRefreshJobs).set({ status: "running", lastRunAt: startedAt, lastRunKey: runKey, lastError: null, updatedAt: startedAt }).where(eq(priceRefreshJobs.id, job.id));
    const input = { hotelId: job.hotelId, roomId: job.roomId, checkIn: job.checkIn, checkOut: job.checkOut, guests: job.guests };
    const mappedHotel = job.providerHotelCode ? job.providerHotelCode : (await db.select({ hotelbedsCode: hotels.hotelbedsCode }).from(hotels).where(eq(hotels.id, job.hotelId)).limit(1))[0]?.hotelbedsCode;
    const offers = job.providerKey === "hotelbeds" && mappedHotel ? await searchHotelbeds({ ...input, hotelCode: mappedHotel }) : await createDemoSupplierAdapter().search(input);
    for (const offer of offers) await db.insert(supplierOffers).values({ ...offer, comparable: offer.comparable ? 1 : 0, isDemo: offer.isDemo ? 1 : 0, taxesInr: String(offer.taxesInr), feesInr: String(offer.feesInr), nightlyPriceInr: String(offer.nightlyPriceInr), totalPriceInr: String(offer.totalPriceInr), currency: offer.currency, status: offer.status });
    const finishedAt = new Date();
    await db.update(refreshExecutionRuns).set({ status: "success", finishedAt, durationMs: finishedAt.getTime() - startedAt.getTime(), offerCount: offers.length }).where(eq(refreshExecutionRuns.id, run.id));
    await db.update(priceRefreshJobs).set({ status: "success", lastSuccessAt: finishedAt, updatedAt: finishedAt }).where(eq(priceRefreshJobs.id, job.id));
    return res.json({ ok: true, count: offers.length, displayOnly: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try { const user = await sdk.authenticateRequest(req); if (user.taskUid) { const db = await getDb(); if (db) { const failedJob = (await db.select().from(priceRefreshJobs).where(eq(priceRefreshJobs.scheduleCronTaskUid, user.taskUid)).limit(1))[0]; if (failedJob) { const finishedAt = new Date(); const startedAt = failedJob.lastRunAt ?? finishedAt; await db.insert(refreshExecutionRuns).values({ refreshJobId: failedJob.id, providerKey: failedJob.providerKey, status: "failed", startedAt, finishedAt, durationMs: finishedAt.getTime() - startedAt.getTime(), offerCount: 0, errorMessage: message }); await db.update(priceRefreshJobs).set({ status: "failed", lastError: message, updatedAt: finishedAt }).where(eq(priceRefreshJobs.id, failedJob.id)); const alert = (await db.select().from(refreshAlertSettings).limit(1))[0]; if (alert?.enabled && configuredRefreshAlertChannels({ email: alert.recipientEmail, whatsapp: alert.whatsappRecipient, inAppEnabled: Boolean(alert.inAppEnabled) }).length) { const recentRuns = await db.select({ status: refreshExecutionRuns.status }).from(refreshExecutionRuns).where(eq(refreshExecutionRuns.refreshJobId, failedJob.id)).orderBy(desc(refreshExecutionRuns.startedAt)).limit(alert.failureThreshold); if (shouldSendRefreshFailureAlert(recentRuns.map(run => run.status), alert.failureThreshold)) { const text = `The last ${alert.failureThreshold} scheduled refresh run(s) failed for ${failedJob.providerKey}. Latest error: ${message}`; if (configuredRefreshAlertChannels({ email: alert.recipientEmail }).includes("email")) { const { sendEmail } = await import("./email"); await sendEmail({ to: alert.recipientEmail!, subject: `Domora price refresh failed: ${failedJob.providerKey}`, text }); await db.insert(notifications).values({ userId: alert.updatedByUserId ?? failedJob.createdByUserId, channel: "email", eventType: "refresh_failed", recipient: alert.recipientEmail!, status: "sent" }); } if (configuredRefreshAlertChannels({ whatsapp: alert.whatsappRecipient }).includes("whatsapp")) { try { const whatsapp = await sendWhatsApp({ phone: alert.whatsappRecipient!, event: "refresh_failed", text }); await db.insert(notifications).values({ userId: alert.updatedByUserId ?? failedJob.createdByUserId, channel: "whatsapp", eventType: "refresh_failed", recipient: alert.whatsappRecipient!, status: whatsapp.enabled ? "sent" : "disabled", providerMessageId: whatsapp.messageId }); } catch (whatsappError) { await db.insert(notifications).values({ userId: alert.updatedByUserId ?? failedJob.createdByUserId, channel: "whatsapp", eventType: "refresh_failed", recipient: alert.whatsappRecipient!, status: "failed", errorMessage: whatsappError instanceof Error ? whatsappError.message : String(whatsappError) }); } } if (configuredRefreshAlertChannels({ inAppEnabled: Boolean(alert.inAppEnabled) }).includes("in_app")) await db.insert(notifications).values({ userId: alert.updatedByUserId ?? failedJob.createdByUserId, channel: "in_app", eventType: "refresh_failed", recipient: String(alert.updatedByUserId ?? failedJob.createdByUserId), status: "sent", errorMessage: text }); } } } } } } catch { /* preserve original failure */ }
    return res.status(500).json({ error: message, context: { url: req.originalUrl }, timestamp: new Date().toISOString() });
  }
}
