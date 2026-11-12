# Passkey login widget QA

Covers `packages/passkey-login-widget` (issue #307, feature #305).

## What the automated specs prove

Run against a prestarted Storybook (`pnpm --filter storybook dev`, port 6006) with `pnpm test:demo tests/widgets/passkey-login-widget`.

| Spec | Evidence |
| --- | --- |
| `states.spec.ts` | Every screen A1-D6 (incl. D3 single provider, D5 new/existing user, D6 ambiguous) in light and dark; screenshots in `test-results/{light,dark}/`. |
| `new-account.spec.ts`, `restore-existing-passkey.spec.ts`, `existing-user-backup.spec.ts`, `provider-choice.spec.ts` | Create, back up, restart and restore round trips; provider choice and remembered provider; exact key restore for an account whose key was not derived from the passkey. |
| `errors-and-recovery.spec.ts` | D1-D6, each with its recovery buttons and the `onError` code. |
| `new-account-after-cancelled-passkey.spec.ts` | Regression for the Live-story bug: A1 -> cancelled get -> D2 -> "Create new account" -> A3 -> A4 -> (B2) -> B3 -> B4 with a recorded screen sequence, exactly one passkey, `onLogin` with `isNewAccount: true`; D5 only after the passkey exists and Retry resumes at B3 without a second passkey; an invalid rpId (IP address host) ends on D1, never D5; the real Google Drive adapter on the Live story (fake Google SDK + Drive API from `fakeGoogleDrive.ts`) for success and for denied / blocked / throwing sign-in, which must end on D4 and resume at the upload on "Try again". |
| `key-safety.spec.ts` | The account key and PRF output never reach the DOM, web storage, console or the uploaded file; the file holds only ciphertext. |
| `version.spec.ts` | Version label in light/dark, desktop/mobile. |

**Why the first specs missed the bug.** They only ran on `localhost` (a valid rpId), on a mock storage whose `authorize()` could only throw `ProviderAuthError`, so the real Drive adapter, Google's script and any other origin were never exercised, and the Live story was not covered at all. `fakeGoogleDrive.ts` and the IP-host test close that gap.

**Limits.** These specs use a Chromium virtual authenticator (real WebAuthn + PRF + WebCrypto) and an in-memory storage double (plus a fake Google SDK / Drive API for the Live story). They do not prove that Google Drive, CloudKit, a platform authenticator or a real password manager work. Those checks are manual and listed below.

## Manual live check (needs GoodDollar-owned values)

Open `QA / PasskeyLoginWidget / Live (real passkey + real providers)`. Use a throwaway Google / Apple account: the story writes real backup files.

| Variable (or story control) | Meaning |
| --- | --- |
| `VITE_PASSKEY_GOOGLE_CLIENT_ID` | Google OAuth "Web application" client ID. Add the Storybook origin as an authorized JavaScript origin. Backups live in this client's `appDataFolder`, so the ID must stay stable once users have backups. |
| `VITE_PASSKEY_ICLOUD_CONTAINER_ID` | CloudKit container identifier, e.g. `iCloud.org.gooddollar.passkey`. |
| `VITE_PASSKEY_ICLOUD_API_TOKEN` | CloudKit API token restricted to the Storybook origin. |
| `VITE_PASSKEY_ICLOUD_ENVIRONMENT` | `development` (default) or `production`. |

Put them in `examples/storybook/.env.local` (git-ignored). Never commit them.

Checklist: new account + backup, restart + restore, existing user backup (`backUpThrowawayAccount`), provider sign-in cancelled (D4), and a second backup file under the same passkey (ambiguous copy). The Live story must show "Google Drive: configured" before testing.

## CloudKit handover (one-time container setup)

In the CloudKit Dashboard, container schema:

- Record type `PasskeyBackup` in the **private** database with fields `prfTag` (String), `address` (String) and `payload` (String).
- A **Queryable** index on `prfTag` (the lookup is a server-side query on it).
- An API token for the web origins, "Sign In Callback: none" (CloudKit JS renders its own Apple sign-in button, shown in a small overlay).
- Deploy the development schema to production before a production release.

## Known gaps

- Google Drive and iCloud adapters have unit tests with mocked transports only; the CloudKit sign-in overlay is unverified in a real browser.
- Wrong-passkey (D6) cannot be simulated with one virtual authenticator, so D6 is covered by tampered ciphertext, mismatched address, unknown version and ambiguous-backup files.
