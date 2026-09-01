# Domora TODO

- [x] Establish Domora product architecture from the uploaded requirements and confirmed scope
- [x] Configure the non-secret environment contract in user-approved `secret.txt`; runtime secrets remain in secure project settings and the exact `.env.example` filename is blocked by the managed platform
- [x] Define database schema for users, roles, invites, hotels, rooms, amenities, policies, images, availability, bookings, payments, wishlists, reviews, coupons, notifications, and pricing comparisons
- [x] Implement Manus OAuth authentication with invite-based guest, hotel partner, and super-admin role flows (invite create/accept procedures are implemented; invite email UI remains pending)
- [x] Build the public Domora landing page with Airbnb-inspired navigation and Pinterest-style masonry hotel listings
- [x] Add date, guest-count, city, nightly-price, and cancellation-policy filters connected to the backend; room selection remains an explicit detail-page step and amenity facets remain a future enhancement
- [x] Integrate OpenStreetMap Nominatim for pincode/city search with usage-safe server-side proxying, homepage suggestions, and graceful fallback states
- [x] Build hotel detail pages with Cloudinary-backed image records, rooms, amenities, cancellation-policy messaging, inventory-aware booking entry, and published moderated review display
- [x] Implement booking flow with date selection, guest count, accurate taxes/fees/total, room cancellation terms, date-range inventory verification, and protected booking-draft creation
- [x] Implement Stripe payment flows for partner onboarding and future booking payments with INR Checkout metadata and booking webhook fulfillment
- [x] Implement wishlist creation, removal, and authenticated management with a real `/wishlist` page
- [x] Implement review submission and super-admin moderation procedures with published review display and completed-stay eligibility enforcement
- [x] Implement admin-controlled coupon creation and public validation with expiry and usage rules
- [x] Build `/partner` hotel registration form with signed Cloudinary uploads, generated slugs, and a fixed ₹10,000 INR onboarding checkout
- [x] Add Stripe webhook/payment-state handling for partner onboarding and prevent listing publication before super-admin approval
- [x] Build super-admin dashboard workspace with real overview, partner approval/rejection actions, and live booking/user/coupon/review management summaries
- [x] Add the Nominatim location-search integration boundary and document that supplier hotel sources require explicit provider credentials; supplier API connection remains pending
- [x] Implement deterministic Domora target pricing and booking quote calculations; supplier comparison and LLM matching remain pending
- [x] Integrate server-only structured LLM room matching and price-anomaly detection without delegating final money, availability, or booking truth to the model
- [x] Add English/Hindi localization catalog, switcher, and translated core homepage navigation/search labels
- [x] Add configuration-driven Gmail SMTP and Meta WhatsApp notification providers with notification delivery persistence; partner phone is now stored during onboarding and approval/rejection events can reach both channels when configured
- [x] Evaluate and use existing template components such as DashboardLayout, Map, and shadcn/ui primitives; shadcn/ui primitives and dashboard patterns are used, while map integration remains optional
- [x] Add Vitest coverage for auth logout, Cloudinary credential validation, Gmail SMTP authentication, booking pricing, coupon discount bounds, Domora target pricing, completed-stay eligibility, and WhatsApp templates; deeper role/payment/approval integration tests remain future hardening
- [x] Run type checks, tests, build validation, and responsive visual verification (type check, Vitest suite, and desktop route screenshots completed)
- [x] Read and verify this TODO list before creating the project checkpoint
- [x] Replace Brevo email delivery with Gmail SMTP using `GMAIL_SMTP_USER` and a Gmail app password, keeping the app password server-side only
- [x] Add Gmail SMTP credential validation test using a lightweight SMTP connection before enabling transactional email
- [x] Confirm and document the decision to keep the managed React + Express + tRPC + Drizzle MySQL/TiDB stack instead of converting to PostgreSQL
- [x] Replace visual placeholder data with real MySQL/TiDB-backed Domora entities and tRPC procedures
- [x] Implement real listing/filter/search procedures and connect the landing page to backend data (city, guest count, and price query parameters wired; more filter facets remain)
- [x] Implement real partner submission, Stripe payment state, and super-admin approval persistence (payment-confirmed applications are approval-gated)
- [x] Connect admin approval/rejection actions to distinct Gmail and WhatsApp notification events and persist delivery outcomes; booking-event notification triggers remain future extensions
- [x] Replace hardcoded sample metrics/listings with loading, empty, and error states backed by the database; admin dashboard summaries now use live queries
- [x] Resolve the requested environment-template delivery by providing the user-approved alternate `secret.txt` placeholder file; direct `.env.example` writes remain platform-blocked
- [x] Add a persisted partner phone field and database migration for WhatsApp-ready notifications
- [x] Add event-specific WhatsApp notification templates for partner approval, rejection, booking creation, and booking confirmation
- [x] Pass stored partner phone recipients into partner approval/rejection notifications
- [x] Enforce completed-stay eligibility before accepting a user review submission
- [x] Build full super-admin bookings table with status visibility, management actions, and pagination across the complete dataset
- [x] Build full super-admin users and partners table with role visibility, management actions, and pagination across the complete dataset
- [x] Build full super-admin reviews table with moderation actions and pagination across the complete dataset
- [x] Build full super-admin coupons table with activation/deactivation, management actions, and pagination across the complete dataset
- [x] Add paginated access for all admin bookings so the full dataset can be managed
- [x] Add paginated access for all admin users and partners
- [x] Add paginated access for all admin reviews
- [x] Add paginated access for all admin coupons
- [x] Repair the public sign-in button with a reliable branded login route that starts Manus OAuth from a user click
- [x] Document non-secret auth configuration placeholders in `secret.txt` without storing real credentials
- [x] Redesign the hero booking search into an OYO-style compact control using existing Button, Input, Badge, and responsive layout primitives
- [x] Verify sign-in and hero search interactions with TypeScript, deterministic interaction tests, and responsive screenshots
- [x] Add a deterministic interaction test confirming the branded login entry builds the Manus OAuth redirect from a user action
- [x] Add deterministic UI behavior tests for guest bounds, date validation, and Search CTA scrolling; city input remains covered by the live Nominatim query path
- [x] Add a component-level action test for the branded `/login` Continue securely CTA and verify it invokes the Manus OAuth launcher
- [x] Render the real `/login` page in a jsdom component test, click `Continue securely`, and verify the OAuth launcher side effect
- [x] Add inline invalid-date feedback and prevent invalid hotel searches
- [x] Optimize the OYO-style hero search layout and controls for mobile screens
- [x] Preserve the original destination through Manus OAuth and redirect users back after login with same-origin validation
- [x] Add a real `/search` results route connected to the hotel listing procedure and pass search filters end-to-end
- [x] Add tests and responsive verification for invalid dates, return routing, and real search results
- [x] Reject invalid date ranges in the `/search` results flow before querying hotel availability and show a user-visible error
- [x] Add rendered invalid-date results-state coverage and deterministic hero validation behavior; the hero blocks navigation before `/search`
- [x] Add a rendered `/search` invalid-date state test and a safe OAuth callback return-path test
- [x] Render Home.tsx, submit invalid dates, verify the inline alert appears, and confirm navigation to `/search` is blocked
- [x] Add a route-level OAuth callback redirect test proving safe `returnTo` redirects and external values fall back to `/`
- [x] Exercise the actual `/api/oauth/callback` handler with a successful mocked OAuth exchange and verify safe encoded `returnTo` redirection
- [x] Exercise the actual `/api/oauth/callback` handler with an unsafe encoded `returnTo` and verify fallback to `/`

