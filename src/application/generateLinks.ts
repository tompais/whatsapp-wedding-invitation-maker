/**
 * Caso de uso: Generación de links de invitación WhatsApp.
 *
 * Orquesta el flujo completo sin conocer detalles de Supabase ni del filesystem:
 *   1. Obtiene los invitados no confirmados con teléfono (repositorio)
 *   2. Genera el mensaje personalizado para cada uno (dominio)
 *   3. Genera el link de WhatsApp Me (dominio)
 *   4. Agrupa y ordena el output para renderizar en Markdown
 *
 * Si un teléfono tiene formato inválido, se omite ese invitado
 * con una advertencia — no interrumpe el resto del proceso.
 */

import { findUnconfirmedGuestsWithPhone } from "../infrastructure/guestRepository";
import { buildMessage } from "../domain/messageTemplate";
import { generateWhatsAppLink } from "../domain/whatsappLink";
import type {
  GuestWithGroup,
  InvitationOutput,
  WhatsAppLink,
} from "../domain/types";

/**
 * Ejecuta el caso de uso completo y retorna la estructura lista para renderizar.
 *
 * @returns Output con grupos familiares, sección solo, y mapa de links
 */
export async function generateInvitationLinks(): Promise<InvitationOutput> {
  const guests = await findUnconfirmedGuestsWithPhone();

  if (guests.length === 0) {
    console.log("ℹ️  No hay invitados sin confirmar con teléfono registrado.");
    return { groups: new Map(), solo: [], links: new Map() };
  }

  // Generar links para todos. Si un teléfono es inválido, loguear y omitir.
  const links = new Map<string, WhatsAppLink>();

  for (const guest of guests) {
    try {
      const message = buildMessage(guest);
      const url = generateWhatsAppLink(guest.phone, message);
      links.set(guest.id, {
        guestFullName: `${guest.firstName} ${guest.lastName}`,
        url,
      });
    } catch (error) {
      console.warn(
        `⚠️  Omitiendo a ${guest.firstName} ${guest.lastName}: ${(error as Error).message}`
      );
    }
  }

  // Separar: con grupo vs. sin grupo (solo incluir los que tienen link generado)
  const withGroup = guests.filter(
    (g) => g.groupName !== undefined && links.has(g.id)
  );
  const solo = guests
    .filter((g) => g.groupName === undefined && links.has(g.id))
    .sort(byLastName);

  const groups = buildGroupMap(withGroup);

  return { groups, solo, links };
}

/**
 * Agrupa invitados por nombre de grupo familiar.
 *
 * El Map resultante está ordenado alfabéticamente por nombre de grupo.
 * Dentro de cada grupo, los invitados se ordenan por apellido.
 *
 * @param guests - Invitados que tienen grupo asignado
 * @returns Map ordenado: nombre de grupo → lista de invitados del grupo
 */
function buildGroupMap(
  guests: GuestWithGroup[]
): ReadonlyMap<string, readonly GuestWithGroup[]> {
  const map = new Map<string, GuestWithGroup[]>();

  for (const guest of guests) {
    // groupName está garantizado por el filtro previo
    const key = guest.groupName as string;
    const existing = map.get(key) ?? [];
    map.set(key, [...existing, guest]);
  }

  // Ordenar internamente cada grupo por apellido
  for (const [key, members] of map) {
    map.set(key, [...members].sort(byLastName));
  }

  // Ordenar el Map por nombre de grupo (alfabético)
  return new Map(
    [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "es-AR"))
  );
}

/**
 * Comparador para ordenar invitados por apellido (case-insensitive, español AR).
 */
function byLastName(a: GuestWithGroup, b: GuestWithGroup): number {
  return a.lastName.localeCompare(b.lastName, "es-AR");
}
