AutoGLM Desktop Integration

What changed:
- Added AutoGLM quick entry to controls island in expanded mode so desktop users can open/configure AutoGLM without the controls overlaying the Live2D character.

Rollback instructions:

If you need to revert these changes, run:

```bash
# discard the controls-island change
git checkout -- apps/stage-tamagotchi/src/renderer/components/stage-islands/controls-island/index.vue

# remove the rollback file if present
git rm --cached apps/stage-tamagotchi/src/renderer/changes/AUTOGLM_DESKTOP_INTEGRATION.md || true
rm -f apps/stage-tamagotchi/src/renderer/changes/AUTOGLM_DESKTOP_INTEGRATION.md

# or revert the last commit that introduced these changes
# (use commit hash from your history)
# git revert <commit-hash>
```

Notes:
- The integration reuses `AutoGLMControls` from `packages/stage-layouts` which already contains the toggle and configuration dialog.
- The control is added inside the expanded controls panel (only visible when expanded) to avoid obstructing the Live2D canvas.
