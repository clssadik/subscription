# Abonelik Takip

Personal PWA for tracking subscriptions and credit card payments.
Vite + React + TypeScript + Tailwind + shadcn/ui + vite-plugin-pwa.

## Commands

- `npm run dev` — dev server (http://localhost:5173)
- `npm run build` — production build (`dist/`)
- `npm run preview` — preview the build locally (service worker is active here)
- `npm run generate-pwa-assets` — regenerate app icons from `public/favicon.svg`

## Structure

- `src/screens/` — Summary, Subscriptions (+ detail), Cards, History screens
- `src/components/` — bottom nav, add sheet, logo, swipe-to-delete and other parts
- `src/lib/types.ts` — data types
- `src/lib/store.tsx` — data (on device for now, localStorage)
- `src/lib/dates.ts` — renewal, due date and monthly calculations
- `src/lib/services.ts` — preset services and logos
- `src/lib/banks.ts` — Turkish banks and card colors
- `src/assets/logos/` — logos added by hand for services missing from simple-icons

Full card numbers are never stored; only the bank name and last 4 digits.
