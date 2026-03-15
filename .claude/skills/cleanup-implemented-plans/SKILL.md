---
name: cleanup-implemented-plans
description: Corre el flujo de limpieza de archivos docs/plans/ que ya fueron implementados y mergeados a master
disable-model-invocation: true
---

Run the following steps in the project root `<project_root>`:

1. List all files currently in `docs/plans/` and show them to the user.
2. For each file, confirm it corresponds to a feature already merged to `master` (check git log if unsure).
3. Delete the confirmed files.
4. Verify `docs/plans/` is now empty (or contains only unimplemented plans).
5. Stage and commit with message: `chore: eliminar planes implementados de docs/plans/`

If `docs/plans/` is already empty, report that there is nothing to clean up.
If any plan file has not yet been implemented, leave it in place and inform the user.
