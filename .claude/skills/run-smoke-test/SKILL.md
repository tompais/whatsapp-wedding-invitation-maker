---
name: run-smoke-test
description: Corre npm run generate y muestra un preview del output generado para verificar que el script funciona correctamente
disable-model-invocation: true
---

Al invocar este skill, seguí estos pasos exactamente:

1. Corré `npm run generate` desde el root del proyecto usando la herramienta Bash.

2. Si el script falla (exit code distinto de 0), mostrá el error completo tal como aparece en stderr/stdout, sin interpretarlo.

3. Si el script termina con éxito, mostrá:
   - El mensaje de éxito (la línea que contiene el total de links generados, usualmente con ✅)
   - Las primeras 30 líneas del archivo generado `output/invitations-*.md` (usá `head -30` sobre el archivo más reciente)

4. No pedís ninguna confirmación ni intervención al usuario. Este es un comando puramente de observación: corrés, leés el output y lo reportás.
