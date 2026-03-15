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
