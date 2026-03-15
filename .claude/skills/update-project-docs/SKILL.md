---
name: update-project-docs
description: Actualiza CLAUDE.md y docs/ARCHITECTURE.md cuando cambia arquitectura, comportamiento o convenciones del proyecto
---

Run the following steps in the project root `/Users/tom.pais/WebstormProjects/whatsapp-wedding-invitation-maker`:

1. **Identificar qué cambió** — revisar el diff del PR actual o los últimos commits en la rama:
   - ¿Cambió la estructura de capas o módulos? → actualizar `docs/ARCHITECTURE.md`
   - ¿Cambiaron convenciones, comandos, o el setup del proyecto? → actualizar `CLAUDE.md`
   - ¿Cambió el flujo de uso o la instalación? → actualizar `README.md`

2. **Actualizar `docs/ARCHITECTURE.md`** si cambia la estructura:
   - Reflejar nuevas capas, módulos, o responsabilidades
   - Actualizar los diagramas o descripciones de dependencias

3. **Actualizar `CLAUDE.md`** si cambian convenciones:
   - Comandos disponibles (`## Commands`)
   - Principios de código o workflow (`## Code Quality Principles`, `## Git & Branch Workflow`)
   - Automatizaciones de Claude Code (`## Claude Code Automations`)
   - Documentation workflow (`## Documentation Workflow`)

4. **Verificar consistencia**: los tres documentos deben estar alineados — no debe haber información contradictoria entre `README.md`, `CLAUDE.md` y `docs/ARCHITECTURE.md`.

5. Correr `npm run lint && npm run format:check` para confirmar que los cambios pasan.

6. Incluir los cambios de documentación en el mismo commit o PR que el código que los origina.
