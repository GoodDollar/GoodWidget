import type { Meta, StoryObj } from '@storybook/react'
import { PasskeyLoginWidgetPreview } from '@goodwidget/passkey-login-widget'
import { ScreenFixtureStory, type ScreenFixtureOptions } from '../helpers/passkeyLoginWidgetStories'

/**
 * One fixture per screen of the designs (A1-D6), rendered from a fixed adapter result:
 * no WebAuthn, no storage. The theme is a control (`themeMode`), so the Playwright states spec
 * opens every fixture in light and dark through the `args` URL parameter.
 */
const meta: Meta<ScreenFixtureOptions> = {
  title: 'QA/PasskeyLoginWidget/Screen Fixtures',
  component: PasskeyLoginWidgetPreview as unknown as React.ComponentType<ScreenFixtureOptions>,
  tags: ['qa'],
  parameters: { layout: 'padded' },
  args: { themeMode: 'light' },
  argTypes: {
    themeMode: { control: 'inline-radio', options: ['light', 'dark'] },
  },
  render: (fixtureOptions) => <ScreenFixtureStory {...fixtureOptions} />,
}

export default meta
type Story = StoryObj<ScreenFixtureOptions>

// ---- A: login / create account ----
export const A1Entry: Story = { name: 'A1 Entry', args: { screen: 'A1_ENTRY' } }
export const A2Authenticating: Story = { name: 'A2 Authenticating', args: { screen: 'A2_AUTHENTICATING' } }
export const A3NewAccountWarning: Story = {
  name: 'A3 New account warning',
  args: { screen: 'A3_NEW_ACCOUNT_WARNING' },
}
export const A4CreatePasskey: Story = { name: 'A4 Create passkey', args: { screen: 'A4_CREATE_PASSKEY' } }

// ---- B: back up ----
export const B1BackupPrompt: Story = {
  name: 'B1 Backup prompt (existing user)',
  args: { screen: 'B1_BACKUP_PROMPT', isExistingUser: true, flowState: { flowKind: 'backup' } },
}
export const B2BackupProvider: Story = {
  name: 'B2 Backup provider',
  args: { screen: 'B2_BACKUP_PROVIDER', flowState: { flowKind: 'new-account' } },
}
export const B3BackupProgress: Story = {
  name: 'B3 Backup progress',
  args: {
    screen: 'B3_BACKUP_PROGRESS',
    flowState: { flowKind: 'new-account', providerId: 'google-drive', progressStepIndex: 2 },
  },
}
export const B4BackupSuccess: Story = {
  name: 'B4 Backup success',
  args: { screen: 'B4_BACKUP_SUCCESS', flowState: { flowKind: 'new-account', providerId: 'google-drive' } },
}

// ---- C: restore ----
export const C1RestoreProvider: Story = { name: 'C1 Restore provider', args: { screen: 'C1_RESTORE_PROVIDER' } }
export const C2RestoreProgress: Story = {
  name: 'C2 Restore progress',
  args: { screen: 'C2_RESTORE_PROGRESS', flowState: { providerId: 'google-drive', progressStepIndex: 1 } },
}
export const C3RestoreSuccess: Story = {
  name: 'C3 Restore success',
  args: { screen: 'C3_RESTORE_SUCCESS', flowState: { providerId: 'google-drive' } },
}

// ---- D: errors ----
export const D1UnsupportedBrowser: Story = {
  name: 'D1 Unsupported browser',
  args: { screen: 'D1_UNSUPPORTED_BROWSER', flowState: { errorCode: 'UNSUPPORTED_BROWSER' } },
}
export const D2PasskeyCancelled: Story = {
  name: 'D2 Passkey cancelled (login)',
  args: {
    screen: 'D2_PASSKEY_CANCELLED',
    flowState: { errorCode: 'PASSKEY_CANCELLED', failedScreen: 'A2_AUTHENTICATING' },
  },
}
export const D2PasskeyFailed: Story = {
  name: 'D2 Passkey request failed (new account)',
  args: {
    screen: 'D2_PASSKEY_CANCELLED',
    flowState: { errorCode: 'PASSKEY_FAILED', failedScreen: 'A4_CREATE_PASSKEY' },
  },
}
export const D3BackupNotFound: Story = {
  name: 'D3 Backup not found (two providers)',
  args: {
    screen: 'D3_BACKUP_NOT_FOUND',
    flowState: { errorCode: 'BACKUP_NOT_FOUND', providerId: 'google-drive', failedScreen: 'C2_RESTORE_PROGRESS' },
  },
}
export const D3BackupNotFoundSingleProvider: Story = {
  name: 'D3 Backup not found (one provider)',
  args: {
    screen: 'D3_BACKUP_NOT_FOUND',
    hasMultipleProviders: false,
    flowState: { errorCode: 'BACKUP_NOT_FOUND', providerId: 'google-drive', failedScreen: 'C2_RESTORE_PROGRESS' },
  },
}
export const D4ProviderAuthFailed: Story = {
  name: 'D4 Provider sign-in failed',
  args: {
    screen: 'D4_PROVIDER_AUTH_FAILED',
    flowState: { errorCode: 'PROVIDER_AUTH_FAILED', providerId: 'google-drive', failedScreen: 'C2_RESTORE_PROGRESS' },
  },
}
export const D5BackupFailedNewUser: Story = {
  name: 'D5 Backup failed (new user)',
  args: {
    screen: 'D5_BACKUP_FAILED',
    flowState: { errorCode: 'BACKUP_FAILED', flowKind: 'new-account', providerId: 'google-drive', failedScreen: 'B3_BACKUP_PROGRESS' },
  },
}
export const D5BackupFailedExistingUser: Story = {
  name: 'D5 Backup failed (existing user, can skip)',
  args: {
    screen: 'D5_BACKUP_FAILED',
    isExistingUser: true,
    flowState: { errorCode: 'BACKUP_FAILED', flowKind: 'backup', providerId: 'google-drive', failedScreen: 'B3_BACKUP_PROGRESS' },
  },
}
export const D6DecryptFailed: Story = {
  name: 'D6 Decrypt failed',
  args: {
    screen: 'D6_DECRYPT_FAILED',
    flowState: { errorCode: 'DECRYPT_FAILED', providerId: 'google-drive', failedScreen: 'C2_RESTORE_PROGRESS' },
  },
}
export const D6AmbiguousBackup: Story = {
  name: 'D6 Ambiguous backup (D6 layout)',
  args: {
    screen: 'D6_DECRYPT_FAILED',
    flowState: { errorCode: 'AMBIGUOUS_BACKUP', providerId: 'google-drive', failedScreen: 'C2_RESTORE_PROGRESS' },
  },
}
