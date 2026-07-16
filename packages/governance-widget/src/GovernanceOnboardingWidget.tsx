import { useMemo } from 'react'
import { PageWizardProvider } from '@goodwidget/ui'
import { GovernanceOnboardingFlow } from './onboarding/GovernanceOnboardingFlow'
import { DEFAULT_FINAL_ACTIONS, DEFAULT_TRANSACTION_STEPS, ONBOARDING_STEPS } from './onboarding/constants'
import { HOUSE_COPY } from './onboarding/copy'
import type {
  GovernanceOnboardingStepId,
  GovernanceOnboardingWidgetProps,
  GovernanceWizardData,
} from './types'

export function GovernanceOnboardingWidget({
  currentStepId,
  initialStepId = 'welcome',
  identityStatus = 'verified',
  walletAddress,
  initialHouse,
  disabledHouseOptions = [],
  initialProfileDraft,
  initialFieldErrors = {},
  stakeAmountLabel,
  stakeAmountLabels,
  transactionSteps = DEFAULT_TRANSACTION_STEPS,
  finalActions = DEFAULT_FINAL_ACTIONS,
  dataTestId,
  onHouseChange,
  onIdentityVerificationPress,
  onProfileSubmit,
  onStepChange,
  onFinalActionPress,
}: GovernanceOnboardingWidgetProps) {
  const initialWizardData = useMemo<GovernanceWizardData>(
    () => ({
      selectedHouse: initialHouse,
      profileDraft: initialProfileDraft ?? {},
    }),
    [initialHouse, initialProfileDraft],
  )
  const resolvedStakeAmountLabels = stakeAmountLabels ?? (stakeAmountLabel
    ? { citizenship: stakeAmountLabel, alignment: stakeAmountLabel }
    : {
        citizenship: HOUSE_COPY.citizenship.defaultStakeAmount,
        alignment: HOUSE_COPY.alignment.defaultStakeAmount,
      })

  return (
    <PageWizardProvider
      steps={ONBOARDING_STEPS}
      initialStepId={initialStepId}
      currentStepId={currentStepId}
      initialData={initialWizardData}
      onStepChange={(stepId) => onStepChange?.(stepId as GovernanceOnboardingStepId)}
    >
      <GovernanceOnboardingFlow
        identityStatus={identityStatus}
        walletAddress={walletAddress}
        disabledHouseOptions={disabledHouseOptions}
        initialFieldErrors={initialFieldErrors}
        stakeAmountLabels={resolvedStakeAmountLabels}
        transactionSteps={transactionSteps}
        finalActions={finalActions}
        onHouseChange={onHouseChange}
        onIdentityVerificationPress={onIdentityVerificationPress}
        onProfileSubmit={onProfileSubmit}
        onFinalActionPress={onFinalActionPress}
        dataTestId={dataTestId}
      />
    </PageWizardProvider>
  )
}
