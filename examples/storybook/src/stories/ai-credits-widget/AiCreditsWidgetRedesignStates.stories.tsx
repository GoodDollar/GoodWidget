import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import {
  AiCreditsRedesignTabs,
  AiCreditsSetupStatePanel,
  SignerKeyModal,
  AuthorizeWalletModal,
  ConnectTabPanel,
  type AiCreditsRedesignTabId,
  type SignerKeyModalStep,
} from '@goodwidget/ai-credits-widget'
import { Text, YStack } from '@goodwidget/ui'

function ScreenshotPlaceholder({ label }: { label: string }) {
  return (
    <YStack
      borderWidth={1}
      borderColor="$borderColor"
      borderStyle="dashed"
      borderRadius="$3"
      padding="$3"
    >
      <Text secondary fontSize="$2">
        Screenshot reference: {label}
      </Text>
    </YStack>
  )
}

const meta: Meta<typeof AiCreditsRedesignTabs> = {
  title: 'QA/AiCreditsWidget/Redesign States',
  component: AiCreditsRedesignTabs,
  tags: ['autodocs', 'qa'],
  parameters: {
    layout: 'padded',
    goodWidgetProvider: {
      disableProvider: true,
      useShell: false,
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const TabNavigation: Story = {
  args: {
    activeTab: 'setup',
    manageLocked: true,
    connectLocked: true,
  },
  argTypes: {
    activeTab: {
      control: 'select',
      options: ['setup', 'buy', 'manage', 'connect'] satisfies AiCreditsRedesignTabId[],
    },
    manageLocked: { control: 'boolean' },
    connectLocked: { control: 'boolean' },
  },
  render: ({ activeTab, manageLocked, connectLocked }) => (
    <YStack width={420} data-testid="AiCreditsWidget-redesign-tabs">
      <AiCreditsRedesignTabs
        activeTab={activeTab as AiCreditsRedesignTabId}
        manageLocked={manageLocked}
        connectLocked={connectLocked}
      />
    </YStack>
  ),
}

export const SetupState: Story = {
  args: {
    isWalletConnected: false,
    hasDownloadedAntseed: false,
    hasSignerKey: false,
    hasAuthorizedWallet: false,
  },
  argTypes: {
    isWalletConnected: { control: 'boolean' },
    hasDownloadedAntseed: { control: 'boolean' },
    hasSignerKey: { control: 'boolean' },
    hasAuthorizedWallet: { control: 'boolean' },
  },
  render: ({ isWalletConnected, hasDownloadedAntseed, hasSignerKey, hasAuthorizedWallet }) => (
    <YStack width={420} data-testid="AiCreditsWidget-redesign-setup">
      <AiCreditsSetupStatePanel
        isWalletConnected={Boolean(isWalletConnected)}
        hasDownloadedAntseed={Boolean(hasDownloadedAntseed)}
        hasSignerKey={Boolean(hasSignerKey)}
        hasAuthorizedWallet={Boolean(hasAuthorizedWallet)}
      />
    </YStack>
  ),
}

export const SignerKeyModalStates: Story = {
  args: {
    step: 'select',
    signerKeyValue: '0x6a3b63c2f61731cce1e4d4cfdf2f57b10af6fbe2f2dce5e4fcb6d2180aef15a2',
    isLoading: false,
  },
  argTypes: {
    step: {
      control: 'select',
      options: ['select', 'generate', 'import'] satisfies SignerKeyModalStep[],
    },
    signerKeyValue: { control: 'text' },
    isLoading: { control: 'boolean' },
  },
  render: ({ step, signerKeyValue, isLoading }) => (
    <YStack width={420} data-testid="AiCreditsWidget-redesign-signer-modal">
      <SignerKeyModal
        step={step as SignerKeyModalStep}
        signerKeyValue={signerKeyValue}
        isLoading={isLoading}
        generateReferenceContent={
          <YStack gap="$2">
            <ScreenshotPlaceholder label="AntSeed import screen" />
            <ScreenshotPlaceholder label="AntSeed export backup screen" />
          </YStack>
        }
        importReferenceContent={<ScreenshotPlaceholder label="AntSeed export signer key screen" />}
      />
    </YStack>
  ),
}

export const AuthorizeWalletModalState: Story = {
  args: {
    status: 'pending',
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['pending', 'approved'],
    },
  },
  render: ({ status }) => (
    <YStack width={420} data-testid="AiCreditsWidget-redesign-authorize-modal">
      <AuthorizeWalletModal status={status as 'pending' | 'approved'} />
    </YStack>
  ),
}

export const ConnectTabState: Story = {
  args: {
    hasDownloadedAntseed: false,
  },
  argTypes: {
    hasDownloadedAntseed: { control: 'boolean' },
  },
  render: ({ hasDownloadedAntseed }) => (
    <YStack width={420} data-testid="AiCreditsWidget-redesign-connect-tab">
      <ConnectTabPanel hasDownloadedAntseed={Boolean(hasDownloadedAntseed)} />
    </YStack>
  ),
}
