import React from 'react'
import {
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Card,
  Heading,
  Icon,
  Input,
  Stepper,
  Text,
  WidgetTabs,
  XStack,
  YStack,
  type StepperStepItem,
} from '@goodwidget/ui'

export type AiCreditsRedesignTabId = 'setup' | 'buy' | 'manage' | 'connect'

interface AiCreditsRedesignTabsProps {
  activeTab: AiCreditsRedesignTabId
  manageLocked?: boolean
  connectLocked?: boolean
  onTabChange?: (tab: AiCreditsRedesignTabId) => void
}

interface SetupStepState {
  completed: boolean
  enabled: boolean
}

function resolveSetupStepStatus(step: SetupStepState): StepperStepItem['status'] {
  if (step.completed) return 'completed'
  if (!step.enabled) return 'pending'
  return 'ready'
}

export function AiCreditsRedesignTabs({
  activeTab,
  manageLocked = false,
  connectLocked = false,
  onTabChange,
}: AiCreditsRedesignTabsProps) {
  const lockByTabId: Partial<Record<AiCreditsRedesignTabId, boolean>> = {
    manage: manageLocked,
    connect: connectLocked,
  }

  return (
    <WidgetTabs
      withConnectionStatus={false}
      tabs={[
        { id: 'setup', label: 'Setup' },
        { id: 'buy', label: 'Buy' },
        { id: 'manage', label: 'Manage' },
        { id: 'connect', label: 'Connect' },
      ]}
      activeTab={activeTab}
      onTabChange={(tabId) => {
        const tab = tabId as AiCreditsRedesignTabId
        if (lockByTabId[tab]) return
        onTabChange?.(tab)
      }}
      renderLabel={(tab, isActive) => {
        const tabId = tab.id as AiCreditsRedesignTabId
        const locked = Boolean(lockByTabId[tabId])
        return (
          <XStack alignItems="center" gap="$2">
            {locked && <Icon name="lock" size="xs" color="muted" />}
            <Text variant="label" color={isActive ? '$textColor' : '$placeholderColor'}>
              {tab.label}
            </Text>
          </XStack>
        )
      }}
    />
  )
}

interface AiCreditsSetupStatePanelProps {
  isWalletConnected: boolean
  hasDownloadedAntseed: boolean
  hasSignerKey: boolean
  hasAuthorizedWallet: boolean
}

export function AiCreditsSetupStatePanel({
  isWalletConnected,
  hasDownloadedAntseed,
  hasSignerKey,
  hasAuthorizedWallet,
}: AiCreditsSetupStatePanelProps) {
  if (!isWalletConnected) {
    return (
      <Card gap="$3">
        <Heading level={5}>Setup</Heading>
        <Text secondary>
          Connect your wallet to unlock Setup, then continue with Signer key and Authorize wallet
          before using Manage and Connect.
        </Text>
      </Card>
    )
  }

  const downloadStep: SetupStepState = { completed: hasDownloadedAntseed, enabled: true }
  const signerStep: SetupStepState = {
    completed: hasSignerKey,
    enabled: hasDownloadedAntseed,
  }
  const authorizeStep: SetupStepState = {
    completed: hasAuthorizedWallet,
    enabled: hasDownloadedAntseed && hasSignerKey,
  }

  const steps: StepperStepItem[] = [
    {
      id: 'download-antseed',
      title: 'Download AntSeed',
      description: 'Install AntSeed once before continuing to Signer key setup.',
      status: resolveSetupStepStatus(downloadStep),
    },
    {
      id: 'signer-key',
      title: 'Signer key',
      description: 'Generate or import your AntSeed signer key for AI chat and coding tools.',
      status: resolveSetupStepStatus(signerStep),
    },
    {
      id: 'authorize-wallet',
      title: 'Authorize wallet',
      description: 'Approve revocable permissions for AntSeed purchases and management.',
      status: resolveSetupStepStatus(authorizeStep),
    },
  ]

  return (
    <Card gap="$3">
      <Heading level={5}>Setup</Heading>
      <Stepper steps={steps} />
    </Card>
  )
}

export type SignerKeyModalStep = 'select' | 'generate' | 'import'

interface SignerKeyModalProps {
  step: SignerKeyModalStep
  signerKeyValue?: string
  isLoading?: boolean
  generateReferenceContent?: React.ReactNode
  importReferenceContent?: React.ReactNode
}

