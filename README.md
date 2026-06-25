# Travelfy ✈️

Your personal travel command center — organize everything for your trip in one beautiful app.

## Features

- **Dashboard** — Trip countdown, next flight preview, budget tracker, quick access
- **Flights** — Add/edit/delete flights with full details
- **Hotels** — Manage accommodations with maps and call buttons
- **Timeline** — Dynamic day-by-day itinerary with activities
- **Checklist** — Packing list with categories and progress tracking
- **Expenses** — Track spending with charts and budget monitoring
- **Documents** — Upload and preview travel documents
- **Passport & Visa** — Store passport info with expiry warnings
- **Currency** — Offline currency converter with saved rates
- **Emergency** — Quick-access contacts for embassy, police, hospital
- **Notes** — Color-coded notes with autosave
- **Quick Links** — Bookmarked travel websites
- **Settings** — Export/import all data as JSON

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion (animations)
- TanStack Query
- React Router v6
- Recharts (expense charts)
- Radix UI / shadcn-style components
- LocalStorage (no backend required)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build for Production

```bash
npm run build
```

## Deploy to Vercel

Push to GitHub and connect the repo to Vercel. The `vercel.json` config handles SPA routing.

## Data

All data is stored in `localStorage`. Use **Settings → Export** to back up your trip data as JSON, and **Import** to restore it.

## Seed Data

The app ships with a sample Hong Kong–Macau Family Trip (June 26–29, 2026) as initial data. All data is fully editable.

## Architecture

```
src/
├── App.tsx              # Root with providers and routes
├── main.tsx
├── index.css
├── data/
│   └── sampleTrip.ts   # Seed data (HK-Macau trip)
├── types/
│   └── index.ts        # All TypeScript interfaces
├── services/
│   └── storage.ts      # LocalStorage abstraction
├── contexts/
│   ├── TripContext.tsx  # Global trip state
│   └── ThemeContext.tsx # Dark/light mode
├── layouts/
│   ├── MainLayout.tsx
│   └── BottomNav.tsx
├── components/
│   ├── ui/             # Reusable UI primitives
│   └── common/         # Shared page components
├── pages/              # One file per feature
└── utils/
    ├── cn.ts           # Tailwind class merging
    └── dateUtils.ts    # Date helpers
```

## Future Roadmap

- Authentication + cloud sync
- Multi-trip support
- PWA / offline mode
- Push notifications
- AI travel assistant
- Flight tracking API
- Google Calendar sync
- Maps integration
