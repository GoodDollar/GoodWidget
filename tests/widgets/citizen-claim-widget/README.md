# Citizen Claim state regression tests

Run against the built workspace packages and local Storybook:

```sh
pnpm --filter @goodwidget/citizen-claim-widget build
pnpm test:demo tests/widgets/citizen-claim-widget/states.spec.ts --retries=0 --workers=1
pnpm test:demo tests/widgets/citizen-claim-widget/states.spec.ts --grep 'fresh wallet|pre-connect stats' --repeat-each=10 --retries=0 --workers=1
```

The fresh-wallet tests exercise the real custodial fixture, provider, adapter, and
Citizen SDK. Playwright supplies ABI-encoded zero whitelisted roots and entitlement
results for RPC reads, including SDK fallback endpoints. No live transactions or
RPC responses are needed. Retry recovery uses the same mock.

The `pre-connect stats` regression holds the first Celo daily-stats request, which
starts before the provider discovers the wallet. The connected wallet must show
Verify while that request is pending. Releasing it reports seven claimers; waiting
for that footer value confirms the delayed response reached the UI before asserting
that Verify remains visible.

Previously, the address-less refresh awaited auxiliary reads and then set
`not_connected`, overwriting the newer `not_whitelisted` result. If that happened
between the original test's one-second polls, its 15-second wait never saw Verify.
Address/chain-only status decisions now run synchronously, independently of those
best-effort reads. The fresh-wallet assertion still has a 15-second deadline and
requires the actual Verify button.

Curated screenshots are in `test-results/` beside this file. In particular,
`ccw-06-not-whitelisted-after-stats.png` records Verify alongside the completed
seven-claimer stats response. Runner traces, videos, and diagnostics belong in the
repository-root `/test-results/`, which remains ignored.
