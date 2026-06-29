# Travelfy — project context

Mobile-first PWA travel-planning app. Built with Vite + React 18 + TS + Tailwind + Radix/shadcn UI + Supabase. Deployed on Vercel.

## What it is

Single-user trip command center: flights, hotels, day-by-day itinerary with activities, checklist, expenses with FX conversion, documents, passport & visas, currency converter, emergency contacts, quick links, notes, photos (GPS-tagged), interactive map (Leaflet + OSM + Overpass POI search + OSRM walking nav). Designed for someone actively traveling, not just planning.

## Stack

- **Vite 5** + React 18 + TypeScript 5 (strict)
- **Tailwind 3** + custom HSL theme; `cn()` from `clsx + tailwind-merge`
- **shadcn-style UI primitives** wrapping Radix (Dialog/Select/Tabs/etc.) in `src/components/ui/`
- **framer-motion** for transitions
- **Recharts** for spending charts
- **Leaflet** (not react-leaflet) for the map — imperative API, custom markers
- **Supabase** for auth + Postgres + Storage (`trip-photos` bucket)
- **Zod** runtime validation at the Supabase boundary (`src/services/schemas.ts`)
- **vite-plugin-pwa** with `injectManifest` strategy (our own `src/sw.ts`), workbox precaching + runtime caching for OSM tiles / Nominatim / Overpass proxy
- **Vercel serverless** function at `api/overpass.js` for the Overpass API CORS proxy

## Directory layout (high-level)

```
src/
  pages/            One-per-route screens (Dashboard, Trips, Flights, Hotels, Timeline, Photos, Stats, ...)
  components/
    ui/             shadcn-style Radix wrappers (Input, Dialog, Select, Button, ...)
    common/         App-specific shared components (TripCard, ProfileSheet, QuickAddExpense, ReminderBanner, ...)
    map/            MapExplorer sub-components (NavigationBanner, SavePlaceSheet, LocationPicker, geocode helper, types)
  contexts/         AuthContext, TripContext, ThemeContext
  services/         storage.ts (Supabase CRUD) + schemas.ts (Zod row schemas)
  utils/            currency, itinerary, hotel, flight, expiry, dateUtils, fxApi, image (compress), receiptUpload, reminders, cn
  hooks/            useCurrentPlace (GPS+reverse-geocode), useFlightStatusSync
  layouts/          MainLayout (handles error banner + ReminderBanner + BottomNav), BottomNav
  data/             sampleTrip.ts, emptyTrip.ts
  types/index.ts    All shared TS interfaces
  sw.ts             Service worker (clientsClaim + precache + runtime caches)
api/overpass.js     Vercel serverless proxy (CORS-gated, query-validated)
supabase/migrations/ SQL files the user runs in Supabase SQL editor
```

## Key architectural decisions

### Routing & lobby mode

- `/` is the Dashboard. Login clears `activeTripId` so users land in **lobby** (greeting + trip picker; no trip features).
- `/trips` is the trip list / picker.
- Every trip-scoped route (`/flights`, `/timeline`, `/expenses`, `/photos`, ...) is inside `MainLayout`, which redirects to `/trips` when no active trip — except `/` is allowed through so Dashboard can render its lobby UI.
- Selecting a trip sets `activeTripId` (TripContext + localStorage) and routes to `/`.

### TripContext is the single source of truth

- `trip: TripData` for the active trip + `trips: TripSummary[]` for the picker.
- Mutations go through `updateTrip(updater)`, which optimistically updates local state and debounces a `saveTrip` call (800ms) so rapid edits batch.
- Reads always come from this context; no per-component fetching.
- `refreshTrip()` re-pulls from Supabase; auto-fires on `document.visibilitychange`.

### Derive-then-self-heal pattern

Two state machines (`Flight.status`, `ItineraryActivity.done`) are derived from date/time at render time AND eventually written back to the DB so other devices see the correct value. Implementation in `useFlightStatusSync`. Done flags went one step further with a Postgres column + migration.

### Currency conversion

- `src/utils/currency.ts` `getRate(rates, from, to)` does direct → inverse → two-hop pivot.
- `sumExpenses(rates, expenses, target)` returns `{total, unconvertedCount}` so callers can warn.
- Live rates pulled from `open.er-api.com` (free, no auth, 161 currencies) via `src/utils/fxApi.ts`, 6h localStorage cache.
- Stored on the trip in `trip.currencyRates: { from, to, rate, updatedAt }[]`.

### PWA & service worker

- `injectManifest` strategy because the default `generateSW` crashes workbox-build's terser on Termux/android-arm64.
- `src/sw.ts` uses `clientsClaim()` + `skipWaiting()` so a new SW takes over the current tab immediately on activation.
- `src/components/common/PWAUpdatePrompt.tsx` auto-applies updates (`updateSW(true)` → reload after 600ms) on `onNeedRefresh`. No manual "Reload" tap.
- Runtime caches: OSM tiles (CacheFirst 30d, 500 entries), Nominatim (NetworkFirst 7d), /api/overpass (NetworkFirst 1d).
- Vercel deploys require `workbox-*` declared as direct deps (not transitive) — see `91c0bb0`.

