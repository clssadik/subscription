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
  light: { solid: 35, above: 0 },
}

/**
 * Sis katmanı: renk her yerde birebir zemin rengi, sadece saydamlık maskeyle değişir.
 * (color-mix ile yarı saydam renk karıştırmak iPhone Safari'de zeminden açık bir hale bırakıyordu.)
 * `stops` maskenin gradyan durakları, örn. `black 50%, transparent`.
 */
export const fogLayer = (direction: string, stops: string) => {
  const mask = `linear-gradient(${direction}, ${stops})`
  return { background: 'var(--page)', maskImage: mask, WebkitMaskImage: mask }
}

/** Verilen sis seviyesinde maske rengi (siyah = görünür) */
export const fogAlpha = (level: number) => `rgb(0 0 0 / ${level})`
