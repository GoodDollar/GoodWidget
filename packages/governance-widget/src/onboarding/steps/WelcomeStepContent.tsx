import React from 'react'
import { Card, YStack } from '@goodwidget/ui'
import { OnboardingNotice } from '../OnboardingNotice'
import type { GovernanceIdentityStatus } from '../../types'

interface WelcomeStepContentProps {
  identityStatus: GovernanceIdentityStatus
}

export function WelcomeStepContent({ identityStatus }: WelcomeStepContentProps) {
  const isVerified = identityStatus === 'verified'

  return (
    <YStack gap="$3">
      <Card elevated>
        <OnboardingNotice
          badgeLabel={isVerified ? 'Identity verified' : 'Verification required'}
          badgeType={isVerified ? 'success' : 'warning'}
          iconName={isVerified ? 'check' : 'alert-triangle'}
          title={
            isVerified
              ? 'You are ready to continue into governance onboarding.'
              : 'Complete identity verification before onboarding can continue.'
          }
          description={
            isVerified
              ? 'Your wallet can move to house selection and profile setup.'
              : 'The verify action stays available, but the proceed CTA remains disabled until verification succeeds.'
          }
        />
      </Card>
    </YStack>
  )
}
