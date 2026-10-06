import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// İkonlar public/logo.png'den üretilir (siyah zeminde logo; scripts/app-logo.mjs üretir).
// Logonun kendi içinde boşluğu var: üretici ayrıca kenar boşluğu eklemesin, zemin de logonunki olsun (iPhone köşeleri kendisi yuvarlar).
// Maskable ikonda Android şekli kırptığı için logo biraz küçültülür.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0.15, resizeOptions: { background: '#000000' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#000000' } },
  },
  images: ['public/logo.png'],
})
