# Supplier comparison research baseline

## Current Domora database

Domora currently uses Drizzle ORM with the MySQL2 driver and MySQL Core schema helpers. The schema declares tables with `mysqlTable`, `mysqlEnum`, `int`, `timestamp`, and MySQL-specific upsert behavior. `server/db.ts` imports `drizzle-orm/mysql2`, and `secret.txt` currently documents a MySQL `DATABASE_URL`. A PostgreSQL migration therefore requires a dialect conversion across schema declarations, connection code, upserts, generated migrations, environment documentation, and database application—not only a connection-string change.

## Provider access findings

Expedia Group’s official Rapid API is a partner product for building lodging shopping, booking, payment, and post-booking experiences. It is accessed through Expedia’s partner portal and is not an anonymous free public feed. Source: https://partner.expediagroup.com/en-us/solutions/build-your-travel-experience/rapid-api

Booking.com’s official developer portal lists the Demand API, Connectivity APIs, and Metasearch Connect API. These are partner-facing products; the portal does not present an unrestricted public hotel-rate endpoint. Source: https://developers.booking.com/

Google’s Hotel Center Travel Partner API is an authenticated API for managing Hotel Center data for large or complex accounts. Its documented resources include hotel views, price views, price accuracy, and price coverage reports; it is not a general anonymous search API for arbitrary competitors’ live hotel rates. Source: https://developers.google.com/hotels/hotel-prices/api-reference/rest

Amadeus’s former self-service developer portal is documented as decommissioned on July 17, 2026 on the current hotel API page; the page now routes developers toward enterprise API access and sandbox/contact flows. Source: https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-search/api-reference

## Implementation implication

Domora should use provider adapters with explicit provenance, request timestamps, freshness windows, total and nightly prices, taxes/fees, cancellation terms, currency, and provider attribution. Official APIs or licensed affiliate/aggregator feeds should be preferred. Web extraction should only be added where the provider’s terms and robots/access policy permit it; it must not be presented as a guaranteed real-time feed. Demo offers must be visibly labelled as demo data and must never be used to fabricate reviews, ratings, or testimonials.


## August 2026 provider selection update

### Hotelbeds API Suite

The official Hotelbeds getting-started documentation states that registration provides an API key and secret, access to an evaluation environment, and a test endpoint at `https://api.test.hotelbeds.com`. Authentication uses `Api-key` and an `X-Signature` SHA-256 hash of the API key, secret, and current Unix timestamp. The evaluation quota is documented as 50 requests per day. The test environment does not create real reservations or charge cards, making it suitable for a display-only development adapter. Source: https://developer.hotelbeds.com/documentation/getting-started/

### Booking.com Demand API

The official Booking.com Demand API sandbox documentation states that accommodation search, availability, and order flows can be tested without affecting production data. It uses the production API key token and affiliate ID, with the sandbox base URL `https://demandapi-sandbox.booking.com/3.2`. Access requires meeting Booking.com Demand API prerequisites, so it is not an anonymous free API. Source: https://developers.booking.com/demand/docs/getting-started/sandbox

### Selection

Hotelbeds is selected for the first source-specific integration because its official documentation explicitly provides evaluation credentials, a test endpoint, a stated free evaluation quota, and a documented hotel API authentication scheme. The adapter will remain display-only and will map only comparable hotel offers into `supplierOffers`; it will not call any Hotelbeds booking endpoint. Raw credentials will remain in secure project settings under `HOTELBEDS_API_KEY` and `HOTELBEDS_API_SECRET`.
