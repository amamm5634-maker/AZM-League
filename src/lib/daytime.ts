/** توقيت الدوري: السودان UTC+2 ثابتاً (لا توقيت صيفي). نحسبه من UTC حتى لا يتأثر بساعة أو منطقة جهاز الزائر. */
export const LEAGUE_UTC_OFFSET_HOURS = 2;

/** الساعة الآن (0–23) بتوقيت الدوري */
export function leagueHour(now: number = Date.now()): number {
  return (new Date(now).getUTCHours() + LEAGUE_UTC_OFFSET_HOURS) % 24;
}

/** ليل من 6 مساءً حتى قبل 6 صباحاً بتوقيت الدوري */
export function isNight(now: number = Date.now()): boolean {
  const h = leagueHour(now);
  return h >= 18 || h < 6;
}
