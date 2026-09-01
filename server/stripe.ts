import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
const stripe = secretKey ? new Stripe(secretKey) : null;

export const PARTNER_ONBOARDING_FEE_INR = 10_000;

export async function createPartnerOnboardingCheckout(input: {
  userId: number;
  email?: string | null;
  name?: string | null;
  hotelId: number;
  origin: string;
}) {
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email ?? undefined,
    client_reference_id: String(input.userId),
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "inr",
        unit_amount: PARTNER_ONBOARDING_FEE_INR * 100,
        product_data: { name: "Domora hotel partner onboarding" },
      },
    }],
    metadata: {
      user_id: String(input.userId),
      hotel_id: String(input.hotelId),
      customer_name: input.name ?? "",
      customer_email: input.email ?? "",
      payment_purpose: "partner_onboarding",
    },
    allow_promotion_codes: false,
    success_url: `${input.origin}/partner?payment=success&hotelId=${input.hotelId}`,
    cancel_url: `${input.origin}/partner?payment=cancelled&hotelId=${input.hotelId}`,
  });
}

export async function createBookingCheckout(input: { userId: number; email?: string | null; name?: string | null; bookingId: number; totalInr: number; origin: string }) {
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email ?? undefined,
    client_reference_id: String(input.userId),
    line_items: [{ quantity: 1, price_data: { currency: "inr", unit_amount: Math.round(input.totalInr * 100), product_data: { name: `Domora booking #${input.bookingId}` } } }],
    metadata: { user_id: String(input.userId), booking_id: String(input.bookingId), payment_purpose: "booking" },
    allow_promotion_codes: true,
    success_url: `${input.origin}/bookings/${input.bookingId}?payment=success`,
    cancel_url: `${input.origin}/bookings/${input.bookingId}?payment=cancelled`,
  });
}

export function getStripeClient() {
  return stripe;
}
