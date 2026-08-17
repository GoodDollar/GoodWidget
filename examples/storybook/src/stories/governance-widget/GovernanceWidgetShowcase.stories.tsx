import type { Meta, StoryObj } from '@storybook/react'
import { Card, Text, YStack } from '@goodwidget/ui'
import { GovernanceWidget } from '@goodwidget/governance-widget'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'

// The GoodDaoHouses contract is not yet on the production Celo deployment — this is the
// `development-celo` address recorded in GoodProtocol PR #300 (GoodProtocol PR #299 has the
// final contract build this widget targets). FlowSplitter isn't wired to this deployment yet,
// so the funding-distribution chart is expected to render its empty state here.
const DEV_CELO_HOUSES_ADDRESS = '0x4Bc3Cdc036f21b68E034C0f1d90775fc3D725735' as const

interface GovernanceWidgetStoryArgs {
  defaultTheme: 'light' | 'dark'
}

const meta: Meta<GovernanceWidgetStoryArgs> = {
  title: 'Widgets/GovernanceWidget/Showcase',
  component: GovernanceWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['dark', 'light'],
      description: 'Base theme applied via the widget’s own defaultTheme prop.',
    },
  },
  args: {
    defaultTheme: 'dark',
  },
}

export default meta
type Story = StoryObj<GovernanceWidgetStoryArgs>

function InjectedWalletStory({ defaultTheme }: GovernanceWidgetStoryArgs) {
  const injectedProvider = getInjectedEip1193Provider()

  if (!isInjectedProviderUsable(injectedProvider)) {
    return (
      <YStack width={440} gap="$3" data-testid="GovernanceWidget-showcase-no-wallet">
        <Card>
          <Text bold>No injected wallet found</Text>
          <Text tone="secondary">
            Install or enable an injected EIP-1193 wallet on Celo, then refresh Storybook.
          </Text>
        </Card>
      </YStack>
    )
  }

  return (
    <GovernanceWidget
      provider={injectedProvider}
      defaultTheme={defaultTheme}
      addresses={{ housesAddress: DEV_CELO_HOUSES_ADDRESS }}
      testId="GovernanceWidget-showcase-injected"
    />
  )
}

function CustodialWalletStory({ defaultTheme }: GovernanceWidgetStoryArgs) {
  try {
    const provider = createCustodialEip1193Provider()

    return (
      <GovernanceWidget
        provider={provider}
        defaultTheme={defaultTheme}
        addresses={{ housesAddress: DEV_CELO_HOUSES_ADDRESS }}
        testId="GovernanceWidget-showcase-custodial"
      />
    )
  } catch (error: unknown) {
    return (
      <YStack width={440} gap="$3" data-testid="GovernanceWidget-showcase-custodial-config-error">
        <Card>
          <Text bold>Custodial fixture not configured</Text>
          <Text tone="secondary">
            {error instanceof Error ? error.message : 'Set a local private key in custodialEip1193.ts'}
          </Text>
        </Card>
      </YStack>
    )
  }
}

// Real wallet, real dev-celo GoodDaoHouses contract, no mocked reads or writes — this is the
// live integrator-facing surface, deliberately kept separate from the QA fixtures/mocked flow.
export const InjectedWallet: Story = {
  render: ({ defaultTheme }) => <InjectedWalletStory defaultTheme={defaultTheme} />,
}

export const CustodialWallet: Story = {
  render: ({ defaultTheme }) => <CustodialWalletStory defaultTheme={defaultTheme} />,
}
