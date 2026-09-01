# Domora integrations

## Current providers

Domora uses Supabase PostgreSQL through Drizzle ORM, Manus OAuth for authentication, OpenStreetMap Nominatim for city and pincode geocoding, Cloudinary for partner hotel image storage, Stripe Checkout for INR partner onboarding and booking payments, Gmail SMTP for transactional email, and Meta WhatsApp Cloud API when the optional WhatsApp credentials are configured.

## Environment contract

The server reads a Supabase PostgreSQL `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, `META_WHATSAPP_ACCESS_TOKEN`, and `META_WHATSAPP_PHONE_NUMBER_ID`. Optional supplier adapters may read provider-specific credentials from secure project settings. Client code must never receive database passwords, SMTP passwords, Stripe secret keys, Cloudinary API secrets, supplier credentials, or WhatsApp access tokens.

## Supplier hotel sources

Domora uses a supplier adapter boundary. Official APIs and licensed affiliate or aggregator feeds are preferred; permitted web extraction may be added only after reviewing the provider’s terms, robots/access policy, and rate-display permissions. Each adapter must normalize property and room identity, occupancy, cancellation policy, total and nightly prices, taxes and fees, currency, source URL or attribution, offer freshness, and provider status. The lowest eligible offer is selected deterministically from fresh, comparable offers. Supplier results are display-only: they never create, confirm, cancel, or update a Domora booking. The LLM may compare normalized descriptions and flag anomalies, but backend-calculated price, availability, payment, and Domora booking truth remain authoritative.

## Nominatim usage

Location lookup is proxied server-side through `hotels.geocode`, sends a descriptive User-Agent, limits results, and exposes loading/error/empty states in the homepage. It is intended for low-volume search assistance rather than bulk geocoding.
