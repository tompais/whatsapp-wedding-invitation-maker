# WhatsApp Invitation Link Generator — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a TypeScript CLI script that generates a Markdown file with WhatsApp Me links for all unconfirmed wedding guests with phone numbers, personalized with a warm message and grouped by family.

**Architecture:** Layered architecture (infrastructure → domain ← application ← index.ts). The domain layer contains pure logic with no external dependencies. Infrastructure handles Supabase access. Application orchestrates the full flow. index.ts handles env loading, file writing, and user feedback.

**Tech Stack:** TypeScript 5, ts-node, @supabase/supabase-js v2, dotenv, Node.js CommonJS. No testing (YAGNI — single-use event script).

---

## Prerequisite: Create feature branch

```bash
git checkout chore/project-setup-and-design
git checkout -b feature/whatsapp-link-generator
```

---

## Task 1: Project configuration

**Files:**

- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Modify: `.gitignore`

**Step 1: Replace package.json**

```json
{
  "name": "whatsapp-wedding-invitation-maker",
  "version": "1.0.0",
  "description": "Generador de links de invitación WhatsApp para la boda de Angie y Tomi",
  "main": "index.ts",
  "scripts": {
    "generate": "ts-node index.ts",
    "start": "ts-node index.ts"
  },
  "author": "Tomi & Angie",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "@supabase/supabase-js": "^2.49.1",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "@types/node": "^22.13.10",
    "ts-node": "^10.9.2",
    "typescript": "^5.8.2"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "index.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create .env.example**

```env
# Credenciales del proyecto Supabase
# Encontralas en: Supabase Dashboard → Project Settings → API
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**Step 4: Update .gitignore** — agregar al final:

```gitignore
# Variables de entorno (contienen credenciales)
.env

# Archivos generados (contienen datos personales de invitados)
output/

# Compilación TypeScript
dist/
```

**Step 5: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, `package-lock.json` updated.

**Step 6: Commit**

```bash
git add package.json tsconfig.json .env.example .gitignore package-lock.json
git commit -m "chore: configure TypeScript project with dependencies"
```

---

## Task 2: Domain types

**Files:**

- Create: `src/domain/types.ts`

**Step 1: Create src/domain/types.ts**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat: add domain types (GuestWithGroup, WhatsAppLink, InvitationOutput)"
```

---

## Task 3: Message template

**Files:**

- Create: `src/domain/messageTemplate.ts`

**Step 1: Create src/domain/messageTemplate.ts**

```typescript
/**
 * Constructor de mensajes de WhatsApp para las invitaciones de boda.
 *
 * Lógica pura: no depende de Supabase, filesystem, ni servicios externos.
 * Genera el texto personalizado del mensaje según si el invitado tiene grupo o no.
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
 * El mensaje varía según si el invitado pertenece a un grupo familiar:
 * - Con compañeros de grupo: lista a las personas por quienes puede confirmar
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
```

**Step 2: Commit**

```bash
git add src/domain/messageTemplate.ts
git commit -m "feat: add WhatsApp message template with group/solo variants"
```

---

## Task 4: WhatsApp link generator

**Files:**

- Create: `src/domain/whatsappLink.ts`

**Step 1: Create src/domain/whatsappLink.ts**

```typescript
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
 *   "1164690945"   → "541164690945"  (agrega código de país)
 *   "01164690945"  → "541164690945"  (elimina 0 de línea + agrega código de país)
 *   "541164690945" → "541164690945"  (ya está normalizado)
 *
 * @param rawPhone - Número en formato crudo (puede tener espacios, guiones, paréntesis, +)
 * @returns Número normalizado con código de país (ej: "541164690945")
 * @throws Error si el número tiene menos de 10 dígitos tras la normalización
 */
