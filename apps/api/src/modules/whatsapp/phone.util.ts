/**
 * Normaliza teléfonos argentinos a formato E.164 para Twilio WhatsApp (sin +).
 * Ejemplo salida: 5493704123456
 */
export function normalizePhoneToE164(raw: string): string | null {
  if (!raw?.trim()) return null;
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('54') && digits.length >= 12) {
    return digits;
  }
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10 && !digits.startsWith('9')) {
    digits = `9${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('9')) {
    return `54${digits}`;
  }
  if (digits.length >= 12) {
    return digits.startsWith('54') ? digits : `54${digits}`;
  }
  return null;
}

/** Variantes equivalentes para comparar (Twilio vs lo guardado en ficha). */
export function phoneMatchKeys(raw: string): Set<string> {
  const digits = raw.replace(/\D/g, '');
  const normalized = normalizePhoneToE164(raw) ?? digits;
  const keys = new Set<string>();

  for (const d of [normalized, digits]) {
    if (!d) continue;
    keys.add(d);
    if (d.length >= 8) keys.add(d.slice(-8));
    if (d.length >= 10) keys.add(d.slice(-10));
    if (d.startsWith('54') && d.length > 2) keys.add(d.slice(2));
    // móvil AR: 54 + 9 + área + número ↔ sin el 9
    if (d.startsWith('549') && d.length === 13) {
      keys.add(`54${d.slice(3)}`);
    }
    if (d.startsWith('54') && d.length === 12 && d[2] !== '9') {
      keys.add(`${d.slice(0, 2)}9${d.slice(2)}`);
    }
  }

  return keys;
}

export function phonesMatch(a: string, b: string): boolean {
  const keysA = phoneMatchKeys(a);
  for (const key of phoneMatchKeys(b)) {
    if (keysA.has(key)) return true;
  }
  return false;
}

export function toWhatsappAddress(e164: string): string {
  const clean = e164.replace(/\D/g, '');
  return `whatsapp:+${clean}`;
}

export function fromTwilioWhatsappAddress(addr: string): string {
  return addr.replace(/^whatsapp:/i, '').replace(/^\+/, '');
}
