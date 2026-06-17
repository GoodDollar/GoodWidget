# Governance Onboarding — Reference Screenshots

This directory holds the **curated reference set** for the governance onboarding widget.
The PNGs are produced by the Playwright suite (`pnpm test:demo tests/widgets/governance-widget`)
and copied here for human review.

## How to regenerate

```bash
# From repo root:
pnpm --filter @goodwidget/storybook build-storybook   # optional, dev server also works
pnpm storybook &                                       # start dev server on :6006
pnpm test:demo tests/widgets/governance-widget        # runs the suite, writes test-results/
```

Then copy each `tests/widgets/governance-widget/test-results/gwo-NN-*.png` into this
directory under its state-based name below.

## What's here

| State | Story | Notes |
|---|---|---|
| `welcome-verified.png` | `custodialInteractiveFlow` (step 1) | Verified welcome; CTA enabled |
| `welcome-unverified.png` | `custodialWelcomeUnverified` | Unverified welcome; CTA disabled |
| `house-selection.png` | `custodialInteractiveFlow` (step 2) | House selection inside the interactive flow |
| `house-selection-standalone.png` | `custodialHouseSelection` | House selection as a standalone story |
| `profile-alignment.png` | `custodialInteractiveFlow` (step 3) | Alignment profile with all fields filled |
| `profile-citizenship-ready.png` | `custodialCitizenshipProfileReady` | Citizenship profile ready to continue |
| `profile-alignment-error.png` | `custodialAlignmentProfileError` | Alignment profile with field errors |
| `stake-progress-active.png` | `custodialInteractiveFlow` (step 4) | Stake stepper with active transaction |
| `stake-progress-failed.png` | `custodialStakeProgress` | Stake stepper with failed transaction |
| `success.png` | `custodialInteractiveFlow` (step 5) | Success state inside the interactive flow |
| `success-standalone.png` | `custodialSuccess` | Success state as a standalone story |

## Naming convention

- **`screenshots/`** — curated, state-named reference set, checked in, regenerated
  on demand. This is what reviewers look at.
- **`tests/widgets/governance-widget/test-results/`** — Playwright run artifacts.
  These churn on every test run and should not be considered reference quality.

The two directories intentionally diverge to keep reference evidence stable while
allowing test artifacts to evolve with the test suite.
