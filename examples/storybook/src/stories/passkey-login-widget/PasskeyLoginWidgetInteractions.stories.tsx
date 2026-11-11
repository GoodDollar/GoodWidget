import type { Meta, StoryObj } from '@storybook/react'
import { PasskeyLoginWidget } from '@goodwidget/passkey-login-widget'
import { InteractionHarnessStory, type InteractionHarnessOptions } from '../helpers/passkeyLoginWidgetStories'

/**
 * The real widget (real crypto and flow state machine) on in-memory backup storage. The browser's WebAuthn
 * is mocked by the Playwright specs (virtual authenticator); open these stories by hand only with a real
 * authenticator that supports the PRF extension. The "Restart widget" button remounts the widget while the
 * stored backups stay, which is the round trip from "create and back up" to "log in with the same passkey".
 */
const meta: Meta<InteractionHarnessOptions> = {
  title: 'QA/PasskeyLoginWidget/Interactions',
  component: PasskeyLoginWidget as unknown as React.ComponentType<InteractionHarnessOptions>,
  tags: ['qa'],
  parameters: { layout: 'padded' },
  render: (harnessOptions) => <InteractionHarnessStory {...harnessOptions} />,
}

export default meta
type Story = StoryObj<InteractionHarnessOptions>

export const OneProvider: Story = {
  name: 'Login and create (Google Drive only)',
  args: { providerIds: ['google-drive'] },
}

export const TwoProviders: Story = {
  name: 'Login and create (Google Drive and iCloud)',
  args: { providerIds: ['google-drive', 'icloud'] },
}

export const ExistingUserOneProvider: Story = {
  name: 'Existing user backup (Google Drive only)',
  args: { providerIds: ['google-drive'], isExistingUser: true },
}

export const ExistingUserTwoProviders: Story = {
  name: 'Existing user backup (Google Drive and iCloud)',
  args: { providerIds: ['google-drive', 'icloud'], isExistingUser: true },
}
