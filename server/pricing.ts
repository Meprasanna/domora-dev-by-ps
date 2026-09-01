export type BookingPriceInput = {
  nightlyRateInr: number;
  nights: number;
  taxRate?: number;
  serviceFeeRate?: number;
  coupon?: { type: "percent" | "fixed_inr"; value: number };
};

export function calculateBookingPrice(input: BookingPriceInput) {
  if (!Number.isFinite(input.nightlyRateInr) || input.nightlyRateInr < 0) throw new Error("Invalid nightly rate");
  if (!Number.isInteger(input.nights) || input.nights < 1) throw new Error("At least one night is required");
  const subtotalInr = Math.round(input.nightlyRateInr * input.nights * 100) / 100;
  const taxInr = Math.round(subtotalInr * (input.taxRate ?? 0.12) * 100) / 100;
  const feeInr = Math.round(subtotalInr * (input.serviceFeeRate ?? 0.05) * 100) / 100;
  const rawDiscount = input.coupon?.type === "percent" ? subtotalInr * (input.coupon.value / 100) : input.coupon?.value ?? 0;
  const discountInr = Math.min(subtotalInr, Math.max(0, Math.round(rawDiscount * 100) / 100));
  const totalInr = Math.max(0, Math.round((subtotalInr + taxInr + feeInr - discountInr) * 100) / 100);
  return { subtotalInr, taxInr, feeInr, discountInr, totalInr };
}

export function calculateDomoraTargetPrice(marketBenchmarkInr: number) {
  if (!Number.isFinite(marketBenchmarkInr) || marketBenchmarkInr < 0) throw new Error("Invalid market benchmark");
  return Math.round(marketBenchmarkInr * 0.8 * 100) / 100;
}
