import { YStack } from '@goodwidget/ui'
import { OnboardingIdentityCard } from '../OnboardingIdentityCard'
import type { GovernanceIdentityStatus } from '../../types'

interface WelcomeStepContentProps {
  identityStatus: GovernanceIdentityStatus
  walletAddress?: string
  isIdentityVerified: boolean
  onProceedPress?: () => void
}

export function WelcomeStepContent({
  identityStatus,
  walletAddress,
  isIdentityVerified,
  onProceedPress,
}: WelcomeStepContentProps) {
  return (
    <YStack gap="$3">
      <OnboardingIdentityCard
        identityStatus={identityStatus}
        walletAddress={walletAddress}
        onProceedPress={isIdentityVerified ? onProceedPress : undefined}
      />
    </YStack>
  )
}