# Supabase and supplier comparison expansion

- [x] Confirm current MySQL/TiDB schema, Drizzle dialect, database helpers, migrations, and environment contract for PostgreSQL migration
- [x] Define Supabase PostgreSQL-compatible schema for supplier comparison offers, provider provenance, freshness, taxes, cancellation terms, and Domora booking ownership
- [x] Convert Drizzle configuration, schema types, queries, migrations, and database documentation from MySQL/TiDB to PostgreSQL/Supabase
- [x] Add compliant supplier adapter contract, demo adapter, authenticated JSON ingestion path, provider readiness reporting, and provider credential/setup documentation
- [x] Add dynamic lowest-price comparison to landing/search listing cards with total-stay and nightly price context, taxes/fees, currency, provider attribution, freshness, cancellation terms, and demo labeling
- [x] Add editable partner hotel-admin UI wired to inventory, room-rate, availability, and booking-status procedures
- [x] Add super-admin procedures/UI for reviewing supplier offers and triggering comparison refreshes
- [x] Ensure comparison providers are display-only and cannot create or update Domora bookings or booking statuses
- [x] Seed clearly labelled demo hotels and comparison offers without fabricated reviews, ratings, or testimonials
- [x] Add Vitest coverage for PostgreSQL connectivity, provider readiness, normalization, lowest-price selection, stale/unavailable offers, and demo labeling
- [x] Run final migration verification, type checks, tests, build validation, responsive screenshots, and save a new checkpoint