### Zod at the Supabase boundary

`src/services/schemas.ts` defines a Zod schema for every row shape with `.catch(default)` per field. `storage.ts` mappers parse rows via these schemas. Schema drift degrades gracefully — a missing/renamed column reads as the default instead of crashing the app.

### Map (Leaflet, not react-leaflet)

- Imperative `L.map()` instance in `MapExplorer.tsx`, refactored so heavy pieces live in `src/components/map/` (NavigationBanner, SavePlaceSheet, LocationPicker, TurnArrow).
- POI fetches via `/api/overpass` serverless proxy. LRU cache of last 50 results.
- Hotel pins: parse coords from `mapsUrl` (`?q=lat,lon`, `@lat,lon`, `!3d!4d` patterns); fall back to Nominatim address geocode if no coords (`src/components/map/geocode.ts`). Cache 30 days, in-flight dedup.
- Locate-me button uses `getCurrentPosition` to fly to user.
- Turn-by-turn nav via OSRM walking routes.

### XSS hardening

`L.marker().bindPopup()` never gets a template string — uses `buildPopup()` helper that does `document.createElement` + `textContent`. POI names come from OSM and can't be trusted.

## DB schema (Supabase)

All tables are RLS-protected per `user_id`. Major tables:

- `trips`, `flights`, `hotels`, `itinerary_days`, `itinerary_activities`, `checklist_items`, `expenses`, `documents`, `emergency_contacts`, `quick_links`, `notes`, `passport_info`, `visas`, `currency_rates`, `trip_photos`, `saved_places`
- Migrations the user has run (in `supabase/migrations/`):
  - `20260626_itinerary_activities_done.sql` — `done boolean not null default false`
  - `20260628_expense_receipt_url.sql` — `receipt_url text not null default ''`

## Conventions

- **Mobile-first.** Default screen widths target 320–420px. Use `sm:`/`md:` only for upgrade hints.
- **Touch targets ≥ 44px.** `icon-sm` button variant has a `::before` hit-area extender.
- **No iOS zoom.** Form primitives use `text-base sm:text-sm`.
- **Card padding** is `p-4` for content, `p-3` for tight lists, `p-5` for hero-ish cards. Don't mix.
- **Vertical rhythm** — Dashboard uses one `space-y-3` on the root; per-section `mb-3`/`mt-3` is a smell.
- **Section labels are inline in cards** (e.g. `<Icon /> Budget Tracker`), not standalone h2s above. Exception: Quick Access is wrapped in its own Card for parity.
- **Accent colors** standardized on the `-600` shade per family (rose-600, amber-600, emerald-600, ...).
- **Active state for tap targets** uses `active:scale-[0.99]` or `active:scale-95` for icon buttons.
- **`tabular-nums`** on every number that ticks (clock, counters, money) so widths don't shift.
- **`now` state** ticks via `setInterval(setNow, 60_000)`. Never mutate it (`setHours` on a Date is a reference mutation — bit us in `4012e49`). Clone first or use a fresh `new Date()` at the render site.

## Things to NOT do

- Don't use `react-leaflet` — Leaflet imperative API is already wired.
- Don't add `sharp` to deps — it breaks Vercel installs. The icon-gen script is gitignored under `scripts/`.
- Don't fetch trip data from inside pages — read from `useTrip()`. Single source of truth.
- Don't render `now.toLocaleTimeString()` directly — use `new Date()` at the render site so accidental Date mutation can't break it.
- Don't put data-mutating logic in the URL or props — write through `updateTrip` so it persists and syncs.
- Don't add a CHANGELOG.md entry without also bumping git history; commits ARE the changelog.

## Where things live (quick reference)

- Greeting / Now / Up Next / Today's Plan / FAB → `src/pages/Dashboard.tsx`
- Trip cards (with cover, counts, badges) → `src/components/common/TripCard.tsx`
- Profile editing → `src/components/common/ProfileSheet.tsx`
- Quick-add expense (smart currency + receipt + inline FX) → `src/components/common/QuickAddExpense.tsx`
- Activity reminders (in-app banner + Notification API) → `src/components/common/ReminderBanner.tsx`
- Done-detection rules → `src/utils/itinerary.ts`
- Flight status derivation → `src/utils/flight.ts`
- Hotel check-in/out → `src/utils/hotel.ts`
- Expiry alerts → `src/utils/expiry.ts`
- Currency conversion → `src/utils/currency.ts` + `src/utils/fxApi.ts`
- Image compression → `src/utils/image.ts`
- Receipt upload → `src/utils/receiptUpload.ts`
- Reverse geocoding → `src/components/map/geocode.ts`
