import type { PageWizardStep, StepperStepItem } from '@goodwidget/ui'
import type { GovernanceHouse, GovernanceProfileFieldKey } from '../types'
import type { GovernanceOnboardingAction } from '../types'

export const ONBOARDING_STEPS: PageWizardStep[] = [
  { id: 'welcome', title: 'Verify' },
  { id: 'house', title: 'Path' },
  { id: 'profile', title: 'Profile' },
  { id: 'stake', title: 'Transact' },
  { id: 'success', title: 'Complete' },
]

export const REQUIRED_PROFILE_FIELDS: Record<GovernanceHouse, GovernanceProfileFieldKey[]> = {
  citizenship: ['name', 'socialLinks'],
  alignment: ['name', 'projectWebpage', 'missionStatement', 'distributionStrategy'],
}

export const DEFAULT_TRANSACTION_STEPS: StepperStepItem[] = [
  {
    id: 'prepare',
    title: 'Prepare wallet balance',
    description: 'Keep the required G$ amount available before the staking transaction starts.',
    status: 'completed',
  },
  {
    id: 'approve',
    title: 'Approve governance stake',
    description: 'Waiting for the wallet confirmation that authorizes the G$ stake amount.',
    status: 'active',
  },
  {
    id: 'stake',
    title: 'Lock the membership stake',
    status: 'pending',
  },
  {
    id: 'finalize',
    title: 'Finalize governance access',
    status: 'pending',
  },
]

export const DEFAULT_FINAL_ACTIONS: GovernanceOnboardingAction[] = [
  { id: 'proposals', label: 'Explore Governance Proposals', variant: 'secondary' },
  { id: 'profile', label: 'Go to my profile', variant: 'primary' },
]
