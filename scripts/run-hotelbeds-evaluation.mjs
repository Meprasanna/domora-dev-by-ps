import crypto from "node:crypto";

const apiKey = process.env.HOTELBEDS_API_KEY;
const secret = process.env.HOTELBEDS_API_SECRET;
if (!apiKey || !secret) throw new Error("Hotelbeds credentials are not configured");
const checkIn = "2026-09-10";
const checkOut = "2026-09-12";
const signature = crypto.createHash("sha256").update(`${apiKey}${secret}${Math.floor(Date.now() / 1000)}`).digest("hex");
const response = await fetch("https://api.test.hotelbeds.com/hotel-api/1.0/hotels", {
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/json", "Api-key": apiKey, "X-Signature": signature },
  body: JSON.stringify({ stay: { checkIn, checkOut }, occupancies: [{ rooms: 1, adults: 2, children: 0 }], hotels: { hotel: [3424] } }),
});
const body = await response.text();
console.log(JSON.stringify({ status: response.status, ok: response.ok, provider: "hotelbeds", propertyCode: "3424", checkIn, checkOut, responsePreview: body.slice(0, 4000) }, null, 2));
if (!response.ok) process.exitCode = 1;
