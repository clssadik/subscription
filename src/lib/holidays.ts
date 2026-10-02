import { addDays, format, isWeekend } from 'date-fns'

// Türkiye resmî tatilleri (2026–2027). Bankalar bu günlerde ve hafta sonu çalışmaz.
// Arife günleri yarım gün olduğu için iş günü sayılır.
// Kaynak: Diyanet takvimi; 2028 ve sonrası eklenmezse sadece hafta sonları atlanır.
const HOLIDAYS = new Set([
  // 2026
  '2026-01-01',
  '2026-03-20', '2026-03-21', '2026-03-22', // Ramazan Bayramı
  '2026-04-23',
  '2026-05-01',
  '2026-05-19',
  '2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30', // Kurban Bayramı
  '2026-07-15',
  '2026-08-30',
  '2026-10-29',
  // 2027
  '2027-01-01',
  '2027-03-09', '2027-03-10', '2027-03-11', // Ramazan Bayramı
  '2027-04-23',
  '2027-05-01',
  '2027-05-16', '2027-05-17', '2027-05-18', '2027-05-19', // Kurban Bayramı (19 Mayıs ile çakışır)
  '2027-07-15',
  '2027-08-30',
  '2027-10-29',
])

export function isBusinessDay(date: Date) {
  return !isWeekend(date) && !HOLIDAYS.has(format(date, 'yyyy-MM-dd'))
}

/** Gün iş günüyse kendisi; değilse sonraki ilk iş günü */
export function nextBusinessDay(date: Date) {
  let d = date
  while (!isBusinessDay(d)) d = addDays(d, 1)
  return d
}
