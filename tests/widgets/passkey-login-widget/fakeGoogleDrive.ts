import type { Page, Route } from '@playwright/test'

/** How the fake Google Identity Services popup answers `requestAccessToken`. */
export type FakeGoogleSignInMode =
  /** Always grants a token. */
  | 'grant'
  /** Grants a token only while the page has transient user activation, like a real popup (blocked otherwise). */
  | 'grant-only-with-user-gesture'
  /** The user closes or denies the popup. */
  | 'denied'
  /** Google's script cannot be loaded at all (offline, ad blocker). */
  | 'script-blocked'
  /** `initTokenClient` throws, like Google rejecting a malformed client ID. */
  | 'init-throws'

export interface FakeGoogleDrive {
  /** File name -> JSON stored in the fake appDataFolder. */
  files: Map<string, string>
  /** Changes how Google answers from now on (e.g. to let a "Try again" succeed). */
  setSignInMode(signInMode: FakeGoogleSignInMode): Promise<void>
  /** How many access-token requests the widget made. */
  signInRequestCount(): Promise<number>
}

const GOOGLE_IDENTITY_SERVICES_URL = 'https://accounts.google.com/gsi/client'
const DRIVE_API_PATTERN = /^https:\/\/www\.googleapis\.com\/(upload\/)?drive\/v3\/files/

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

/** Browser-side stand-in for `https://accounts.google.com/gsi/client`. */
function buildFakeGoogleIdentityServicesScript(): string {
  return `
    window.__fakeGoogleSignIn = window.__fakeGoogleSignIn || { requestCount: 0, mode: 'grant' };
    window.google = { accounts: { oauth2: { initTokenClient: (config) => {
      if (window.__fakeGoogleSignIn.mode === 'init-throws') { throw new Error('Invalid client_id'); }
      return { requestAccessToken: () => {
        const signIn = window.__fakeGoogleSignIn;
        signIn.requestCount += 1;
        const popupCanOpen = signIn.mode === 'grant' ||
          (signIn.mode === 'grant-only-with-user-gesture' && navigator.userActivation.isActive);
        if (popupCanOpen) {
          setTimeout(() => config.callback({ access_token: 'fake-access-token', expires_in: 3600 }), 0);
        } else {
          config.error_callback({ type: 'popup_failed_to_open' });
        }
      } };
    } } } };
  `
}

/**
 * Replaces Google Identity Services and the Drive REST API in the browser, so the REAL Google Drive
 * adapter runs end to end (script loading, token popup, list / create / update calls) without a network.
 */
export async function installFakeGoogleDrive(page: Page, signInMode: FakeGoogleSignInMode): Promise<FakeGoogleDrive> {
  const files = new Map<string, string>()
  // Read per request, so a spec can unblock the script between two attempts
  let currentSignInMode = signInMode

  // The mode also lives in the page, where the fake popup reads it at request time
  await page.addInitScript((initialMode) => {
    ;(window as unknown as { __fakeGoogleSignIn: object }).__fakeGoogleSignIn = { requestCount: 0, mode: initialMode }
  }, signInMode)

  await page.route(GOOGLE_IDENTITY_SERVICES_URL, (route) =>
    currentSignInMode === 'script-blocked'
      ? route.abort('blockedbyclient')
      : route.fulfill({ contentType: 'text/javascript', body: buildFakeGoogleIdentityServicesScript() }),
  )

  await page.route(DRIVE_API_PATTERN, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const respondJson = (body: unknown) =>
      route.fulfill({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(body) })

    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS })
    }
    // The fake uses the file name as the file id
    const fileIdFromPath = decodeURIComponent(url.pathname.split('/').pop() ?? '')
    if (request.method() === 'GET' && url.searchParams.get('alt') === 'media') {
      return route.fulfill({ status: 200, headers: CORS_HEADERS, body: files.get(fileIdFromPath) ?? '' })
    }
    if (request.method() === 'GET') {
      return respondJson({ files: [...files.keys()].map((name) => ({ id: name, name })) })
    }
    if (request.method() === 'PATCH') {
      files.set(fileIdFromPath, request.postData() ?? '')
      return respondJson({ id: fileIdFromPath })
    }
    // Multipart create: part 1 is the metadata JSON (file name), part 2 the backup JSON
    const multipartBody = request.postData() ?? ''
    const [, metadataPart, backupPart] = multipartBody.split(/--gwpk-[0-9a-f-]+(?:--)?\r\n?/)
    const metadataJson = metadataPart.split('\r\n\r\n')[1].trim()
    const backupJson = backupPart.split('\r\n\r\n')[1].replace(/\r\n$/, '')
    const { name } = JSON.parse(metadataJson) as { name: string }
    files.set(name, backupJson)
    return respondJson({ id: name, name })
  })

  return {
    files,
    async setSignInMode(nextSignInMode) {
      currentSignInMode = nextSignInMode
      await page.evaluate((mode) => {
        ;(window as unknown as { __fakeGoogleSignIn: { mode: string } }).__fakeGoogleSignIn.mode = mode
      }, nextSignInMode)
    },
    signInRequestCount: () =>
      page.evaluate(() => (window as unknown as { __fakeGoogleSignIn?: { requestCount: number } }).__fakeGoogleSignIn?.requestCount ?? 0),
  }
}
