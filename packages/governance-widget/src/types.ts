import type { ButtonProps, StepperStepItem } from '@goodwidget/ui'

export type GovernanceHouse = 'citizenship' | 'alignment'

export type GovernanceOnboardingStepId =
  | 'welcome'
  | 'house'
  | 'profile'
  | 'stake'
  | 'success'

export interface GovernanceWizardData extends Record<string, unknown> {
  selectedHouse?: GovernanceHouse
  profileDraft: GovernanceProfileDraft
}

export type GovernanceIdentityStatus = 'verified' | 'unverified'

export interface GovernanceProfileDraft {
  name?: string
  socialLinks?: string
  projectWebpage?: string
  missionStatement?: string
  distributionStrategy?: string
}

export type GovernanceProfileFieldKey = keyof GovernanceProfileDraft

export type GovernanceProfileFieldErrors = Partial<Record<GovernanceProfileFieldKey, string>>

export interface GovernanceOnboardingAction {
  id: string
  label: string
  variant?: ButtonProps['variant']
  disabled?: boolean
}

export interface GovernanceOnboardingWidgetProps {
  currentStepId?: GovernanceOnboardingStepId
  initialStepId?: GovernanceOnboardingStepId
  identityStatus?: GovernanceIdentityStatus
  initialHouse?: GovernanceHouse
  disabledHouseOptions?: GovernanceHouse[]
  initialProfileDraft?: GovernanceProfileDraft
  initialFieldErrors?: GovernanceProfileFieldErrors
  stakeAmountLabel?: string
  transactionSteps?: StepperStepItem[]
  finalActions?: GovernanceOnboardingAction[]
  dataTestId?: string
  onStepChange?: (stepId: GovernanceOnboardingStepId) => void
  onVerifyIdentity?: () => void
  onFinalActionPress?: (actionId: string) => void
}
