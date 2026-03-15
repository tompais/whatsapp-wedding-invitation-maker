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
npm install           # Instalar dependencias
npm run generate      # Ejecutar el script → genera output/invitations-YYYY-MM-DD.md
npm run lint          # Verificar código con ESLint
npm run lint:fix      # Corregir errores ESLint automáticamente
npm run format        # Formatear con Prettier
npm run format:check  # Verificar formato sin modificar
```

**Antes de declarar cualquier tarea completa:** correr `npm run lint && npm run format:check` — deben pasar con 0 errores y 0 warnings.

## Architecture

Arquitectura en capas liviana. Detalles en [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

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
- **JSDoc** en todas las funciones públicas y módulos — incluir `@param`, `@returns`, `@throws`
- **Comentarios** que explican el _por qué_, no el _qué_ (el código ya muestra el qué)
- **0 errores y 0 warnings** en ESLint y Prettier — incluyendo warnings del IDE (WebStorm) y SonarQube
- **Sin tests** — decisión explícita (YAGNI, evento único)

## Documentation Workflow

En cada PR que cambie arquitectura, comportamiento o convenciones:

1. Actualizar `README.md` si cambia el uso o setup
2. Actualizar `docs/ARCHITECTURE.md` si cambia la estructura de capas
3. Crear `docs/plans/YYYY-MM-DD-<feature>.md` durante el diseño — son documentos de trabajo efímeros; eliminarlos una vez implementado (cuando `CLAUDE.md` y `docs/ARCHITECTURE.md` cubren las decisiones)
4. Diagramas (si aportan valor) en `diagrams/` como `.mmd` (Mermaid) o `.puml` (PlantUML)
5. Todo el código debe estar bien comentado — JSDoc en funciones públicas, comentarios inline donde la lógica no sea evidente

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

## Claude Code Automations

Automatizaciones configuradas en `.claude/` (rastreadas en git — aplican a cualquiera que abra el proyecto en Claude Code):

| Tipo                    | Trigger                          | Qué hace                                              |
| ----------------------- | -------------------------------- | ----------------------------------------------------- |
| PostToolUse hook        | Edit o Write de `.ts`            | Corre `npm run lint` automáticamente                  |
| PreToolUse hook         | Edit o Write de `.env`           | Bloquea la edición (permite `.env.example`)           |
| Skill `/run-smoke-test` | Usuario invoca `/run-smoke-test` | Corre `npm run generate` y muestra preview del output |

GitHub MCP (`claude mcp add github`) — instalación global del usuario, no está en el repo. Permite gestionar PRs y reviews desde Claude Code sin abrir el browser.
