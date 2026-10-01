# Abonelik Takip

Personal PWA for tracking subscriptions and credit card payments.
Vite + React + TypeScript + Tailwind + shadcn/ui + vite-plugin-pwa.

## Setup

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` in the SQL Editor.
2. In Authentication > Emails, put `{{ .Token }}` in the "Confirm signup" and "Magic Link" templates so users get a 6-digit code.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.
4. `npm install`

## Commands

- `npm run dev` — dev server (http://localhost:5173)
- `npm run build` — production build (`dist/`)
- `npm run preview` — preview the build locally (service worker is active here)
- `npm run generate-pwa-assets` — regenerate app icons from `public/favicon.svg`

## Structure

- `src/screens/` — Login, Summary, Subscriptions (+ detail), Account, Cards, History screens
- `src/components/` — bottom nav, add sheet, logo, swipe-to-delete and other parts
- `src/lib/types.ts` — data types
- `src/lib/store.tsx` — app state; changes are synced to Supabase, last state cached on device
- `src/lib/db.ts` — Supabase reads and writes
- `src/lib/auth.tsx` — sign-in gate (email + 6-digit code)
- `supabase/migrations/` — database schema with row level security
- `src/lib/dates.ts` — renewal, due date and monthly calculations
- `src/lib/services.ts` — preset services and logos
- `src/lib/banks.ts` — Turkish banks and card colors
- `src/assets/logos/` — logos added by hand for services missing from simple-icons

Full card numbers are never stored; only the bank name and last 4 digits.