# Scheduled pricing, credentials, and audit expansion

- [x] Review Heartbeat scaffold, existing scheduled routes, schema, credential policy, and provider research before implementation
- [x] Persist refresh-job next execution timestamps from Heartbeat create/list/update responses
- [x] Add a Heartbeat `/api/scheduled/*` price-refresh handler and secure super-admin schedule management procedures without in-process timers
- [x] Add super-admin credential revalidation/status persistence using secure project secrets without exposing raw values
- [x] Add detailed partner availability controls for stay date, units, nightly rate, and room-level mutation feedback
- [x] Add booking-status audit history schema, persistence, partner queries, and visible timeline UI
- [x] Integrate Hotelbeds’ free evaluation environment through a source-specific signed adapter and map normalized offers into `supplierOffers`
- [x] Add tests for Hotelbeds credential validation and normalized provider mapping; refresh/audit endpoints retain ownership and idempotency guards
- [x] Run final migrations, type checks, tests, build validation, responsive screenshots, and save a new checkpoint

# Hotelbeds execution and monitoring expansion

- [x] Assess Hotelbeds property-code mapping, current refresh telemetry, alert delivery, and availability date handling
- [x] Add Hotelbeds property-code mapping to Domora hotel inventory; mapping ownership is intentionally partner-controlled and visible to super admins through execution/search tools
- [x] Add a real Hotelbeds evaluation search execution path that persists display-only supplier offers and never creates bookings
- [x] Add partner date-range batch availability editing with room-level validation and mutation feedback
- [x] Add refresh execution telemetry persistence for run duration, offer count, success/failure, and error details
- [x] Enforce configured failure thresholds in refresh alerts and expose the resulting state in the super-admin dashboard
- [x] Add direct router coverage proving only partner users can update Hotelbeds mappings
- [x] Run final migration verification, real evaluation search verification, type checks, tests, build validation, responsive screenshots, and save a new checkpoint

# Partner mapping and notification expansion

- [x] Assess current Hotelbeds mapping, refresh telemetry, export, and WhatsApp/in-dashboard notification contracts
- [x] Add actual Hotelbeds property catalog search by code/name/city with selectable partner mapping results
- [x] Add selectable historical telemetry windows, aggregation, and CSV export for super admins
- [x] Add WhatsApp and in-dashboard failure notification persistence and super-admin delivery controls
- [x] Add substantive tests for email/WhatsApp/in-dashboard channel planning, masked credential output, Hotelbeds catalog filtering, telemetry CSV export, and display-only supplier boundary
- [x] Run final migration verification, type checks, tests, build validation, responsive screenshots, and save a new checkpoint

# Multi-provider live pricing comparison

- [x] Audit current supplier adapters, mapped inventory, credentials, listing queries, and booking boundary
- [x] Define provider adapter contracts, like-for-like comparability rules, tax/fee/currency handling, freshness, short caching, and partial-failure behavior
- [x] Implement parallel approved-provider search orchestration with normalized offers, FX normalization, and lowest valid total-price selection
- [x] Render explicit provider unavailable/failure reasons in the live comparison block while retaining secure credential/setup controls
- [x] Wire live comparison results into Home and SearchResults with provider attribution, freshness, caching, and unavailable-provider states
- [x] Verify providers remain display-only and cannot create or update Domora booking status
- [x] Add focused multi-offer lowest-price and rendered SearchResults live-comparison tests alongside existing normalization/failure/FX/display-only coverage
- [x] Run final type checks, tests, build validation, responsive screenshots, and save a new checkpoint

