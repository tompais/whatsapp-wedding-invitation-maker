# Claude Code Automations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Configurar automatizaciones de Claude Code a nivel de proyecto: hooks de protección y lint automático, y un skill `/run-smoke-test`.

**Architecture:** Se crean dos archivos en la carpeta `.claude/` del proyecto (rastreados en git), que Claude Code carga automáticamente cuando se abre este proyecto. Los hooks se definen en `.claude/settings.json`; los skills del proyecto en `.claude/skills/<name>/SKILL.md`. El GitHub MCP es una instalación global del usuario (fuera del repo).

**Tech Stack:** Claude Code settings JSON, Markdown (SKILL format). Sin dependencias nuevas de npm.

---

### Contexto: ¿qué se está construyendo?

Tres automatizaciones aprobadas:

1. **Hook PostToolUse**: corre `npm run lint` automáticamente después de cada `Edit` o `Write` sobre archivos `.ts`
2. **Hook PreToolUse**: bloquea ediciones al `.env` real (permite `.env.example`)
3. **Skill `/run-smoke-test`**: corre `npm run generate` y muestra preview del output

El **GitHub MCP** (cuarta recomendación) es una instalación global del usuario — no va en el repo. Se incluye como paso de referencia al final.

---

### Task 1: Crear rama y estructura `.claude/`

**Branch base:** `master`

**Files:**

- Create: `.claude/settings.json`
- Create: `.claude/skills/run-smoke-test/SKILL.md`

**Step 1: Crear la rama desde master**

```bash
git checkout master
git checkout -b chore/claude-automations
```

Expected: se crea la rama limpia desde master.

**Step 2: Crear el directorio `.claude/skills/run-smoke-test/`**

```bash
mkdir -p .claude/skills/run-smoke-test
```

**Step 3: Verificar que la rama está sobre master**

```bash
git log --oneline master..HEAD
```

Expected: sin commits todavía (rama nueva vacía).

---

### Task 2: Hook PostToolUse — auto-lint tras edición de `.ts`

**Files:**

- Create: `.claude/settings.json`

**Step 1: Crear `.claude/settings.json` con el hook de lint**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "cd /Users/tom.pais/WebstormProjects/whatsapp-wedding-invitation-maker && file=$(echo \"$CLAUDE_TOOL_INPUT\" | python3 -c \"import json,sys; d=json.load(sys.stdin); print(d.get('file_path',''))\" 2>/dev/null); if [[ \"$file\" == *.ts ]]; then npm run lint 2>&1 | tail -8; fi"
          }
        ]
      }
    ]
  }
}
```

**Step 2: Verificar manualmente que el hook se activa**

Abrí una sesión de Claude Code en el proyecto y editá cualquier `.ts`. Después de la edición, deberías ver la salida de `npm run lint` en la consola de hooks.

Expected: salida de ESLint sin errores, o errores descriptivos si los hubiera.

**Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "chore: add PostToolUse hook for auto-lint on .ts edits"
```

---

### Task 3: Hook PreToolUse — bloquear ediciones al `.env`

**Files:**

- Modify: `.claude/settings.json`

**Step 1: Agregar el hook PreToolUse al settings.json existente**

El archivo final debe quedar:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "cd /Users/tom.pais/WebstormProjects/whatsapp-wedding-invitation-maker && file=$(echo \"$CLAUDE_TOOL_INPUT\" | python3 -c \"import json,sys; d=json.load(sys.stdin); print(d.get('file_path',''))\" 2>/dev/null); if [[ \"$file\" == *.ts ]]; then npm run lint 2>&1 | tail -8; fi"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "python3 -c \"import json,sys; d=json.load(sys.stdin); p=d.get('file_path',''); exit(2) if '.env' in p and '.env.example' not in p else exit(0)\""
          }
        ]
      }
    ]
  }
}
```

**Step 2: Verificar que `.env.example` NO queda bloqueado**

Claude Code debería poder editar `.env.example` sin problemas.

**Step 3: Verificar que `.env` SÍ queda bloqueado**

Intentar editar `.env` desde Claude Code → debe aparecer un error y la operación debe cancelarse.

**Step 4: Commit**

```bash
git add .claude/settings.json
git commit -m "chore: add PreToolUse hook to block .env edits"
```

---

### Task 4: Skill `/run-smoke-test`

**Files:**

- Create: `.claude/skills/run-smoke-test/SKILL.md`

**Step 1: Crear el skill**

Contenido de `.claude/skills/run-smoke-test/SKILL.md`:

```markdown
---
name: run-smoke-test
description: Corre npm run generate y muestra un preview del output generado
disable-model-invocation: true
---

Run the following steps in the project root `/Users/tom.pais/WebstormProjects/whatsapp-wedding-invitation-maker`:

1. Run `npm run generate`
2. Show the first 30 lines of the generated `output/invitations-*.md` file
3. Show the total count of invitation links (last line of the script output)

If the script fails, show the full error message.
```

**Step 2: Verificar que el skill es invocable**

En una sesión de Claude Code, escribir `/run-smoke-test`. Debería correr el script y mostrar el preview.

**Step 3: Commit**

```bash
git add .claude/skills/run-smoke-test/SKILL.md
git commit -m "chore: add run-smoke-test skill for quick output preview"
```

---

### Task 5: Actualizar documentación

**Files:**

- Modify: `CLAUDE.md`
- Modify: `docs/ARCHITECTURE.md` (sección de tooling)

**Step 1: Agregar sección de automatizaciones en CLAUDE.md**

Agregar después de la sección `## Periodic Maintenance`:

```markdown
## Claude Code Automations

Automatizaciones configuradas en `.claude/` (rastreadas en git):

- **Auto-lint** (PostToolUse): corre `npm run lint` automáticamente tras cada edición de `.ts`
- **Protección `.env`** (PreToolUse): bloquea ediciones al `.env` real; `.env.example` permitido
- **Skill `/run-smoke-test`**: corre `npm run generate` y muestra preview del output

GitHub MCP (`claude mcp add github`) — instalación global del usuario, no en el repo.
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document Claude Code automations in CLAUDE.md"
```

---

### Task 6: PR

**Step 1: Push de la rama**

```bash
git push -u origin chore/claude-automations
```

**Step 2: Crear PR con gh**

```bash
gh pr create \
  --base master \
  --head chore/claude-automations \
  --title "[CHR] Configurar automatizaciones de Claude Code (hooks + skill)" \
  --body "..."
```

**Step 3: Instruir al usuario sobre el GitHub MCP (fuera del repo)**

El MCP de GitHub es una configuración global del usuario. Después de mergear este PR, correr:

```bash
claude mcp add github
```

Y seguir el flujo de autenticación con un `GITHUB_TOKEN`.

---

### Referencia: GitHub MCP (instalación global)

No va en el repo. El usuario lo instala una vez en su máquina:

```bash
# Requiere un GitHub Personal Access Token con permisos repo, issues, pull_requests
claude mcp add github
```

Esto permite listar PRs, mergear, ver reviews de Copilot, etc., sin salir de Claude Code.
