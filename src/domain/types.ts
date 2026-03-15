/**
 * Tipos del dominio del generador de invitaciones.
 *
 * Este módulo define las estructuras de datos puras del negocio.
 * No depende de Supabase, del filesystem, ni de ningún servicio externo.
 * Es el vocabulario compartido por todas las capas de la aplicación.
 */

/**
 * Miembro de un grupo familiar.
 * Solo necesitamos el nombre completo para el mensaje de WhatsApp.
 */
export interface GroupMember {
  readonly firstName: string;
  readonly lastName: string;
}

/**
 * Invitado enriquecido con información de su grupo familiar.
 * Es la entidad central que fluye por toda la aplicación.
 *
 * Notas importantes:
 * - `phone` siempre está presente: el repositorio filtra guests sin teléfono
 * - `groupName` undefined → el invitado no pertenece a ningún grupo ("Los-Sin-Grupo")
 * - `groupMembers` excluye al invitado mismo (solo sus compañeros de grupo)
 */
export interface GuestWithGroup {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly code: string;
  readonly groupName?: string;
  readonly groupMembers: readonly GroupMember[];
}

/**
 * Link de WhatsApp generado para un invitado específico.
 */
export interface WhatsAppLink {
  readonly guestFullName: string;
  readonly url: string;
}

/**
 * Output del caso de uso, listo para renderizar en Markdown.
 *
 * - `groups`: Map de nombre de grupo → invitados (ordenados por apellido)
 * - `solo`: Invitados sin grupo, ordenados por apellido ("Los-Sin-Grupo")
 * - `links`: Map de guest.id → WhatsAppLink generado
 */
export interface InvitationOutput {
  readonly groups: ReadonlyMap<string, readonly GuestWithGroup[]>;
  readonly solo: readonly GuestWithGroup[];
  readonly links: ReadonlyMap<string, WhatsAppLink>;
}