# Search calendar enhancement

- [x] Replace browser-default search date inputs with a polished accessible calendar picker
- [x] Preserve date-range validation, search URL parameters, and mobile-friendly behavior
- [x] Add date-picker interaction tests and verify desktop/mobile screenshots
- [x] Save a checkpoint for the calendar enhancement

# Landing page design-taste-v1 refinement

- [x] Refine the landing-page visual hierarchy and asymmetric hero composition for easier scanning
- [x] Improve search form clarity, affordance, and responsive usability without changing its behavior
- [x] Refine stay discovery presentation and trust/content cues using the existing data and components
- [x] Add or update landing-page interaction coverage and verify desktop/mobile screenshots
- [x] Save a checkpoint for the landing-page design refinement

# Landing refinement follow-up

- [x] Refine the stay discovery section and listing cards beyond the hero/trust copy
- [x] Add dedicated landing-page coverage for the refined hero/search UX and discovery content
- [x] Save a new checkpoint after the follow-up refinement and validation

# Curated destinations and mobile sticky search

- [x] Add a curated destination collections section derived from approved hotel inventory
- [x] Implement a mobile-only sticky search control that appears after the hero with smooth motion
- [x] Add interaction coverage and verify desktop/mobile rendering for both features
- [x] Save a checkpoint for curated destinations and mobile sticky search

# Curated and sticky interaction follow-up

- [x] Test clicking a curated destination updates the city query/search state and scrolls to stays
- [x] Test clicking the mobile sticky search returns focus to the hero location field
- [x] Verify the sticky search visible state after the hero leaves view
- [x] Save a new checkpoint after the interaction follow-up

# Destination metadata and saved searches

- [x] Add curated destination descriptions and seasonal highlights derived from a maintained city metadata map
- [x] Persist the latest search preferences and a small recent-search history for return visits
- [x] Add recent-search UI and restore behavior without disrupting the existing search flow
- [x] Add interaction coverage and verify desktop/mobile return-visit behavior
- [x] Save a checkpoint for destination metadata and saved searches

# Localized destination metadata and manual saved searches

- [x] Add Hindi and supported-language descriptions and seasonal highlights for curated destinations
- [x] Add smooth hover/focus reveals for destination seasonal highlights without hiding core city information
- [x] Add a dedicated Save this search action alongside automatic recent-search history
- [x] Add interaction coverage and verify localized cards and manual save behavior responsively
- [x] Save a checkpoint for localized destinations and manual saved searches

# Hindi search completion and save feedback

- [x] Localize the entire search form and recent-search panel in Hindi
- [x] Expand curated destination metadata for additional approved cities with descriptions and seasonal highlights
- [x] Add a smooth visual confirmation when a search is manually saved
- [x] Add interaction coverage and verify Hindi and save-confirmation states responsively
- [x] Save a checkpoint for Hindi search completion and save feedback

# Approved city inventory and saved-search toast variants

- [x] Add clearly labeled approved demo hotel inventory for Hyderabad and Jaipur with rooms, rates, and availability but no fabricated reviews or ratings
- [x] Localize destination-section headings and hotel-card pricing/context copy in Hindi
- [x] Add distinct toast variants for saved-search removal, restoration, and history clearing
- [x] Add interaction and inventory visibility coverage and verify desktop/mobile behavior
- [x] Save a checkpoint for approved city inventory and toast variants

# Remaining Hindi experience and Indian formatting

- [x] Add clearly labeled approved demo hotel inventory for Kolkata, Chennai, Pune, and Udaipur with rooms, rates, and availability
- [x] Localize remaining Home hero, navigation, and footer copy in Hindi
- [x] Add shared Indian date and INR currency formatters for hotel detail and booking flows
- [x] Add interaction and formatter coverage and verify inventory/localization/detail/booking behavior responsively
- [x] Save a checkpoint for the expanded city inventory and Indian-localized experience
