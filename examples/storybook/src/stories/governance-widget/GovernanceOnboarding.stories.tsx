import type { ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Card, Text, YStack } from '@goodwidget/ui'
import {
  GovernanceOnboardingWidget,
  governanceWidgetConfig,
  type GovernanceOnboardingWidgetProps,
} from '@goodwidget/governance-widget'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'

const meta: Meta<typeof GovernanceOnboardingWidget> = {
  title: 'Widgets/GovernanceOnboarding',
  component: GovernanceOnboardingWidget,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    goodWidgetProvider: { useShell: false, config: governanceWidgetConfig },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const failedTransactionSteps = [
  {
    id: 'prepare',
    title: 'Prepare wallet balance',
    status: 'completed',
  },
  {
    id: 'approve',
    title: 'Approve governance stake',
    status: 'completed',
  },
  {
    id: 'stake',
    title: 'Lock the membership stake',
    description: 'The previous transaction failed and needs a retry from the wallet.',
    status: 'failed',
  },
  {
    id: 'finalize',
    title: 'Finalize governance access',
    status: 'pending',
  },
] as const

function GovernanceStoryFrame({
  walletLabel,
  children,
  dataTestId,
  width = 440,
}: {
  walletLabel: string
  children: ReactNode
  dataTestId: string
  width?: number
}) {
  return (
    <YStack width={width} maxWidth="100%" gap="$3" data-testid={dataTestId}>
      <Card outlined>
        <Text variant="caption" tone="secondary">
          {walletLabel}
        </Text>
      </Card>
      {children}
    </YStack>
  )
}

function InjectedGovernanceStory({
  walletLabel,
  storyProps,
  dataTestId,
}: {
  walletLabel: string
  storyProps: GovernanceOnboardingWidgetProps
  dataTestId: string
}) {
  const injectedProvider = getInjectedEip1193Provider()
  const usableProvider = isInjectedProviderUsable(injectedProvider)

  if (!usableProvider) {
    return (
      <YStack width={440} gap="$3" data-testid="GovernanceOnboardingWidget-no-wallet">
        <Card>
          <Text bold>No injected wallet found</Text>
          <Text tone="secondary">
            Install or enable an injected EIP-1193 wallet in this browser, then refresh Storybook.
          </Text>
        </Card>
      </YStack>
    )
  }

  return (
    <GovernanceStoryFrame walletLabel={walletLabel} dataTestId={dataTestId}>
      <GovernanceOnboardingWidget {...storyProps} />
    </GovernanceStoryFrame>
  )
}

function CustodialGovernanceStory({
  walletLabel,
  storyProps,
  dataTestId,
  width,
}: {
  walletLabel: string
  storyProps: GovernanceOnboardingWidgetProps
  dataTestId: string
  width?: number
}) {
  try {
    createCustodialEip1193Provider()

    return (
      <GovernanceStoryFrame walletLabel={walletLabel} dataTestId={dataTestId} width={width}>
        <GovernanceOnboardingWidget {...storyProps} />
      </GovernanceStoryFrame>
    )
  } catch (error: unknown) {
    return (
      <YStack width={width ?? 440} gap="$3" data-testid="GovernanceOnboardingWidget-custodial-config-error">
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

export const InjectedWelcomeUnverified: Story = {
  render: () => (
    <InjectedGovernanceStory
      walletLabel="Injected wallet fixture"
      dataTestId="GovernanceOnboardingWidget-injected-unverified"
      storyProps={{
        currentStepId: 'welcome',
        identityStatus: 'unverified',
        dataTestId: 'GovernanceOnboardingWidget-welcome-unverified',
      }}
    />
  ),
}

export const CustodialInteractiveFlow: Story = {
  render: () => (
    <CustodialGovernanceStory
      walletLabel="Custodial wallet fixture"
      dataTestId="GovernanceOnboardingWidget-custodial-interactive"
      storyProps={{
        identityStatus: 'verified',
        initialStepId: 'welcome',
        walletAddress: '0x4E5B2D7a45C2e31a8F0d09b4bE1fA11aD3aC9F08',
        dataTestId: 'GovernanceOnboardingWidget-interactive-flow',
      }}
    />
  ),
}

export const CustodialWelcomeUnverified: Story = {
  render: () => (
    <CustodialGovernanceStory
      walletLabel="Custodial wallet fixture"
      dataTestId="GovernanceOnboardingWidget-custodial-unverified"
      storyProps={{
        currentStepId: 'welcome',
        identityStatus: 'unverified',
        walletAddress: '0x4E5B2D7a45C2e31a8F0d09b4bE1fA11aD3aC9F08',
        dataTestId: 'GovernanceOnboardingWidget-welcome-unverified-custodial',
      }}
    />
  ),
}

export const CustodialHouseSelection: Story = {
  render: () => (
    <CustodialGovernanceStory
      walletLabel="Custodial wallet fixture"
      dataTestId="GovernanceOnboardingWidget-custodial-house"
      storyProps={{
        currentStepId: 'house',
        identityStatus: 'verified',
        dataTestId: 'GovernanceOnboardingWidget-house-selection',
      }}
    />
  ),
}

export const CustodialCitizenshipProfileReady: Story = {
  render: () => (
    <CustodialGovernanceStory
      walletLabel="Custodial wallet fixture"
      dataTestId="GovernanceOnboardingWidget-custodial-citizenship-profile"
      storyProps={{
        currentStepId: 'profile',
        identityStatus: 'verified',
        initialHouse: 'citizenship',
        initialProfileDraft: {
          name: 'Maya Citizen',
          socialLinks: 'https://twitter.com/gooddollar',
        },
        dataTestId: 'GovernanceOnboardingWidget-citizenship-profile-ready',
      }}
    />
  ),
}

export const CustodialAlignmentProfileError: Story = {
  parameters: {
    goodWidgetProvider: { useShell: false, defaultTheme: 'dark' },
  },
  render: () => (
    <CustodialGovernanceStory
      walletLabel="Custodial wallet fixture"
      dataTestId="GovernanceOnboardingWidget-custodial-alignment-profile"
      storyProps={{
        currentStepId: 'profile',
        identityStatus: 'verified',
        initialHouse: 'alignment',
        initialProfileDraft: {
          name: 'Solar Commons',
        },
        initialFieldErrors: {
          projectWebpage: 'Project webpage is required',
          missionStatement: 'Mission statement is required',
          distributionStrategy: 'Distribution strategy is required',
        },
        dataTestId: 'GovernanceOnboardingWidget-alignment-profile-error',
      }}
    />
  ),
}

export const CustodialStakeProgress: Story = {
  parameters: {
    goodWidgetProvider: { useShell: false, defaultTheme: 'dark' },
  },
  render: () => (
    <CustodialGovernanceStory
      walletLabel="Custodial wallet fixture"
      dataTestId="GovernanceOnboardingWidget-custodial-stake"
      storyProps={{
        currentStepId: 'stake',
        identityStatus: 'verified',
        initialHouse: 'alignment',
        transactionSteps: [...failedTransactionSteps],
        dataTestId: 'GovernanceOnboardingWidget-stake-progress',
      }}
    />
  ),
}

export const CustodialSuccess: Story = {
  parameters: {
    goodWidgetProvider: { useShell: false, config: governanceWidgetConfig },
  },
  render: () => (
    <CustodialGovernanceStory
      walletLabel="Custodial wallet fixture"
      dataTestId="GovernanceOnboardingWidget-custodial-success"
      storyProps={{
        currentStepId: 'success',
        identityStatus: 'verified',
        initialHouse: 'alignment',
        // Figma: proposals = primary (white bg, blue text), profile = secondary (transparent, white text)
        finalActions: [
          { id: 'proposals', label: 'Explore Governance Proposals', variant: 'primary' },
          { id: 'profile', label: 'Go to my profile', variant: 'secondary' },
        ],
        dataTestId: 'GovernanceOnboardingWidget-success',
      }}
    />
  ),
}

/** Dark-theme welcome — demonstrates theme mapping works for the identity card */
export const CustodialDarkWelcomeVerified: Story = {
  parameters: {
    goodWidgetProvider: { useShell: false, config: governanceWidgetConfig, defaultTheme: 'dark' },
  },
  render: () => (
    <CustodialGovernanceStory
      walletLabel="Custodial wallet fixture"
      dataTestId="GovernanceOnboardingWidget-custodial-dark-welcome"
      storyProps={{
        currentStepId: 'welcome',
        identityStatus: 'verified',
        dataTestId: 'GovernanceOnboardingWidget-dark-welcome',
      }}
    />
  ),
}

/** Dark-theme house selection — demonstrates house card and radio-bullet theme mapping */
export const CustodialDarkHouseSelection: Story = {
  parameters: {
    goodWidgetProvider: { useShell: false, config: governanceWidgetConfig, defaultTheme: 'dark' },
  },
  render: () => (
    <CustodialGovernanceStory
      walletLabel="Custodial wallet fixture"
      dataTestId="GovernanceOnboardingWidget-custodial-dark-house"
      storyProps={{
        currentStepId: 'house',
        identityStatus: 'verified',
        dataTestId: 'GovernanceOnboardingWidget-dark-house',
      }}
    />
  ),
}

function CustodialGovernanceStoryAtWidth({
  walletLabel,
  storyProps,
  dataTestId,
  width,
}: {
  walletLabel: string
  storyProps: GovernanceOnboardingWidgetProps
  dataTestId: string
  width: number
}) {
  return (
    <CustodialGovernanceStory
      walletLabel={walletLabel}
      dataTestId={dataTestId}
      storyProps={{
        ...storyProps,
        dataTestId,
      }}
      width={width}
    />
  )
}

export const CustodialMobileWelcome: Story = {
  parameters: {
    goodWidgetProvider: { useShell: false, defaultTheme: 'light' },
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => (
    <CustodialGovernanceStoryAtWidth
      walletLabel="Custodial wallet fixture"
      dataTestId="GovernanceOnboardingWidget-mobile-welcome"
      width={328}
      storyProps={{
        currentStepId: 'welcome',
        identityStatus: 'verified',
      }}
    />
  ),
}

export const CustodialMobileDarkProfile: Story = {
  parameters: {
    goodWidgetProvider: { useShell: false, defaultTheme: 'dark' },
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => (
    <CustodialGovernanceStoryAtWidth
      walletLabel="Custodial wallet fixture"
      dataTestId="GovernanceOnboardingWidget-mobile-dark-profile"
      width={328}
      storyProps={{
        currentStepId: 'profile',
        identityStatus: 'verified',
        initialHouse: 'alignment',
        initialProfileDraft: { name: 'Solar Commons' },
        initialFieldErrors: {
          projectWebpage: 'Project webpage is required',
          missionStatement: 'Mission statement is required',
          distributionStrategy: 'Distribution strategy is required',
        },
      }}
    />
  ),
}