export function normalizeArgentinePhone(rawPhone: string): string {
  // Eliminar todo lo que no sea dígito
  const digits = rawPhone.replace(/\D/g, "");

  // Si ya tiene código de país argentino y longitud razonable, retornar tal cual
  if (digits.startsWith(ARGENTINA_COUNTRY_CODE) && digits.length >= 12) {
    return digits;
  }

  // Eliminar el 0 inicial (prefijo de discado de línea en Argentina)
  const withoutLeadingZero = digits.startsWith("0") ? digits.slice(1) : digits;

  // Validar longitud mínima (número argentino sin código = 10 dígitos)
  if (withoutLeadingZero.length < MIN_PHONE_DIGITS) {
    throw new Error(
      `Número de teléfono inválido: "${rawPhone}" ` +
        `(${withoutLeadingZero.length} dígitos, se esperan al menos ${MIN_PHONE_DIGITS})`
    );
  }

  return `${ARGENTINA_COUNTRY_CODE}${withoutLeadingZero}`;
}
```

**Step 2: Commit**

```bash
git add src/domain/whatsappLink.ts
git commit -m "feat: add WhatsApp Me link generator with Argentine phone normalization"
```

---

## Task 5: Supabase infrastructure

**Files:**

- Create: `src/infrastructure/supabaseClient.ts`
- Create: `src/infrastructure/guestRepository.ts`

**Step 1: Create src/infrastructure/supabaseClient.ts**

```typescript
/**
 * Cliente Supabase — Singleton de infraestructura.
 *
 * Centraliza la creación del cliente y valida las variables de entorno
 * necesarias antes de inicializarlo. Es el único lugar de la aplicación
 * donde se instancia el cliente Supabase.
 *
 * IMPORTANTE: Este módulo lee las variables de entorno al momento de ser
 * importado. Asegurarse de que dotenv esté cargado antes de importarlo
 * (ver index.ts donde se usa `import 'dotenv/config'` como primer import).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Valida las variables de entorno y crea el cliente Supabase.
 *
 * @throws Error con mensaje descriptivo si falta alguna variable de entorno
 * @returns Cliente Supabase inicializado
 */
function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"];

  if (!supabaseUrl) {
    throw new Error(
      "❌ Variable de entorno faltante: SUPABASE_URL\n" +
        "   Copiá .env.example a .env y completá los valores."
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "❌ Variable de entorno faltante: SUPABASE_ANON_KEY\n" +
        "   Copiá .env.example a .env y completá los valores."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // No se necesita sesión de auth — el acceso es de lectura por anon key
      persistSession: false,
    },
  });
}

/** Instancia singleton del cliente Supabase */
export const supabase = createSupabaseClient();
```

**Step 2: Create src/infrastructure/guestRepository.ts**

```typescript
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
```

**Step 3: Commit**

```bash
git add src/infrastructure/supabaseClient.ts src/infrastructure/guestRepository.ts
git commit -m "feat: add Supabase client singleton and guest repository"
```

---

## Task 6: Application use case

**Files:**

- Create: `src/application/generateLinks.ts`

**Step 1: Create src/application/generateLinks.ts**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/application/generateLinks.ts
git commit -m "feat: add generateInvitationLinks use case with group sorting"
```

---

## Task 7: Entry point

**Files:**

- Create: `index.ts`

**Step 1: Create index.ts**

> **Nota crítica sobre dotenv:** `import 'dotenv/config'` DEBE ser el primer import.
> En CommonJS, TypeScript compila los imports en orden, entonces este import
> carga el `.env` antes de que el cliente Supabase sea inicializado.

