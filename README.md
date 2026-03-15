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

## Uso

```bash
npm run generate
```

El script genera `output/invitations-YYYY-MM-DD.md` con todos los links.
Abrí ese archivo en cualquier visor Markdown (VS Code, GitHub, Obsidian)
para ver la lista y hacer clic en los links directamente.

## Output de ejemplo

```
# 💌 Links de invitación — Boda Angie & Tomi

_Generado el 15 de marzo de 2026. Total: 42 invitado(s) pendiente(s) de confirmar._

## 👨‍👩‍👧 Grupos familiares

### PAISADAN
- **Sergio Pais** — [Enviar invitación por WhatsApp](https://wa.me/...)
- **Silvana Adán** — [Enviar invitación por WhatsApp](https://wa.me/...)

---

## 🎲 Los-Sin-Grupo
- **Paula Salgueiro** — [Enviar invitación por WhatsApp](https://wa.me/...)
```

## Comandos de desarrollo

```bash
npm run lint          # Verificar calidad de código (ESLint)
npm run lint:fix      # Corregir errores de ESLint automáticamente
npm run format        # Formatear código (Prettier)
npm run format:check  # Verificar formato sin modificar
```

## Documentación adicional

- [Arquitectura del proyecto](docs/ARCHITECTURE.md)
- [Documento de diseño](docs/plans/2026-03-15-whatsapp-generator-design.md)
- [Plan de implementación](docs/plans/2026-03-15-whatsapp-link-generator.md)
