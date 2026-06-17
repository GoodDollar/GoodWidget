import React, { useMemo } from 'react'
import { PageWizardProvider } from '@goodwidget/ui'
import { GovernanceOnboardingFlow } from './onboarding/GovernanceOnboardingFlow'
import { DEFAULT_FINAL_ACTIONS, DEFAULT_TRANSACTION_STEPS, ONBOARDING_STEPS } from './onboarding/constants'
import type {
  GovernanceOnboardingStepId,
  GovernanceOnboardingWidgetProps,
  GovernanceWizardData,
} from './types'

/**
 * GovernanceOnboardingWidget keeps the five onboarding pages UI-only for now.
 * The component owns light/dark-safe visuals, simple local navigation, and a
 * presentational state contract that stories and later runtime integrations can drive.
 */
export function GovernanceOnboardingWidget({
  currentStepId,
  initialStepId = 'welcome',
  identityStatus = 'verified',
  initialHouse,
  disabledHouseOptions = [],
  initialProfileDraft,
  initialFieldErrors = {},
  stakeAmountLabel = '250 G$',
  transactionSteps = DEFAULT_TRANSACTION_STEPS,
  finalActions = DEFAULT_FINAL_ACTIONS,
  dataTestId,
  onStepChange,
  onVerifyIdentity,
  onFinalActionPress,
}: GovernanceOnboardingWidgetProps) {
  const initialWizardData = useMemo<GovernanceWizardData>(
    () => ({
      selectedHouse: initialHouse,
      profileDraft: initialProfileDraft ?? {},
    }),
    [initialHouse, initialProfileDraft],
  )

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
        disabledHouseOptions={disabledHouseOptions}
        initialFieldErrors={initialFieldErrors}
        stakeAmountLabel={stakeAmountLabel}
        transactionSteps={transactionSteps}
        finalActions={finalActions}
        onVerifyIdentity={onVerifyIdentity}
        onFinalActionPress={onFinalActionPress}
        dataTestId={dataTestId}
      />
    </PageWizardProvider>
  )
}
