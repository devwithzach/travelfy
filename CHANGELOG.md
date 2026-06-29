# Changelog

All notable changes to Travelfy.

## 2026-06-26 → 2026-06-29 — Hong Kong trip session

Heavy iteration session driven by Zach's real-time use during the HK–Macau trip. Roughly 60 commits, grouped here by user-visible theme.

### Routing / app shell

- **Lobby mode** (`61703f3`): logging in clears any active trip and lands on a neutral home with greeting + trip picker. Trip-specific features unlock only after explicitly selecting a trip from `/trips`. BottomNav hides Timeline / Explore / More until a trip is selected.
- **Home is Dashboard** (`7b2ce50`): swapped routing so `/` is the active-trip Dashboard; trip list moved to `/trips`.
- **Trip context everywhere** (`29af548`): every sub-page header shows a tappable "📚 Trip name" breadcrumb that jumps back to `/trips`. Reads dynamically from `TripContext`.
- **Exit-trip action** (`d9b8dfc`): `TripContext.exitTrip()` drops you to the lobby without deleting the trip. Surfaced in the ProfileSheet.

### Dashboard / home

- **Personalized greeting** (`a5134f3`, `14f8f0b`, `dd33cfc`, `12dbc58`, `d9b8dfc`, `f6f250c`): time-of-day greeting, name (Supabase `user_metadata.full_name` → `trip.settings.travelerName` → email parse), avatar with pencil badge, country flag, local time + date, current location via Nominatim reverse-geocode. "Set your name" prompt when greeting falls back to email parsing. Geolocation runs silently in the background — no loading text.
- **Now / Up Next activity card** (`232be7a`): pulsing primary "Happening Now" with Mark Done button, or emerald "Up Next" if no activity is in progress.
- **Hotel countdown card** (`09befc5`): "Currently staying / Check-out tomorrow" or "Next hotel / Check-in tonight". Mirrors the Next Flight card. Defaults to 3 PM check-in / 11 AM check-out when only dates are stored.
- **Today's Plan card** (`d80e580`, `10c76e8`, `12e5216`): live activity status with NOW pill on the in-progress row. Tap any row to flip done. Manual refresh button + auto-refresh on tab focus.
- **Quick-add expense FAB** (`7d11af6`, `8e88115`): floating Plus button opens a bottom sheet with amount + smart-default currency (HKD for HK trip via `guessLocalCurrency`), category pills, optional note. Inline "≈ PHP X" hint while typing in foreign currency (`d7ab89d`).
- **Stats tiles**: Today's spend (home ccy) / Packed / Budget %, all `text-2xl tabular-nums` for consistency.
- **Expiry alerts** (`3570d54`): banners surface passport expiring < 6 months / < 1 month, visa expiring before trip end. Tap → /passport.
- **Profile sheet** (`d9b8dfc`): avatar tap opens bottom sheet with display name, email (read-only), theme toggle, exit-trip, sign-out.

### Trips list

- **Enriched trip cards** (`0b242b7`): gradient hero (or cover photo) with status badge + countdown ("In 3 days" / "67% through trip"), 4-stat strip (Flights / Hotels / Days / Photos) computed via single Supabase nested-count query.
- **Trip cover photo** (`3570d54`): set any uploaded photo as the trip's hero background; renders on Dashboard hero + TripCard.
- **Trip duplicate** (`d7ab89d`): 📋 button clones a trip's reusable structure (itinerary skeleton, checklist, hotel list, contacts, links, currency rates) into a fresh trip. Drops expenses/photos/flights.
- **Seed sample trip** (`3570d54`): one-tap inserts the bundled HK–Macau sample data via the existing `storageService.saveTrip`, with fresh UUIDs to avoid collisions.

### Timeline

- **Auto-done detection** (`1bb22a0`, `c621021`, `c4deb72`, `b6ac996`, `8c240d3`): activities auto-mark done by date-string comparison + smarter "next activity started → previous is over" fallback. Manual tap-to-toggle persisted to Supabase (`itinerary_activities.done` column added — migration in `supabase/migrations/`).
- **Status badges** (`65a30e8`): each day card gets Done / Ongoing (pulsing) / Upcoming. Header subtitle: "X done · Y ongoing · Z upcoming".
- **Day-level "Mark all done"** + **Jump to today** floating button (`8c240d3`).
- **Activity quick-templates** (`8e88115`): pill row in Add Activity dialog (Flight ✈️, Check-in 🏨, Meal 🥢, Sightseeing 📸, etc.) — tap to prefill type + title.

### Flights

- **Date-derived status** (`2a394a0`, `734ca0e`): MNL→HK no longer shows "upcoming" after landing. Pure date-string compare as primary path; same-day timestamp distinguishes boarding / departed / arrived.
- **Self-healing** (`8575d91`): on trip load, any flight where stored status ≠ derived is written back via debounced `updateTrip`. No cron needed.

### Expenses / currency

