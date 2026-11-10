# Design files

Build specs derived from Penpot designs, for a follow-up agent (or human) to implement. One folder per feature.

```
design-files/
  scripts/
    penpot-extract-spec.js     runs inside the Penpot plugin sandbox, returns the raw export JSON
    spec-to-tamagui.mjs        Node translator: raw export + meta.json + presets.ts -> design-spec.md
  <feature>/
    design-spec.md             COMMITTED, generated: journey, component-to-code map, structure, validation
    meta.json                  COMMITTED, hand-authored: Penpot component -> code target, open questions
    spec/                      LOCAL ONLY (gitignored): raw Penpot export, input to the translator
```

`design-spec.md` is the only document an implementing agent needs. The raw export is an intermediate and is
not committed.

## Flow: Penpot -> pull request

1. Edit the design in Penpot. Build frames from the shared components; embed existing widgets as a
   `WidgetSlot` instead of redrawing them.
2. Re-export into `<feature>/spec/` with `scripts/penpot-extract-spec.js` (open the page, run the body in the
   Penpot plugin console or an MCP `execute_code` call, save the returned JSON). See the script header.
3. Update `meta.json` if components were added, removed or moved in code.
4. Regenerate: `node docs/design-files/scripts/spec-to-tamagui.mjs docs/design-files/<feature>`
5. Commit `design-spec.md` and `meta.json` and open the pull request.

## Check

```
node docs/design-files/scripts/spec-to-tamagui.mjs docs/design-files/<feature> --check
```

Regenerates in memory and compares with the committed `design-spec.md`. It exits 1 when:

- the committed file is stale (Penpot changed, nobody regenerated; output is deterministic),
- a token used in Penpot is not defined in `packages/ui/src/presets.ts`,
- an instance has no `componentMap` entry, or a mapped file no longer exists in the repo.

Requires Node >= 22.18 (it imports `presets.ts` directly) and a local `spec/` export.
