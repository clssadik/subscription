// Sis: kayan içeriğin sabit blokların altında ve alt menünün arkasında zemin rengine karışması.
// Değer = sisin en yoğun yerindeki zemin rengi oranı (1 = tamamen opak). Kartlar'da renkli satırlar kirlenmesin diye daha az.

export type FogLevel = 'normal' | 'light'

/** Sabit bloğun altındaki sis */
export const TOP_FOG: Record<FogLevel, number> = { normal: 0.3, light: 0.15 }
/**
 * Alt menünün arkasındaki sis. Alttan `solid`% yüksekliğe kadar zemin tamamen opak: liste menünün içine girip kaybolur.
 * Oradan yukarı şeffafa iner; solma menünün `above` px üstüne kadar uzanır. (Eskisi: %45 opak, 40px yukarı.)
 */
export const BOTTOM_FOG: Record<FogLevel, { solid: number; above: number }> = {
  normal: { solid: 45, above: 16 },
  light: { solid: 40, above: 10 },
}

/** Zemin rengi, verilen oranda saydam */
export const fog = (level: number) => `color-mix(in srgb, var(--page) ${Math.round(level * 100)}%, transparent)`
