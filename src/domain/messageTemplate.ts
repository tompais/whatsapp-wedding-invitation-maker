/**
 * Constructor de mensajes de WhatsApp para las invitaciones de boda.
 *
 * Lógica pura: no depende de Supabase, filesystem, ni servicios externos.
 * Genera el texto personalizado del mensaje según si el invitado tiene
 * compañeros de grupo con quienes confirmar o no.
 *
 * Formato de WhatsApp soportado:
 *   *texto*  → negrita
 *   _texto_  → cursiva
 */

import type { GuestWithGroup } from "./types";

/** URL de la página web de confirmación */
const WEDDING_URL = "https://www.labodadeangieytomi.com";

/**
 * Construye el mensaje personalizado de WhatsApp para un invitado.
 *
 * El mensaje varía según si el invitado tiene compañeros de grupo:
 * - Con compañeros: lista a las personas por quienes puede confirmar
 * - Sin compañeros (o sin grupo): nota de invitación personal y exclusiva
 *
 * @param guest - Invitado con información de grupo
 * @returns Texto plano del mensaje (listo para ser encodeado en la URL)
 */
export function buildMessage(guest: GuestWithGroup): string {
  const sections = [
    buildIntro(guest.firstName),
    buildCTA(guest.code),
    buildGroupSection(guest),
    buildClosing(guest.groupMembers.length > 0),
  ];

  return sections.join("\n\n");
}

/**
 * Saludo inicial personalizado con el nombre del invitado.
 */
function buildIntro(firstName: string): string {
  return (
    `¡Hola, *${firstName}*! 💍🎉\n\n` +
    `¡Somos Angie y Tomi y nos ilusiona muuuucho contarte que ya abrimos la confirmación ` +
    `para nuestra boda! ¡Que estés ese día con nosotros significa un montón! 🥰`
  );
}

/**
 * Llamado a la acción con el link y el código personal de confirmación.
 */
function buildCTA(code: string): string {
  return (
    `Para confirmar, entrá a 👉 *${WEDDING_URL}* e ingresá tu código personal:\n` +
    `🔑 *${code}*`
  );
}

/**
 * Sección de grupo o nota de invitación individual.
 *
 * - Si tiene compañeros de grupo → lista los nombres para confirmar por ellos
 * - Si no tiene compañeros (o no tiene grupo) → nota de invitación personal
 */
function buildGroupSection(guest: GuestWithGroup): string {
  if (guest.groupMembers.length > 0) {
    const membersList = guest.groupMembers
      .map((m) => `${m.firstName} ${m.lastName}`)
      .join(", ");
    return `¡Ah, y también podés confirmar por los que se suman con vos!\n👥 _${membersList}_`;
  }

  return `_Tu invitación es personal y exclusiva — ¡fue pensada especialmente para vos! 🥰_`;
}

/**
 * Cierre del mensaje.
 * Usa plural si el invitado viene con acompañantes, singular si no.
 */
function buildClosing(hasGroupMembers: boolean): string {
  return hasGroupMembers
    ? "¡Los esperamos con todo el amor del mundo! 🥂✨"
    : "¡Te esperamos con todo el amor del mundo! 🥂✨";
}
