# WhatsApp Invitation Link Generator — Design Document

**Fecha:** 2026-03-15
**Proyecto:** Boda Angie & Tomi — Julio 2026
**Estado:** Aprobado

---

## Objetivo

Script de Node.js + TypeScript que se conecta a la base de datos Supabase de la web de invitación
(`www.labodadeangieytomi.com`), obtiene todos los invitados con teléfono registrado que aún no
confirmaron asistencia, y genera un archivo Markdown con links de WhatsApp Me listos para enviar,
con un mensaje personalizado y amoroso para cada invitado.

---

## Contexto

La página web de la boda permite a los invitados confirmar asistencia al Civil y/o la Fiesta
ingresando un código personal de 6 dígitos. Este script automatiza la generación de los links
para compartir ese código vía WhatsApp, agilizando el proceso de invitación.

Referencia: [wedding-invitation-ui](https://github.com/tompais/wedding-invitation-ui)

---

## Stack Técnico

| Tecnología | Rol |
|---|---|
| TypeScript | Lenguaje principal |
| ts-node | Ejecuta TypeScript sin build step |
| @supabase/supabase-js | Cliente oficial de Supabase |
| dotenv | Carga de variables de entorno |
| Node.js (CommonJS) | Runtime |

Sin framework, sin bundler. Script puro de Node.js.

---

## Arquitectura — Capas

```
src/
  infrastructure/
    supabaseClient.ts     → Singleton del cliente Supabase
    guestRepository.ts    → Query: guests con phone + sin confirmación + miembros de grupo
  domain/
    types.ts              → Interfaces y enums del dominio
    messageTemplate.ts    → Construye el texto del mensaje de WhatsApp
    whatsappLink.ts       → Genera la URL wa.me/?text=...
  application/
    generateLinks.ts      → Caso de uso: orquesta repo → dominio → estructura de output
index.ts                  → Entry point: carga .env, corre el caso de uso, escribe el MD
```

+**Principio clave:** la lógica de dominio no importa ni Supabase ni el sistema de archivos.
Las dependencias apuntan hacia adentro: `index.ts → application → domain ← infrastructure`.

Sin testing automatizado (YAGNI — proyecto de evento único).

---

## Modelo de Datos

Tablas relevantes de Supabase:

```sql
guests       → id, first_name, last_name, phone (nullable), code, group_id
groups       → id, name
confirmations → guest_id (unique) -- si existe, el invitado ya confirmó
```

**Filtro aplicado:** guests donde `phone IS NOT NULL` y no tienen fila en `confirmations`.

---

## Tipos del Dominio

```ts
interface GuestWithGroup {
  id: string
  firstName: string
  lastName: string
  phone: string          // siempre presente (filtrado en repositorio)
  code: string
  groupName?: string     // undefined si no pertenece a un grupo
  groupMembers: GroupMember[]  // vacío si no tiene grupo
}

interface GroupMember {
  firstName: string
  lastName: string
}

enum OutputSection {
  FAMILY_GROUP = "family_group",
  SOLO = "solo"
}
```

---

## Mensajes de WhatsApp

### Invitado con grupo

```
¡Hola, *[Nombre]*! 💍🎉

¡Somos Angie y Tomi y nos ilusiona muuuucho contarte que ya abrimos la confirmación
para nuestra boda! ¡Que estés ese día con nosotros significa un montón! 🥰

Para confirmar, entrá a 👉 *https://www.labodadeangieytomi.com* e ingresá tu código personal:
🔑 *[CÓDIGO]*

¡Ah, y también podés confirmar por los que se suman con vos!
👥 _[Miembro 1], [Miembro 2]..._

¡Los esperamos con todo el amor del mundo! 🥂✨
```

### Invitado sin grupo ("Los-Sin-Grupo")

```
¡Hola, *[Nombre]*! 💍🎉

¡Somos Angie y Tomi y nos ilusiona muuuucho contarte que ya abrimos la confirmación
para nuestra boda! ¡Que estés ese día con nosotros significa un montón! 🥰

Para confirmar, entrá a 👉 *https://www.labodadeangieytomi.com* e ingresá tu código personal:
🔑 *[CÓDIGO]*

_Tu invitación es personal y exclusiva — ¡fue pensada especialmente para vos! 🥰_

¡Te esperamos con todo el amor del mundo! 🥂✨
```

**Formato WhatsApp:** `*negrita*`, `_cursiva_`. El mensaje se encodea con `encodeURIComponent`.

---

## Normalización de Teléfono (Argentina)

El link de WhatsApp Me requiere el número en formato internacional sin `+`:
- Prefijo de país: `54`
- Eliminar `0` inicial si existe
- Eliminar `15` de celular si existe (formato antiguo argentino)

Ejemplo: `01164690945` → `541164690945`

Si el formato es inesperado, se loguea una advertencia y se omite el invitado.

---

## Formato del Output

Archivo: `output/invitations-YYYY-MM-DD.md`

```markdown
# 💌 Links de invitación — Boda Angie & Tomi

_Generado el [fecha]. Total: X invitados._

---

## 👨‍👩‍👧 Grupos familiares

### PAISADAN
- **Sergio Pais** — [Enviar invitación por WhatsApp](https://wa.me/...)
- **Silvana Adán** — [Enviar invitación por WhatsApp](https://wa.me/...)

### VILASALGUEIRO
- **Susana Vila** — [Enviar invitación por WhatsApp](https://wa.me/...)

---

## 🎲 Los-Sin-Grupo
- **Paula Salgueiro** — [Enviar invitación por WhatsApp](https://wa.me/...)
```

---

## Manejo de Errores

| Situación | Comportamiento |
|---|---|
| Variables de entorno faltantes | Error descriptivo al arranque, el script no corre |
| Fallo de conexión a Supabase | Error con mensaje claro (no stacktrace crudo) |
| Sin invitados sin confirmar | Mensaje informativo, termina sin error |
| Teléfono con formato inesperado | Advertencia en consola, invitado omitido |

Sin `try/catch` genéricos que oculten errores.

---

## Documentación

- `README.md` — índice del proyecto y guía de uso del script
- `docs/ARCHITECTURE.md` — explicación detallada de capas y decisiones de diseño
- JSDoc en todas las funciones y módulos públicos
- Este documento (`docs/plans/2026-03-15-whatsapp-generator-design.md`) como registro de la decisión de diseño

---

## Variables de Entorno

```env
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
```

> Sin prefijo `NEXT_PUBLIC_` — este proyecto es Node.js puro, no Next.js.
