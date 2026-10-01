# Abonelik Takip

Personal PWA for tracking subscriptions and credit card payments.
Vite + React + TypeScript + Tailwind + shadcn/ui + vite-plugin-pwa.

## Commands

- `npm run dev` — dev server (http://localhost:5173)
- `npm run build` — production build (`dist/`)
- `npm run preview` — preview the build locally (service worker is active here)
- `npm run generate-pwa-assets` — regenerate app icons from `public/favicon.svg`

## Structure

- `src/screens/` — Summary, Subscriptions, Cards screens
- `src/components/` — forms and small parts (`ui/` holds shadcn components)
- `src/lib/types.ts` — data types
- `src/lib/store.tsx` — data (on device for now, localStorage)
- `src/lib/dates.ts` — renewal and due date calculations

Full card numbers are never stored; only the bank name and last 4 digits.