```typescript
/**
 * Entry point del generador de invitaciones WhatsApp.
 *
 * IMPORTANTE: 'dotenv/config' debe ser el primer import para garantizar
 * que las variables de entorno estén disponibles cuando el cliente Supabase
 * se inicializa (supabaseClient.ts las lee al ser importado).
 *
 * Responsabilidades de este módulo:
 *   1. Cargar variables de entorno desde .env
 *   2. Ejecutar el caso de uso de generación de links
 *   3. Renderizar el resultado como Markdown
 *   4. Guardar el archivo en output/invitations-YYYY-MM-DD.md
 *
 * Uso:
 *   npm run generate
 */

// Carga .env ANTES de cualquier otro import que use variables de entorno
import "dotenv/config";

import * as fs from "fs";
import * as path from "path";
import { generateInvitationLinks } from "./src/application/generateLinks";
import type { GuestWithGroup, WhatsAppLink } from "./src/domain/types";

/** Directorio de salida para los archivos generados */
const OUTPUT_DIR = "output";

/**
 * Función principal. Coordina la generación y escritura del archivo Markdown.
 */
async function main(): Promise<void> {
  console.log("💍 Generador de invitaciones WhatsApp — Boda Angie & Tomi\n");

  const { groups, solo, links } = await generateInvitationLinks();

  if (links.size === 0) {
    console.log(
      "✅ No hay nada que generar. ¡Todos confirmaron o nadie tiene teléfono!"
    );
    return;
  }

  const markdown = renderMarkdown({ groups, solo, links });
  const outputPath = saveToFile(markdown);

  console.log(`\n✅ ¡Listo! Archivo generado: ${outputPath}`);
  console.log(`   📨 ${links.size} link(s) de invitación listos para enviar.`);
}

/**
 * Renderiza el Markdown completo con todos los links de invitación.
 *
 * Estructura del output:
 *   - Encabezado con fecha y total de invitados
 *   - Sección de grupos familiares (ordenados alfabéticamente)
 *   - Sección "Los-Sin-Grupo" al final
 *
 * @param output - Datos estructurados del caso de uso
 * @returns String con el Markdown completo
 */
function renderMarkdown({
  groups,
  solo,
  links,
}: {
  groups: ReadonlyMap<string, readonly GuestWithGroup[]>;
  solo: readonly GuestWithGroup[];
  links: ReadonlyMap<string, WhatsAppLink>;
}): string {
  const today = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines: string[] = [
    "# 💌 Links de invitación — Boda Angie & Tomi",
    "",
    `_Generado el ${today}. Total: ${links.size} invitado(s) pendiente(s) de confirmar._`,
    "",
    "---",
    "",
  ];

  // Sección de grupos familiares
  if (groups.size > 0) {
    lines.push("## 👨‍👩‍👧 Grupos familiares", "");

    for (const [groupName, members] of groups) {
      lines.push(`### ${groupName}`, "");
      for (const guest of members) {
        const link = links.get(guest.id);
        if (link) {
          lines.push(
            `- **${link.guestFullName}** — [Enviar invitación por WhatsApp](${link.url})`
          );
        }
      }
      lines.push("");
    }

    lines.push("---", "");
  }

  // Sección Los-Sin-Grupo
  if (solo.length > 0) {
    lines.push("## 🎲 Los-Sin-Grupo", "");
    for (const guest of solo) {
      const link = links.get(guest.id);
      if (link) {
        lines.push(
          `- **${link.guestFullName}** — [Enviar invitación por WhatsApp](${link.url})`
        );
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Guarda el contenido Markdown en el directorio output/.
 * Crea el directorio si no existe.
 *
 * El nombre del archivo incluye la fecha para mantener historial:
 *   output/invitations-2026-03-15.md
 *
 * @param content - Contenido Markdown a guardar
 * @returns Ruta relativa del archivo generado
 */
function saveToFile(content: string): string {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const filename = `invitations-${dateStr}.md`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  fs.writeFileSync(outputPath, content, "utf-8");
  return outputPath;
}

// Ejecutar y manejar errores no capturados con mensaje amigable
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ Error inesperado:\n   ${message}`);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add index.ts
git commit -m "feat: add entry point with Markdown rendering and file output"
```

---

## Task 8: Documentación

**Files:**

- Modify: `README.md`
- Create: `docs/ARCHITECTURE.md`
- Modify: `CLAUDE.md`

**Step 1: Reemplazar README.md**

````markdown
# 💍 WhatsApp Wedding Invitation Maker

Generador de links de invitación WhatsApp para la boda de **Angie & Tomi** (Julio 2026).

Conecta con la base de datos Supabase de [www.labodadeangieytomi.com](https://www.labodadeangieytomi.com),
obtiene todos los invitados con teléfono que aún no confirmaron asistencia,
y genera un archivo Markdown con links de WhatsApp listos para enviar — uno por invitado,
con un mensaje amoroso y personalizado.

---

## Requisitos

- Node.js 18+
- Credenciales del proyecto Supabase (ver sección Setup)

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de variables de entorno
cp .env.example .env
# → Completar .env con las credenciales de Supabase
#   (Supabase Dashboard → Project Settings → API)
```
````

## Uso

```bash
npm run generate
```

El script genera `output/invitations-YYYY-MM-DD.md` con todos los links.
Abrí ese archivo en cualquier visor Markdown (VS Code, GitHub, Obsidian)
para ver la lista y hacer clic en los links directamente.

## Output de ejemplo

```
## 👨‍👩‍👧 Grupos familiares

### PAISADAN
- **Sergio Pais** — [Enviar invitación por WhatsApp](https://wa.me/...)
- **Silvana Adán** — [Enviar invitación por WhatsApp](https://wa.me/...)

---

## 🎲 Los-Sin-Grupo
- **Paula Salgueiro** — [Enviar invitación por WhatsApp](https://wa.me/...)
```

## Documentación adicional

- [Arquitectura del proyecto](docs/ARCHITECTURE.md)
- [Documento de diseño](docs/plans/2026-03-15-whatsapp-generator-design.md)
- [Plan de implementación](docs/plans/2026-03-15-whatsapp-link-generator.md)

````

**Step 2: Create docs/ARCHITECTURE.md**

```markdown
# Arquitectura del proyecto

## Visión general

Script de Node.js + TypeScript con arquitectura en capas liviana.
Las dependencias apuntan siempre hacia adentro: la lógica de dominio
no conoce ni Supabase ni el filesystem.

````

index.ts (entry point: carga .env, escribe el archivo Markdown)
└── src/application/generateLinks.ts (caso de uso: orquesta todo)
├── src/infrastructure/guestRepository.ts (query a Supabase)
│ └── src/infrastructure/supabaseClient.ts (singleton)
└── src/domain/ (lógica pura, sin dependencias externas)
├── types.ts (interfaces y tipos centrales)
├── messageTemplate.ts (construye el texto del mensaje)
└── whatsappLink.ts (genera la URL wa.me/...)

```

## Capas

### `src/domain/` — Lógica de negocio pura
Sin dependencias externas. Contiene el vocabulario y las reglas del negocio:
- **types.ts**: Interfaces centrales (`GuestWithGroup`, `WhatsAppLink`, `InvitationOutput`)
- **messageTemplate.ts**: Construye el mensaje personalizado según si el invitado tiene grupo o no
- **whatsappLink.ts**: Genera la URL `wa.me/?text=...` y normaliza números argentinos al formato internacional

### `src/infrastructure/` — Acceso a datos
Conoce Supabase, pero no el filesystem ni la presentación:
- **supabaseClient.ts**: Singleton del cliente con validación de variables de entorno al inicio
- **guestRepository.ts**: Query con nested selects (un round-trip) + mapping a tipos del dominio

### `src/application/` — Orquestación
Coordina infraestructura y dominio. No sabe de Supabase ni de archivos:
- **generateLinks.ts**: Caso de uso principal — obtiene datos, genera links, agrupa por familia

### `index.ts` — Entry point
Carga `.env` (primer import, crítico), ejecuta el caso de uso, renderiza Markdown, escribe el archivo.

## Decisiones de diseño

| Decisión | Razón |
|---|---|
| Sin tests automatizados | YAGNI — script de evento único |
| `import 'dotenv/config'` como primer import | En CommonJS, los imports se ejecutan en orden; garantiza que `.env` se cargue antes del cliente Supabase |
| Nested selects de Supabase | Un solo round-trip para guests + grupo + miembros del grupo |
| `output/` en `.gitignore` | Los archivos contienen datos personales (teléfonos) de los invitados |
| Confirmación filtrada en JS | Supabase no soporta "NOT EXISTS" en client-side queries; se trae `confirmations` y se filtra en memoria (escala bien para ~50-100 invitados) |
```

**Step 3: Reemplazar CLAUDE.md**

````markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Script de Node.js + TypeScript que genera links de invitación WhatsApp para la boda de
**Angie & Tomi (Julio 2026)**. Se conecta a la misma base de datos Supabase que usa la
web de invitación, obtiene invitados sin confirmar con teléfono, y genera un Markdown
con links `wa.me` personalizados.

- Web de la boda: [www.labodadeangieytomi.com](https://www.labodadeangieytomi.com)
- Repo de la UI: [wedding-invitation-ui](https://github.com/tompais/wedding-invitation-ui)

## Commands

```bash
npm install       # Instalar dependencias
npm run generate  # Ejecutar el script → genera output/invitations-YYYY-MM-DD.md
```
````

## Architecture

Arquitectura en capas liviana. Detalles en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
index.ts                          → Entry point (carga .env, renderiza y escribe Markdown)
src/application/generateLinks.ts  → Caso de uso (orquesta todo)
src/infrastructure/               → Supabase singleton + guest repository
src/domain/                       → Lógica pura: types, messageTemplate, whatsappLink
```

## Code Quality Principles

- **SOLID, DRY, KISS, YAGNI, Clean Code, Clean Architecture** en cada cambio
- **Null safety**: preferir `undefined` sobre `null`, `strictNullChecks` activo, valores por defecto explícitos
- **Enums** para valores/estados finitos en lugar de strings literales dispersos
- **JSDoc** en todas las funciones públicas y módulos — incluir parámetros, retorno y excepciones
- **Comentarios** que explican el _por qué_, no el _qué_ (el código ya muestra el qué)
- **Sin tests** — decisión explícita (YAGNI, evento único)

## Documentation Workflow

En cada PR que cambie arquitectura, comportamiento o convenciones:

1. Actualizar `README.md` si cambia el uso o setup
2. Actualizar `docs/ARCHITECTURE.md` si cambia la estructura de capas
3. Crear `docs/plans/YYYY-MM-DD-<feature>.md` para cada nuevo diseño aprobado
4. Diagramas (si aportan valor) en `diagrams/` como `.mmd` (Mermaid) o `.puml` (PlantUML)

## Git & Branch Workflow

Sin pushes directos a `master`. Siempre rama + PR.

| Prefijo rama    | Cuándo usarlo                                 |
| --------------- | --------------------------------------------- |
| `feature/*`     | Nueva funcionalidad                           |
| `enhancement/*` | Mejoras a funcionalidad existente             |
| `chore/*`       | Config, deps, CI                              |
| `wording/*`     | Solo cambios de texto/copy                    |
| `refactor/*`    | Reestructuración sin cambio de comportamiento |
| `fix/*`         | Bug fix                                       |
| `hotfix/*`      | Fix urgente en producción                     |

PR titles: `[FTR]`, `[ENH]`, `[CHR]`, `[WRD]`, `[RFT]`, `[FIX]`, `[HOTFIX]`

Commits atómicos:

```
feat|enhance|fix|refactor|chore|docs|wording: descripción imperativa en español

[cuerpo opcional: explica el POR QUÉ, no el qué — el diff ya muestra el qué]
```

## Environment

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

Sin prefijo `NEXT_PUBLIC_` — este es Node.js puro, no Next.js.
Copiar `.env.example` a `.env` y completar con las credenciales del Supabase Dashboard → API.

## Collaboration

| Rol      | Herramienta    | Responsabilidades                                                   |
| -------- | -------------- | ------------------------------------------------------------------- |
| Builder  | Claude Code    | Features, refactors, arquitectura, documentación                    |
| Reviewer | GitHub Copilot | Code reviews en PRs; debe respetar los principios de este CLAUDE.md |

## Periodic Maintenance

Cada cierta cantidad de sesiones, revisar:

- [ ] ¿Hay skills nuevas que aplicar? → `/skill-creator`
- [ ] ¿Hay automaciones de Claude Code por configurar? → `/claude-automation-recommender`
- [ ] ¿CLAUDE.md refleja el estado actual del proyecto? → actualizarlo

````

**Step 4: Commit**

```bash
git add README.md docs/ARCHITECTURE.md CLAUDE.md
git commit -m "docs: add README, ARCHITECTURE, and update CLAUDE.md with full project context"
````

---

## Task 9: Smoke test y PR

**Step 1: Crear .env con credenciales reales** (pedir al usuario las credenciales)

```bash
cp .env.example .env
# Editar .env con SUPABASE_URL y SUPABASE_ANON_KEY reales
```

**Step 2: Ejecutar el script**

```bash
npm run generate
```

Output esperado:

```
💍 Generador de invitaciones WhatsApp — Boda Angie & Tomi

✅ ¡Listo! Archivo generado: output/invitations-2026-03-15.md
   📨 XX link(s) de invitación listos para enviar.
```

**Step 3: Verificar el output manualmente**

Abrir `output/invitations-2026-03-15.md` y verificar:

- [ ] Tiene encabezado con fecha y total
- [ ] Los grupos familiares aparecen ordenados alfabéticamente
- [ ] Dentro de cada grupo, los invitados están ordenados por apellido
- [ ] La sección "Los-Sin-Grupo" aparece al final
- [ ] Un link al azar abre WhatsApp con el mensaje correcto al hacer clic
- [ ] El mensaje tiene el nombre del invitado y el código correcto

**Step 4: Push y PR**

```bash
git push -u origin feature/whatsapp-link-generator

gh pr create \
  --base chore/project-setup-and-design \
  --title "[FTR] WhatsApp invitation link generator" \
  --body "$(cat <<'EOF'
## Summary

- Implementa el generador completo de links de WhatsApp Me para invitados a la boda
- Arquitectura en capas: domain (lógica pura) / infrastructure (Supabase) / application (caso de uso) / index.ts (entry point)
- Filtra invitados con teléfono que no confirmaron asistencia
- Genera mensajes personalizados: con grupo (lista compañeros) o sin grupo (invitación individual)
- Output: Markdown con grupos familiares ordenados + sección Los-Sin-Grupo al final

## Test plan

- [ ] Copiar `.env.example` a `.env` y completar credenciales de Supabase
- [ ] Ejecutar `npm run generate`
- [ ] Verificar que se genera `output/invitations-YYYY-MM-DD.md`
- [ ] Verificar que los grupos familiares están ordenados alfabéticamente
- [ ] Verificar que un link al azar abre WhatsApp con el mensaje correcto
- [ ] Verificar que el mensaje incluye el código del invitado y la URL de la boda

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

> Este PR apunta a `chore/project-setup-and-design`. Una vez mergeado ese PR a `master`,
> actualizar el base de este PR a `master` con:
>
> ```bash
> gh pr edit <número> --base master
> ```
