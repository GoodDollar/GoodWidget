# Design files

Machine-readable design specs exported from Penpot, plus the scripts that produce and translate them.
One folder per feature.

```
design-files/
  scripts/
    penpot-extract-spec.js     runs inside the Penpot plugin sandbox, returns the spec JSON
    spec-to-tamagui.mjs        Node translator: spec JSON -> Tamagui build notes
  <feature>/
    meta.json                  hand-authored: Penpot component -> code target, icons, open questions
    spec/                      exported from Penpot (do not edit by hand)
      tokens.json              token catalog + Light/Dark theme definitions
      components/<Name>.json   one file per component, every variant
      journey.json             title, notes, per-frame transitions
      journey/NN-<slug>.json   one file per journey frame
    generated/                 output of spec-to-tamagui.mjs (do not edit by hand)
```

## Regenerate

```
node docs/design-files/scripts/spec-to-tamagui.mjs docs/design-files/<feature>          # write generated/*.md
node docs/design-files/scripts/spec-to-tamagui.mjs docs/design-files/<feature> --check  # exit 1 on spec errors
```

`--check` fails on unknown tokens, instances with no `componentMap` entry, and map entries that point at
files that no longer exist, so a stale map is caught when the code moves.

## Re-export from Penpot

Open the page, then run the extractor body in the Penpot plugin console (or via an MCP `execute_code`
call) and save the returned JSON under `<feature>/spec/`. See the header of `scripts/penpot-extract-spec.js`.
