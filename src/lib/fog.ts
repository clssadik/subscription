// Sis: kayan içeriğin sabit blokların altında ve alt menünün arkasında zemin rengine karışması.
// Değer = sisin en yoğun yerindeki zemin rengi oranı (1 = tamamen opak). Kartlar'da renkli satırlar kirlenmesin diye daha az.

export type FogLevel = 'normal' | 'light'

/** Sabit bloğun altındaki sis */
export const TOP_FOG: Record<FogLevel, number> = { normal: 0.3, light: 0.15 }
/** Alt menünün arkasındaki sis */
export const BOTTOM_FOG: Record<FogLevel, number> = { normal: 0.7, light: 0.45 }

/** Zemin rengi, verilen oranda saydam */
export const fog = (level: number) => `color-mix(in srgb, var(--page) ${Math.round(level * 100)}%, transparent)`
