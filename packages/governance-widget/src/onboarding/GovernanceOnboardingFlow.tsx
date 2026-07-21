import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button, ButtonText, PageWizardShell, XStack, usePageWizard } from '@goodwidget/ui'
import { HOUSE_COPY } from './copy'
import { DEFAULT_TRANSACTION_STEPS, DEFAULT_FINAL_ACTIONS } from './constants'
import { validateProfileDraft, isProfileDraftComplete, validateField } from './validation'
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
  stakeAmountLabels: Record<GovernanceHouse, string>
  transactionSteps: StepperStepItem[]
  finalActions: GovernanceOnboardingAction[]
  onHouseChange?: (house: GovernanceHouse) => void
  onIdentityVerificationPress?: () => void
  onProfileSubmit?: (profileDraft: GovernanceWizardData['profileDraft'], house: GovernanceHouse) => void
  onFinalActionPress?: (actionId: string) => void
  dataTestId?: string
}

function areTransactionStepsComplete(steps: StepperStepItem[]): boolean {
  return steps.length > 0 && steps.every((step) => step.status === 'completed')
}

export function GovernanceOnboardingFlow({
  identityStatus,
  walletAddress,
  disabledHouseOptions,
  initialFieldErrors,
  stakeAmountLabels,
  transactionSteps = DEFAULT_TRANSACTION_STEPS,
  finalActions = DEFAULT_FINAL_ACTIONS,
  onHouseChange,
  onIdentityVerificationPress,
  onProfileSubmit,
  onFinalActionPress,
  dataTestId,
}: GovernanceOnboardingFlowProps) {
  const { currentStep, steps, data, setData, next } = usePageWizard()
  const stepperDisplaySteps = steps.filter((s) => s.id !== 'success')
  const [fieldErrors, setFieldErrors] = useState<GovernanceProfileFieldErrors>(initialFieldErrors)

  const wizardData = data as GovernanceWizardData
  const selectedHouse = wizardData.selectedHouse
  const profileDraft = wizardData.profileDraft ?? {}
  const resolvedHouse: GovernanceHouse = selectedHouse ?? 'citizenship'
  const selectedStakeAmountLabel = stakeAmountLabels[resolvedHouse]
  const isIdentityVerified = identityStatus === 'verified'
  const profileIsComplete = isProfileDraftComplete(resolvedHouse, profileDraft)

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

  const handleFieldBlur = (fieldKey: GovernanceProfileFieldKey, fieldValue: string) => {
    const error = validateField(fieldKey, fieldValue)
    setFieldErrors((prev) => {
      if (!error) {
        const next = { ...prev }
        delete next[fieldKey]
        return next
      }
      return { ...prev, [fieldKey]: error }
    })
  }

  const handleProfileContinue = () => {
    const nextFieldErrors = validateProfileDraft(resolvedHouse, profileDraft)
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length === 0) {
      onProfileSubmit?.(profileDraft, resolvedHouse)
      next()
    }
  }

  const handleHouseSelect = (nextHouse: GovernanceHouse) => {
    setData({ selectedHouse: nextHouse })
    onHouseChange?.(nextHouse)
  }

  let shellTitle = 'Governance onboarding'
  let shellDescription = ''
  let shellContent: ReactNode = null
  let shellFooter: ReactNode = null
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
          onProceedPress={next}
          onVerifyPress={onIdentityVerificationPress}
        />
      )
      shellFooter = null
      break

    case 'house':
      shellTitle = 'Choose your house'
      shellDescription =
        'Select the governance body you wish to join.'
      shellContent = (
        <HouseStepContent
          selectedHouse={selectedHouse}
          disabledHouseOptions={disabledHouseOptions}
          stakeAmountLabels={stakeAmountLabels}
          onHouseSelect={handleHouseSelect}
        />
      )
      shellFooter = (
        <XStack width="100%">
          <Button fullWidth disabled={!selectedHouse} onPress={next}>
            <ButtonText>Continue</ButtonText>
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
          stakeAmountLabel={selectedStakeAmountLabel}
          onProfileFieldChange={updateProfileField}
          onProfileFieldBlur={handleFieldBlur}
          ctaDisabled={!profileIsComplete}
          onContinuePress={handleProfileContinue}
        />
      )
      shellFooter = null
      break

    case 'stake': {
      const allStepsCompleted = areTransactionStepsComplete(transactionSteps)
      shellTitle = 'Securing your membership'
      shellDescription =
        'Transactions are being processed on-chain. Please do not close this window.'
      shellContent = (
        <StakeStepContent
          stakeAmountLabel={selectedStakeAmountLabel}
          transactionSteps={transactionSteps}
        />
      )
      shellFooter = allStepsCompleted ? (
        <XStack width="100%">
          <Button fullWidth onPress={next}>
            <ButtonText>Continue to success</ButtonText>
          </Button>
        </XStack>
      ) : null
      break
    }

    case 'success':
      hideStepper = true
      shellContent = (
        <SuccessStepContent
          finalActions={finalActions}
          stakeAmountLabel={selectedStakeAmountLabel}
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
      stepperSteps={stepperDisplaySteps}
    >
      {shellContent}
    </PageWizardShell>
  )
}
