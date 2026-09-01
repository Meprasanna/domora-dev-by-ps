import { describe, expect, it } from "vitest";
import { calculateBookingPrice, calculateDomoraTargetPrice } from "./pricing";

describe("Domora pricing rules", () => {
  it("calculates a transparent booking quote", () => {
    expect(calculateBookingPrice({ nightlyRateInr: 2300, nights: 2 })).toEqual({ subtotalInr: 4600, taxInr: 552, feeInr: 230, discountInr: 0, totalInr: 5382 });
  });

  it("applies coupon discounts without going below zero", () => {
    expect(calculateBookingPrice({ nightlyRateInr: 1000, nights: 1, coupon: { type: "percent", value: 20 } }).discountInr).toBe(200);
    expect(calculateBookingPrice({ nightlyRateInr: 1000, nights: 1, coupon: { type: "fixed_inr", value: 5000 } }).discountInr).toBe(1000);
  });

  it("targets exactly 20 percent below a market benchmark", () => {
    expect(calculateDomoraTargetPrice(2300)).toBe(1840);
  });
});
