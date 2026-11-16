# Production consumer loading check

From the repository root, build the ecosystem package and its workspace dependencies,
then run:

```sh
pnpm --filter @goodwidget/ecosystem-widget... build
pnpm exec playwright test --config tests/widgets/ecosystem-widget/production/playwright.config.ts
```

The test builds and serves a Vite production consumer of the package's built ESM
entry, not widget source or stub modules. It uses the Storybook EIP-1193 demo
provider (no signing or transactions), blocks external requests, and records actual
browser requests. The Vite plugin records rendered widget-package modules in each
output chunk. Shared third-party chunks have no widget owner; a chunk containing
rendered code from multiple widget packages is checked against every owner.
Each of the four widgets is tested as an enabled widget, while the other pair is
disabled. `dist/` is generated locally.

The custom-element consumer separately imports the production `register` entry,
then verifies live JavaScript property updates and widget switching through its
shadow DOM. It uses the same no-transaction provider and network isolation.
