# Template component assessment

Domora uses the provided shadcn/ui primitives throughout the public, partner, booking, wishlist, and admin surfaces.

The provided `DashboardLayout` was reviewed but not adopted as the primary super-admin shell because its menu items are placeholder entries (`Page 1` and `Page 2`) and its layout assumes a generic dashboard contract. Domora’s admin surface needs a purpose-built approval queue, booking oversight, pricing intelligence, and coupon/review actions, so the current custom shell keeps the correct information hierarchy while reusing the same shadcn primitives.

The provided `MapView` was reviewed. It is a Google Maps proxy component and requires the configured frontend forge map route. Domora’s confirmed requirement specifies free OpenStreetMap Nominatim for pincode/city search, so the landing page intentionally uses the server-side Nominatim procedure and suggestion states rather than introducing a paid/credentialed map surface. A map view can be added later on hotel detail pages when map display is explicitly prioritized.