export function SignerKeyModal({
  step,
  signerKeyValue = '',
  isLoading = false,
  generateReferenceContent = null,
  importReferenceContent = null,
}: SignerKeyModalProps) {
  if (step === 'select') {
    return (
      <Card gap="$3">
        <Heading level={5}>Signer key</Heading>
        <Text secondary>Choose how you want to continue with your AntSeed signer key.</Text>
        <YStack gap="$3">
          <Card gap="$2" backgroundColor="$backgroundHover">
            <Heading level={6}>Generate new signer key</Heading>
            <Text secondary>Create a new signer key and save it for backup before importing.</Text>
            <Button size="sm">
              <ButtonText>Generate path</ButtonText>
            </Button>
          </Card>
          <Card gap="$2" backgroundColor="$backgroundHover">
            <Heading level={6}>Import existing AntSeed signer key</Heading>
            <Text secondary>Use a signer key you already exported from AntSeed.</Text>
            <Button size="sm" variant="outline">
              <ButtonText>Import path</ButtonText>
            </Button>
          </Card>
        </YStack>
      </Card>
    )
  }

  if (step === 'generate') {
    return (
      <Card gap="$3">
        <Heading level={5}>Generate signer key</Heading>
        <Text secondary>Generate a signer key, copy it, then back it up before importing into AntSeed.</Text>
        <YStack gap="$2">
          <Text variant="label" secondary>
            Signer key
          </Text>
          <XStack alignItems="center" gap="$2">
            <Input value={signerKeyValue} readOnly placeholder="0x..." flex={1} />
            <Button size="sm" disabled={isLoading || signerKeyValue.length === 0}>
              <ButtonText>{isLoading ? 'Copying…' : 'Copy'}</ButtonText>
            </Button>
          </XStack>
        </YStack>
        <Text color="$warning" fontSize="$2">
          Backup this key before import. Treat it like a wallet secret.
        </Text>
        {generateReferenceContent}
      </Card>
    )
  }

  return (
    <Card gap="$3">
      <Heading level={5}>Import signer key</Heading>
      <Text secondary>Export your signer key from AntSeed, then paste it below.</Text>
      {importReferenceContent}
      <YStack gap="$2">
        <Text variant="label" secondary>
          Paste signer key
        </Text>
        <XStack alignItems="center" gap="$2">
          <Input placeholder="Paste signer key" flex={1} />
          <Button size="sm" variant="outline" iconSize="sm">
            <Icon name="clipboard-paste" size="xs" />
            <ButtonText>Paste</ButtonText>
          </Button>
        </XStack>
      </YStack>
    </Card>
  )
}

interface AuthorizeWalletModalProps {
  status: 'pending' | 'approved'
}

export function AuthorizeWalletModal({ status }: AuthorizeWalletModalProps) {
  const isApproved = status === 'approved'

  return (
    <Card gap="$3">
      <XStack justifyContent="space-between" alignItems="center">
        <Heading level={5}>Authorize wallet</Heading>
        <Badge type={isApproved ? 'success' : 'warning'}>
          <BadgeText>{isApproved ? 'Approved' : 'Pending approval'}</BadgeText>
        </Badge>
      </XStack>

      <Text secondary>
        This is a standard wallet approval and can be revoked later from your wallet settings.
      </Text>

      <YStack gap="$2">
        <Text fontWeight="700">Can</Text>
        <Text secondary>• Enable AntSeed purchase and management actions for your signer key.</Text>
        <Text secondary>• Be revoked at any time.</Text>
      </YStack>

      <YStack gap="$2">
        <Text fontWeight="700">Cannot</Text>
        <Text secondary>• Spend funds outside the approved flow.</Text>
        <Text secondary>• Change your wallet ownership or private keys.</Text>
      </YStack>
    </Card>
  )
}

interface ConnectTabPanelProps {
  hasDownloadedAntseed: boolean
}

export function ConnectTabPanel({ hasDownloadedAntseed }: ConnectTabPanelProps) {
  return (
    <Card gap="$3">
      <Heading level={5}>Connect</Heading>
      {hasDownloadedAntseed ? (
        <Text secondary>
          AntSeed is already downloaded in Setup step 1. Continue connecting your AI chat and coding
          tools without downloading again.
        </Text>
      ) : (
        <Text secondary>
          Download AntSeed in Setup before connecting your AI chat and coding tools.
        </Text>
      )}
    </Card>
  )
}
