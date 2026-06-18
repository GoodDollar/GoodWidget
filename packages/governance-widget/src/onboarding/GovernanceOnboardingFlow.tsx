import React, { useState } from 'react'
import { Button, ButtonText, PageWizardShell, XStack, usePageWizard } from '@goodwidget/ui'
import { HOUSE_COPY } from './copy'
import { DEFAULT_TRANSACTION_STEPS, DEFAULT_FINAL_ACTIONS } from './constants'
import { isProfileDraftComplete, validateProfileDraft } from './validation'
import { WelcomeStepContent } from './steps/WelcomeStepContent'
import { HouseStepContent } from './steps/HouseStepContent'
import { ProfileStepContent } from './steps/ProfileStepContent'
import { StakeStepContent } from './steps/StakeStepContent'
import { SuccessStepContent } from './steps/SuccessStepContent'
import type {
  GovernanceHouse,
  GovernanceIdentityStatus,
  GovernanceOnboardingAction,
  GovernanceOnboardingStepId,
  GovernanceProfileFieldErrors,
  GovernanceProfileFieldKey,
  GovernanceWizardData,
} from '../types'
import type { StepperStepItem } from '@goodwidget/ui'

interface GovernanceOnboardingFlowProps {
  identityStatus: GovernanceIdentityStatus
  walletAddress?: string
  disabledHouseOptions: GovernanceHouse[]
  initialFieldErrors: GovernanceProfileFieldErrors
  stakeAmountLabel: string
  transactionSteps: StepperStepItem[]
  finalActions: GovernanceOnboardingAction[]
  onVerifyIdentity?: () => void
  onFinalActionPress?: (actionId: string) => void
  dataTestId?: string
}

export function GovernanceOnboardingFlow({
  identityStatus,
  walletAddress,
  disabledHouseOptions,
  initialFieldErrors,
  stakeAmountLabel,
  transactionSteps = DEFAULT_TRANSACTION_STEPS,
  finalActions = DEFAULT_FINAL_ACTIONS,
  onVerifyIdentity,
  onFinalActionPress,
  dataTestId,
}: GovernanceOnboardingFlowProps) {
  const { currentStep, data, setData, next, back, isFirst } = usePageWizard()
  const [fieldErrors, setFieldErrors] = useState<GovernanceProfileFieldErrors>(initialFieldErrors)

  const wizardData = data as GovernanceWizardData
  const selectedHouse = wizardData.selectedHouse
  const profileDraft = wizardData.profileDraft ?? {}
  const resolvedHouse: GovernanceHouse = selectedHouse ?? 'citizenship'
  const isIdentityVerified = identityStatus === 'verified'

  const updateProfileField = (fieldKey: GovernanceProfileFieldKey, nextValue: string) => {
    setData((previousData) => {
      const previousDraft =
        (previousData as GovernanceWizardData).profileDraft ?? {}
      return {
        profileDraft: {
          ...previousDraft,
          [fieldKey]: nextValue,
        },
      }
    })

    setFieldErrors((previousErrors) => {
      const nextErrors = { ...previousErrors }
      delete nextErrors[fieldKey]
      return nextErrors
    })
  }

  const handleProfileContinue = () => {
    const nextFieldErrors = validateProfileDraft(resolvedHouse, profileDraft)
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length === 0) {
      next()
    }
  }

  const handleHouseSelect = (nextHouse: GovernanceHouse) => {
    setData({ selectedHouse: nextHouse })
  }

  let shellTitle = 'Governance onboarding'
  let shellDescription = ''
  let shellContent: React.ReactNode = null
  let shellFooter: React.ReactNode = null
  let hideStepper = false

  switch (currentStep?.id as GovernanceOnboardingStepId | undefined) {
    case 'welcome':
    default:
      shellTitle = 'Welcome'
      shellDescription =
        'Before entering governance, we must verify your unique identity status on the GoodDollar Protocol.'
      shellContent = (
        <WelcomeStepContent
          identityStatus={identityStatus}
          walletAddress={walletAddress}
          isIdentityVerified={isIdentityVerified}
          onVerifyPress={onVerifyIdentity}
          // CTA button lives inside the card — no shell footer button needed
          onProceedPress={next}
        />
      )
      // Footer is null — "Proceed to Membership" is inside OnboardingIdentityCard
      shellFooter = null
      break

    case 'house':
      shellTitle = 'Choose your house'
      shellDescription =
        'Where will your impact be felt? Choose the path that best fits your contribution.'
      shellContent = (
        <HouseStepContent
          selectedHouse={selectedHouse}
          disabledHouseOptions={disabledHouseOptions}
          stakeAmountLabel={stakeAmountLabel}
          onHouseSelect={handleHouseSelect}
        />
      )
      shellFooter = (
        <XStack gap="$3" justifyContent="space-between" flexWrap="wrap">
          <Button variant="secondary" onPress={back} disabled={isFirst}>
            <ButtonText>Back</ButtonText>
          </Button>
          <Button disabled={!selectedHouse} onPress={next}>
            <ButtonText>Continue to profile</ButtonText>
          </Button>
        </XStack>
      )
      break

    case 'profile':
      shellTitle = `Apply for ${HOUSE_COPY[resolvedHouse].title}`
      shellDescription =
        'Finalize your application by providing your details and staking the required amount.'
      shellContent = (
        <ProfileStepContent
          selectedHouse={resolvedHouse}
          profileDraft={profileDraft}
          fieldErrors={fieldErrors}
          stakeAmountLabel={stakeAmountLabel}
          onProfileFieldChange={updateProfileField}
          // CTA button lives inside the card — no shell footer button needed
          onContinuePress={handleProfileContinue}
        />
      )
      // Footer is null — "Create Profile and Stake" is inside ProfileStepContent card
      shellFooter = null
      break

    case 'stake':
      shellTitle = 'Creating profile & staking'
      shellDescription =
        'Please wait while your transaction is confirmed on-chain. You can review each step below.'
      shellContent = (
        <StakeStepContent stakeAmountLabel={stakeAmountLabel} transactionSteps={transactionSteps} />
      )
      shellFooter = (
        <XStack gap="$3" justifyContent="space-between" flexWrap="wrap">
          <Button variant="secondary" onPress={back}>
            <ButtonText>Back</ButtonText>
          </Button>
          <Button onPress={next}>
            <ButtonText>Continue to success</ButtonText>
          </Button>
        </XStack>
      )
      break

    case 'success':
      hideStepper = true
      shellContent = (
        <SuccessStepContent
          finalActions={finalActions}
          stakeAmountLabel={stakeAmountLabel}
          onFinalActionPress={onFinalActionPress}
        />
      )
      shellFooter = null
      break
  }

  return (
    <PageWizardShell
      title={shellTitle}
      description={shellDescription}
      footer={shellFooter}
      dataTestId={dataTestId}
      showStepper={!hideStepper}
    >
      {shellContent}
    </PageWizardShell>
  )
}
