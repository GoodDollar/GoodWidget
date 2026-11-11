import type { Meta, StoryObj } from '@storybook/react'
import { PasskeyLoginWidget } from '@goodwidget/passkey-login-widget'
import { LiveStory, type LiveStoryArgs } from '../helpers/passkeyLoginWidgetStories'

/**
 * Manual QA with a real passkey and the real Google Drive / iCloud providers. Tagged `manual`, so it is hidden
 * from the default Storybook filter and from the automated suites. Values come from the controls or from the
 * VITE_PASSKEY_* environment variables (a control wins); a provider without values is not offered.
 * Use a throwaway Google / Apple account: the story writes real backups.
 */
const meta: Meta<LiveStoryArgs> = {
  title: 'QA/PasskeyLoginWidget/Live (real passkey + real providers)',
  component: PasskeyLoginWidget as unknown as React.ComponentType<LiveStoryArgs>,
  tags: ['manual'],
  parameters: { layout: 'padded' },
  args: {
    googleClientId: '',
    iCloudContainerId: '',
    iCloudApiToken: '',
    iCloudEnvironment: 'development',
    backUpThrowawayAccount: false,
  },
  argTypes: {
    googleClientId: { control: 'text', description: 'Google OAuth Web client ID (VITE_PASSKEY_GOOGLE_CLIENT_ID)' },
    iCloudContainerId: { control: 'text', description: 'CloudKit container (VITE_PASSKEY_ICLOUD_CONTAINER_ID)' },
    iCloudApiToken: { control: 'text', description: 'CloudKit API token (VITE_PASSKEY_ICLOUD_API_TOKEN)' },
    iCloudEnvironment: {
      control: 'inline-radio',
      options: ['development', 'production'],
      description: 'CloudKit environment (VITE_PASSKEY_ICLOUD_ENVIRONMENT wins when set)',
    },
    backUpThrowawayAccount: {
      control: 'boolean',
      description: 'Run the existing-user backup flow with a random throwaway key instead of the login flow',
    },
  },
  render: (liveArgs) => <LiveStory {...liveArgs} />,
}

export default meta
type Story = StoryObj<LiveStoryArgs>

export const Live: Story = { name: 'Live' }
