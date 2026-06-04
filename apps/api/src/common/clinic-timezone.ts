/** Zona horaria del consultorio (turnos, WhatsApp, emails). */
export const CLINIC_TIMEZONE =
  process.env.CLINIC_TIMEZONE ?? 'America/Argentina/Buenos_Aires';

const LOCALE = 'es-AR';

export function formatClinicDate(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: CLINIC_TIMEZONE,
  }).format(date);
}

export function formatClinicTime(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: CLINIC_TIMEZONE,
  }).format(date);
}

export function formatClinicDateTime(date: Date): { date: string; time: string } {
  return { date: formatClinicDate(date), time: formatClinicTime(date) };
}