- **Multi-currency conversion fix** (`232be7a`): Dashboard previously ignored anything not in homeCurrency; Expenses page's totalSpent was a no-op (`?: e.amount : e.amount`). Now uses `sumExpenses` util with direct + inverse + two-hop pivot rate resolution. Per-row "≈ home X" hint.
- **Live FX rates** (`8e88115`): "Update from web" button on Currency page pulls from `open.er-api.com` (free, 161 currencies). Silent auto-fetch on first open. 6h localStorage cache.
- **Inline FX in Quick-Add** (`d7ab89d`): live "≈ PHP 2,450" hint while typing an HKD/MOP/JPY amount.
- **Receipt photos** (`4012e49`): camera-capture + compress + upload to `trip-photos/receipts/`. Thumbnail on each expense row → tap for lightbox. Migration adds `expenses.receipt_url` column.

### Photos / Map

- **Hotel pins** (`aa7b418`): hotels with text-query `mapsUrl` get reverse-geocoded via Nominatim (cached 30 days) so pins always appear.
- **Locate-me button** (`ad00b35`): FAB above category bar uses `getCurrentPosition` to fly map to current location.
- **Photo compression** (`7d11af6`): client-side `compressImage` resizes to 2048px / 85% JPEG (~5MB → ~500KB). EXIF orientation preserved.
- **GPS auto-tag + reverse geocode** on photo upload already existed; refined with structured `ReverseGeocodeResult` (region + country + ISO code).
- **MapExplorer refactor** (`aa7b418`): extracted NavigationBanner, SavePlaceSheet, LocationPicker, TurnArrow. 1036 → 661 lines.

### Stats / wrap-up

- **`/stats` page** (`70b8088`): hero with day count + total spend + activities done. 2×2 mini-stat grid. Itinerary completion bar. Budget bar. Spending donut by category. Daily spend bar chart with top-spend day. Empty state. Routed in More drawer.

### PWA / infra

- **Service worker auto-updates** (`53e9f63`): `clientsClaim()` + `registerSW({ onNeedRefresh: () => updateSW(true) → reload })` so deploys apply on next page open without manual "Reload" tap.
- **PWA support** (`fd1414c`): `vite-plugin-pwa` injectManifest strategy. OSM tile cache (CacheFirst, 30 days). Nominatim NetworkFirst. Install prompt component. SVG → PNG icon generation.
- **Vercel deploy fixes**: removed `sharp` from devDeps (`b766a4c`); promoted `workbox-*` from transitive to explicit deps so Vercel's stricter install resolves them (`91c0bb0`).
- **Auto-refresh on tab focus** (`12e5216`): `document.visibilitychange` re-fetches trip from Supabase.

### Reliability fixes

- **"12 AM in HK" bug** (`4012e49`, `9dd9d56`): `expiry.ts` was mutating the shared `now` Date in place via `setHours(0,0,0,0)`. Fixed by cloning + defensive `new Date()` at the time-render site.
- **Activity reminders** (`7d11af6`): in-app banner 15 min before + at start time. Browser Notification API if permission granted. Fired-id dedup persisted 36h.
- **XSS in map popups** (`9ef23d6`): replaced template-string `bindPopup` with DOM-built `textContent` helper.
- **File upload validation** (`9ef23d6`): size + MIME checks on Documents and Photos. Replaces silent OOM with friendly error.
- **Geolocation error handler** (`9ef23d6`): `watchPosition` now surfaces denied / unavailable / timeout.
- **Error surfacing** (`9ef23d6`): replaced `.catch(() => {})` in TripContext with real error state + dismissible banner in MainLayout.

### Schema / data

- **Zod runtime validation** (`14f84ac`): every Supabase row shape gets a Zod schema with `.catch()` per field so schema drift degrades gracefully. `storage.ts` mappers parse via schemas instead of `as` casts.
- **Storage dedup**: extracted `assembleTrip(userId, tripRow)` so `getTripById` and `getTrip` share a single fetch path (was ~150 duplicated lines).
- **Supabase migrations**:
  - `20260626_itinerary_activities_done.sql` — adds `done boolean default false` for cross-device sync of completed activities.
  - `20260628_expense_receipt_url.sql` — adds `receipt_url text default ''` for receipt photo URLs.

### Mobile responsiveness

- **iOS input zoom fix** (`5fd9398`): bumped Input / Textarea / SelectTrigger / SelectItem base font-size to `text-base` (16px) on mobile, drops to `text-sm` on `sm+`. Stops Safari auto-zoom on every form focus.
- **Dialog z-index** (`5fd9398`): bumped from z-50 to z-1900 (above BottomNav at 1500) + `w-[calc(100%-1.5rem)]` for 12px gutters on 320px iPhone SE.
- **Touch targets** (`5fd9398`): `icon-sm` gained a `::before` hit-area extender for 44×44 effective tap area without visual change.
- **PageHeader safe-area top** for notched devices; **Notes editor** switched from `h-screen` to `min-h-[calc(100vh-6rem)] pb-24` so content scrolls past the bottom nav.
