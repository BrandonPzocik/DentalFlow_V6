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

export function toWhatsappAddress(e164: string): string {
  const clean = e164.replace(/\D/g, '');
  return `whatsapp:+${clean}`;
}

export function fromTwilioWhatsappAddress(addr: string): string {
  return addr.replace(/^whatsapp:/i, '').replace(/^\+/, '');
}
