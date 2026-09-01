import { sendEmail } from "./email";
import { getDb } from "./db";
import { notifications } from "../drizzle/schema";

export type NotificationEvent = "partner_application_received" | "partner_application_approved" | "partner_application_rejected" | "booking_created" | "booking_confirmed" | "refresh_failed";

type NotificationInput = { userId: number; email?: string | null; phone?: string | null; event: NotificationEvent; subject: string; text: string; html?: string };
export type RefreshAlertChannel = "email" | "whatsapp" | "in_app";
export function configuredRefreshAlertChannels(input: { email?: string | null; whatsapp?: string | null; inAppEnabled?: boolean }): RefreshAlertChannel[] { return [input.email ? "email" : null, input.whatsapp ? "whatsapp" : null, input.inAppEnabled ? "in_app" : null].filter((channel): channel is RefreshAlertChannel => Boolean(channel)); }

export function whatsappTemplate(event: NotificationEvent, text: string) {
  const prefix: Record<NotificationEvent, string> = {
    partner_application_received: "Domora partner application received",
    partner_application_approved: "Domora partner application approved",
    partner_application_rejected: "Domora partner application update",
    booking_created: "Domora booking payment pending",
    booking_confirmed: "Domora booking confirmed",
    refresh_failed: "Domora price refresh failed",
  };
  return `*${prefix[event]}*\\n\\n${text}\\n\\nReply to this message if you need help from Domora support.`;
}

export async function sendWhatsApp(input: { phone: string; event: NotificationEvent; text: string }) {
  const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return { enabled: false as const };
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: input.phone, type: "text", text: { preview_url: false, body: whatsappTemplate(input.event, input.text) } }),
  });
  if (!response.ok) throw new Error("WhatsApp provider rejected the message");
  const body = await response.json() as { messages?: Array<{ id?: string }> };
  return { enabled: true as const, messageId: body.messages?.[0]?.id };
}

export async function notifyUser(input: NotificationInput) {
  const deliveries: Array<{ channel: "email" | "whatsapp"; status: string; providerMessageId?: string }> = [];
  if (input.email && process.env.GMAIL_SMTP_USER && process.env.GMAIL_SMTP_APP_PASSWORD) {
    const result = await sendEmail({ to: input.email, subject: input.subject, text: input.text, html: input.html });
    deliveries.push({ channel: "email", status: "sent", providerMessageId: result.messageId });
  }
  if (input.phone && process.env.META_WHATSAPP_ACCESS_TOKEN && process.env.META_WHATSAPP_PHONE_NUMBER_ID) {
    const result = await sendWhatsApp({ phone: input.phone, event: input.event, text: input.text });
    deliveries.push({ channel: "whatsapp", status: result.enabled ? "sent" : "disabled", providerMessageId: result.messageId });
  }
  const db = await getDb();
  if (db) {
    for (const delivery of deliveries) {
      const recipient = delivery.channel === "email" ? input.email : input.phone;
      if (recipient) await db.insert(notifications).values({ userId: input.userId, channel: delivery.channel, eventType: input.event, recipient, status: delivery.status === "sent" ? "sent" : "disabled", providerMessageId: delivery.providerMessageId });
    }
  }
  return { userId: input.userId, event: input.event, deliveries };
}
