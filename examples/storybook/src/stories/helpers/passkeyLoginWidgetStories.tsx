import React, { useMemo, useState } from 'react'
import {
  PasskeyLoginWidget,
  PasskeyLoginWidgetPreview,
  createGoogleDriveStorage,
  createICloudStorage,
  createInitialFlowState,
  type HexString,
  type PasskeyBackupStorage,
  type PasskeyFlowState,
  type PasskeyLoginAdapterActions,
  type PasskeyLoginAdapterResult,
  type PasskeyProviderId,
  type PasskeyScreenId,
} from '@goodwidget/passkey-login-widget'
import { createMockBackupStorage, type MockBackupStorage } from '../../fixtures/passkeyMockStorage'

/** Width of the mobile-portrait card the designs were drawn at. */
const WIDGET_WIDTH_PX = 400

/** Fixed demo private key of the logged-in user in the interaction stories; a throwaway, never used on a network. */
const DEMO_PRIVATE_KEY: HexString = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318'

const PROVIDER_LABELS: Record<PasskeyProviderId, string> = { 'google-drive': 'Google Drive', icloud: 'iCloud' }

type ThemeMode = 'light' | 'dark'

/** Frames a widget at the design width. */
function WidgetFrame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: WIDGET_WIDTH_PX, padding: 12 }}>{children}</div>
}

// ---------------------------------------------------------------------------
// Screen fixtures: a fixed adapter result per screen, no WebAuthn and no storage
// ---------------------------------------------------------------------------

const NOOP_ACTIONS: PasskeyLoginAdapterActions = {
  startLogin: () => undefined,
  requestNewAccount: () => undefined,
  confirmNewAccount: () => undefined,
  startBackup: () => undefined,
  chooseProvider: () => undefined,
  retry: () => undefined,
  chooseOtherProvider: () => undefined,
  goBack: () => undefined,
  finish: () => undefined,
  skip: () => undefined,
}

export interface ScreenFixtureOptions {
  screen: PasskeyScreenId
  /** Existing (already logged-in) user: backup journey. */
  isExistingUser?: boolean
  /** Both Google Drive and iCloud are offered. */
  hasMultipleProviders?: boolean
  /** Fields of the flow state to override (provider, progress step, error code, failed screen). */
  flowState?: Partial<PasskeyFlowState>
  themeMode?: ThemeMode
}

/** Renders one screen from a fixed adapter result. */
export function ScreenFixtureStory({
  screen,
  isExistingUser = false,
  hasMultipleProviders = true,
  flowState = {},
  themeMode = 'light',
}: ScreenFixtureOptions) {
  const adapter: PasskeyLoginAdapterResult = {
    flowState: { ...createInitialFlowState({ isExistingUser, hasMultipleProviders }), screen, ...flowState },
    providerOptions: [
      { id: 'google-drive', label: PROVIDER_LABELS['google-drive'] },
      ...(hasMultipleProviders ? [{ id: 'icloud' as const, label: PROVIDER_LABELS.icloud }] : []),
    ],
    preselectedProviderId: 'google-drive',
    actions: NOOP_ACTIONS,
  }
  return (
    <WidgetFrame>
      <PasskeyLoginWidgetPreview adapter={adapter} defaultTheme={themeMode} />
    </WidgetFrame>
  )
}

// ---------------------------------------------------------------------------
// Event log shared by the interaction and live stories
// ---------------------------------------------------------------------------

/** Window hook the Playwright specs read and drive. Only the mock-backed interaction stories create it. */
export interface PasskeyStoryWindowHook {
  storages: Record<string, MockBackupStorage>
  /** Every host callback the widget fired, with the full payload (mock keys only). */
  events: { name: string; detail?: unknown }[]
}

declare global {
  interface Window {
    __passkeyStory?: PasskeyStoryWindowHook
  }
}

interface EventLogLine {
  name: string
  text: string
}

