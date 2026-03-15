/**
 * Generador de links de WhatsApp Me.
 *
 * WhatsApp Me permite generar links que al hacer clic abren WhatsApp
 * con un número y un mensaje pre-cargado. Formato de la URL:
 *   https://wa.me/<número_internacional>?text=<mensaje_encodeado>
 *
 * Referencia: https://faq.whatsapp.com/5904980669557816
 */

/** Código de país de Argentina (+54) */
const ARGENTINA_COUNTRY_CODE = "54";

/** Mínimo de dígitos esperados en un número argentino (sin código de país) */
const MIN_PHONE_DIGITS = 10;

/**
 * Genera un link de WhatsApp Me para un número de teléfono argentino.
 *
 * @param rawPhone - Número en cualquier formato (con o sin código de país)
 * @param message - Texto del mensaje (se encodeará automáticamente con encodeURIComponent)
 * @returns URL completa de WhatsApp Me
 * @throws Error si el número no tiene un formato reconocible
 */
export function generateWhatsAppLink(
  rawPhone: string,
  message: string
): string {
  const normalizedPhone = normalizeArgentinePhone(rawPhone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}

/**
 * Normaliza un número de teléfono argentino al formato requerido por WhatsApp Me.
 *
 * WhatsApp requiere el número internacional sin `+`, sin espacios, sin guiones.
 * Para Argentina (código 54), las transformaciones son:
 *   "1164690945"        → "541164690945"  (agrega código de país)
 *   "01164690945"       → "541164690945"  (elimina 0 de línea + agrega código de país)
 *   "541164690945"      → "541164690945"  (ya está normalizado, exactamente 12 dígitos)
 *   "+54 011 6469-0945" → "541164690945"  (sobrelongo: se re-normaliza eliminando el prefijo 54)
 *
 * @param rawPhone - Número en formato crudo (puede tener espacios, guiones, paréntesis, +)
 * @returns Número normalizado con código de país (ej: "541164690945")
 * @throws Error si el número tiene menos de 10 dígitos tras la normalización
 */
export function normalizeArgentinePhone(rawPhone: string): string {
  // Eliminar todo lo que no sea dígito
  const digits = rawPhone.replace(/\D/g, "");

  // Si ya tiene código de país argentino y longitud exacta de 12 dígitos,
  // asumimos que ya está normalizado (54 + 10 dígitos locales).
  // Cualquier otro caso con prefijo 54 se procesa por el flujo común,
  // para evitar aceptar números sobrelongos o mal formateados.
  if (digits.startsWith(ARGENTINA_COUNTRY_CODE) && digits.length === 12) {
    return digits;
  }

  // Si el número empieza con el código de país pero no tiene exactamente 12 dígitos
  // (p.ej. "+54 011 6469-0945" → "540116469094", 13 dígitos), se elimina el prefijo 54 y se
  // continúa con la normalización estándar para corregirlo.
  const digitsToProcess =
    digits.startsWith(ARGENTINA_COUNTRY_CODE) && digits.length !== 12
      ? digits.slice(ARGENTINA_COUNTRY_CODE.length)
      : digits;

  // Eliminar el 0 inicial (prefijo de discado de línea en Argentina)
  const withoutLeadingZero = digitsToProcess.startsWith("0")
    ? digitsToProcess.slice(1)
    : digitsToProcess;

  // Validar longitud mínima (número argentino sin código = 10 dígitos)
  if (withoutLeadingZero.length < MIN_PHONE_DIGITS) {
    throw new Error(
      `Número de teléfono inválido: "${rawPhone}" ` +
        `(${withoutLeadingZero.length} dígitos, se esperan al menos ${MIN_PHONE_DIGITS})`
    );
  }

  return `${ARGENTINA_COUNTRY_CODE}${withoutLeadingZero}`;
}
