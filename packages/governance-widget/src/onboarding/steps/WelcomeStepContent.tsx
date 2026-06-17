import React from 'react'
import { YStack } from '@goodwidget/ui'
import { OnboardingIdentityCard } from '../OnboardingIdentityCard'
import type { GovernanceIdentityStatus } from '../../types'

interface WelcomeStepContentProps {
  identityStatus: GovernanceIdentityStatus
  walletAddress?: string
  onVerifyPress?: () => void
}

export function WelcomeStepContent({ identityStatus, walletAddress, onVerifyPress }: WelcomeStepContentProps) {
  return (
    <YStack gap="$3">
      <OnboardingIdentityCard
        identityStatus={identityStatus}
        walletAddress={walletAddress}
        onVerifyPress={onVerifyPress}
      />
    </YStack>
  )
}