/** One line per host callback. The private key is never printed: only the address and a masked marker. */
function describeEvent(name: string, detail?: Record<string, unknown>): string {
  if (name === 'login') {
    return `login → address ${String(detail?.address)}, isNewAccount ${String(detail?.isNewAccount)}, privateKey ••••••••`
  }
  if (name === 'backup-complete') {
    return `backup-complete → address ${String(detail?.address)}, provider ${String(detail?.provider)}`
  }
  if (name === 'error') {
    // The message carries the browser's own reason (e.g. a Permissions Policy block) so a QA screenshot is diagnosable
    return `error → ${String(detail?.code)}${detail?.message ? ` — ${String(detail.message)}` : ''}`
  }
  return name
}

function EventLog({ lines }: { lines: EventLogLine[] }) {
  return (
    <div data-testid="passkey-event-log" style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 12 }}>
      {lines.length === 0 ? 'No host callbacks yet' : lines.map((line, index) => <div key={index}>{line.text}</div>)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Interaction stories: the real widget with mock storage; WebAuthn is mocked by the spec
// ---------------------------------------------------------------------------

export interface InteractionHarnessOptions {
  providerIds: PasskeyProviderId[]
  /** Existing (already logged-in) user: starts the backup journey. */
  isExistingUser?: boolean
}

/**
 * Runs the real widget against in-memory storage. "Restart widget" remounts it while keeping the
 * stored backups, which is how a spec proves a backup written in one session restores in the next.
 */
export function InteractionHarnessStory({ providerIds, isExistingUser = false }: InteractionHarnessOptions) {
  const [restartCount, setRestartCount] = useState(0)
  const [isLoggedInUser, setIsLoggedInUser] = useState(isExistingUser)
  const [logLines, setLogLines] = useState<EventLogLine[]>([])
  const mockStorages = useMemo(() => providerIds.map((providerId) => createMockBackupStorage(providerId)), [providerIds])

  const windowHook = useMemo<PasskeyStoryWindowHook>(() => {
    const hook: PasskeyStoryWindowHook = {
      storages: Object.fromEntries(mockStorages.map((mockStorage) => [mockStorage.id, mockStorage])),
      events: [],
    }
    window.__passkeyStory = hook
    return hook
  }, [mockStorages])

  function recordEvent(name: string, detail?: Record<string, unknown>) {
    windowHook.events.push({ name, detail })
    setLogLines((previousLines) => [...previousLines, { name, text: describeEvent(name, detail) }])
  }

  return (
    <WidgetFrame>
      <PasskeyLoginWidget
        key={restartCount}
        storage={mockStorages}
        rpId={window.location.hostname}
        appName="GoodWidget Storybook"
        privateKey={isLoggedInUser ? DEMO_PRIVATE_KEY : undefined}
        defaultTheme="light"
        onLogin={(result) => recordEvent('login', { ...result })}
        onBackupComplete={(result) => recordEvent('backup-complete', { ...result })}
        onSkip={() => recordEvent('skip')}
        onError={(error) => recordEvent('error', { ...error })}
      />
      <button type="button" onClick={() => setRestartCount((count) => count + 1)}>
        Restart widget
      </button>
      {/* Switches between the login flow and the logged-in user's backup flow, keeping the stored backups */}
      <button
        type="button"
        onClick={() => {
          setIsLoggedInUser((wasLoggedIn) => !wasLoggedIn)
          setRestartCount((count) => count + 1)
        }}
      >
        {isLoggedInUser ? 'Restart as logged-out user' : 'Restart as logged-in user'}
      </button>
      <EventLog lines={logLines} />
    </WidgetFrame>
  )
}

// ---------------------------------------------------------------------------
// Live story: real passkey, real Google Drive / iCloud
// ---------------------------------------------------------------------------

export interface LiveStoryArgs {
  googleClientId: string
  iCloudContainerId: string
  iCloudApiToken: string
  iCloudEnvironment: 'development' | 'production'
  /** Run the existing-user flow with a throwaway account key instead of the login flow. */
  backUpThrowawayAccount: boolean
}

/** A control value wins over the matching VITE_PASSKEY_* environment value. */
function pickControlOrEnvironment(controlValue: string, environmentValue: string | undefined): string {
  return controlValue.trim() !== '' ? controlValue.trim() : (environmentValue ?? '')
}

/** Random 32-byte hex key for the throwaway account; lives only in memory of this story. */
function createThrowawayPrivateKey(): HexString {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32))
  return `0x${Array.from(keyBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

/** Real WebAuthn and real providers; each provider is offered only when its configuration is present. */
export function LiveStory({
  googleClientId,
  iCloudContainerId,
  iCloudApiToken,
  iCloudEnvironment,
  backUpThrowawayAccount,
}: LiveStoryArgs) {
  const [logLines, setLogLines] = useState<EventLogLine[]>([])
  const throwawayPrivateKey = useMemo(() => createThrowawayPrivateKey(), [])

  const resolvedGoogleClientId = pickControlOrEnvironment(googleClientId, import.meta.env.VITE_PASSKEY_GOOGLE_CLIENT_ID)
  const resolvedContainerId = pickControlOrEnvironment(iCloudContainerId, import.meta.env.VITE_PASSKEY_ICLOUD_CONTAINER_ID)
  const resolvedApiToken = pickControlOrEnvironment(iCloudApiToken, import.meta.env.VITE_PASSKEY_ICLOUD_API_TOKEN)
  const resolvedEnvironment =
    (import.meta.env.VITE_PASSKEY_ICLOUD_ENVIRONMENT as LiveStoryArgs['iCloudEnvironment'] | undefined) ??
    iCloudEnvironment

  const isGoogleConfigured = resolvedGoogleClientId !== ''
  const isICloudConfigured = resolvedContainerId !== '' && resolvedApiToken !== ''

  const storage = useMemo<PasskeyBackupStorage[]>(
    () => [
      ...(isGoogleConfigured ? [createGoogleDriveStorage({ clientId: resolvedGoogleClientId })] : []),
      ...(isICloudConfigured
        ? [
            createICloudStorage({
              containerId: resolvedContainerId,
              apiToken: resolvedApiToken,
              environment: resolvedEnvironment,
            }),
          ]
        : []),
    ],
    [isGoogleConfigured, isICloudConfigured, resolvedGoogleClientId, resolvedContainerId, resolvedApiToken, resolvedEnvironment],
  )

  function recordEvent(name: string, detail?: Record<string, unknown>) {
    setLogLines((previousLines) => [...previousLines, { name, text: describeEvent(name, detail) }])
  }

  return (
    <WidgetFrame>
      <div data-testid="passkey-live-config" style={{ marginBottom: 12, fontSize: 12 }}>
        <div>Google Drive: {isGoogleConfigured ? 'configured' : 'not configured'}</div>
        <div>iCloud: {isICloudConfigured ? 'configured' : 'not configured'}</div>
      </div>
      {storage.length === 0 ? (
        <div>
          No backup provider is configured. Set the VITE_PASSKEY_* values or fill in the controls (see QA.md).
        </div>
      ) : (
        <PasskeyLoginWidget
          // Remount when the providers change so the flow starts from the right screens
          key={storage.map((provider) => provider.id).join('+')}
          storage={storage}
          rpId={window.location.hostname}
          appName="GoodWidget Storybook"
          privateKey={backUpThrowawayAccount ? throwawayPrivateKey : undefined}
          defaultTheme="light"
          onLogin={(result) => recordEvent('login', { ...result })}
          onBackupComplete={(result) => recordEvent('backup-complete', { ...result })}
          onSkip={() => recordEvent('skip')}
          onError={(error) => recordEvent('error', { ...error })}
        />
      )}
      <EventLog lines={logLines} />
    </WidgetFrame>
  )
}
