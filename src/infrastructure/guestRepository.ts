/**
 * Repositorio de invitados — Capa de acceso a datos.
 *
 * Abstrae todas las queries a Supabase relacionadas con invitados.
 * Es el único módulo de la aplicación que conoce la estructura de la base de datos.
 *
 * Responsabilidades:
 *   - Consultar guests con teléfono que no confirmaron asistencia
 *   - Enriquecer cada guest con la información de su grupo familiar
 *   - Mapear la respuesta cruda de Supabase a tipos limpios del dominio
 *
 * La query usa nested selects de Supabase para traer en un único round-trip:
 * el guest, su grupo, y los miembros del grupo.
 */

import { supabase } from "./supabaseClient";
import type { GuestWithGroup, GroupMember } from "../domain/types";

/**
 * Tipo que representa la respuesta cruda de Supabase para nuestra query.
 * Se usa solo internamente para tipar el mapeo antes de convertir al dominio.
 */
interface RawGuestRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string; // Garantizado no-null por el filtro .not("phone", "is", null)
  code: string;
  groups: {
    name: string;
    guests: Array<{
      id: string;
      first_name: string;
      last_name: string;
    }>;
  } | null;
  confirmations: Array<{ id: string }>;
}

/**
 * Obtiene todos los invitados con teléfono que aún no confirmaron asistencia.
 *
 * La query hace un único round-trip a Supabase usando nested selects para
 * traer en una sola llamada: el guest, su grupo, y los miembros del grupo.
 *
 * Lógica de filtrado aplicada:
 *   - Solo guests con `phone IS NOT NULL`
 *   - Excluye guests que tienen al menos una fila en `confirmations`
 *     (la tabla tiene unique constraint en guest_id, por eso es 0 o 1 fila)
 *
 * @returns Lista de invitados enriquecidos con info de grupo, listos para el dominio
 * @throws Error si la query a Supabase falla
 */
export async function findUnconfirmedGuestsWithPhone(): Promise<
  GuestWithGroup[]
> {
  const { data, error } = await supabase
    .from("guests")
    .select(
      `
      id,
      first_name,
      last_name,
      phone,
      code,
      groups (
        name,
        guests (
          id,
          first_name,
          last_name
        )
      ),
      confirmations (id)
    `
    )
    .not("phone", "is", null);

  if (error) {
    throw new Error(
      `❌ Error al consultar invitados en Supabase: ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Filtrar los que ya confirmaron: confirmations vacío significa que no confirmó
  const unconfirmed = (data as unknown as RawGuestRow[]).filter(
    (guest) => guest.confirmations.length === 0
  );

  return unconfirmed.map(mapToGuestWithGroup);
}

/**
 * Mapea un registro crudo de Supabase al tipo de dominio `GuestWithGroup`.
 *
 * Excluye al invitado mismo de la lista de miembros del grupo,
 * ya que el mensaje solo debe mostrar a los compañeros de grupo.
 *
 * @param raw - Fila cruda de Supabase
 * @returns Invitado tipado del dominio
 */
function mapToGuestWithGroup(raw: RawGuestRow): GuestWithGroup {
  const groupMembers: GroupMember[] = raw.groups
    ? raw.groups.guests
        .filter((member) => member.id !== raw.id) // Excluye al invitado mismo
        .map((member) => ({
          firstName: member.first_name,
          lastName: member.last_name,
        }))
    : [];

  return {
    id: raw.id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    phone: raw.phone,
    code: raw.code,
    groupName: raw.groups?.name,
    groupMembers,
  };
}
