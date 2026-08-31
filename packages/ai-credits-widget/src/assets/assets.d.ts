/**
 * PNG imports resolve to a data URI, inlined by the `dataurl` loader in
 * tsup.config.ts. Consumers always resolve this package through `dist`, so the
 * asset is already embedded by the time it reaches them — no loader required
 * downstream, and no separate file to host or to survive a host page's CSP.
 */
declare module '*.png' {
  const source: string
  export default source
}
