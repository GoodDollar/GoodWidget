import { REQUIRED_PROFILE_FIELDS } from './constants'
import type {
  GovernanceHouse,
  GovernanceProfileDraft,
  GovernanceProfileFieldErrors,
  GovernanceProfileFieldKey,
} from '../types'

function createRequiredFieldLabel(fieldKey: GovernanceProfileFieldKey): string {
  switch (fieldKey) {
    case 'name':
      return 'Name is required'
    case 'socialLinks':
      return 'Social links are required'
    case 'projectWebpage':
      return 'Project webpage is required'
    case 'missionStatement':
      return 'Mission statement is required'
    case 'distributionStrategy':
      return 'Distribution strategy is required'
    default:
      return 'This field is required'
  }
}

const URL_FIELDS: GovernanceProfileFieldKey[] = ['socialLinks', 'projectWebpage']

function isValidUrl(val: string): boolean {
  if (!/^https:\/\//i.test(val)) return false
  try {
    new URL(val)
    return true
  } catch (_) {
    return false
  }
}

export function validateProfileDraft(
  selectedHouse: GovernanceHouse,
  profileDraft: GovernanceProfileDraft,
): GovernanceProfileFieldErrors {
  return REQUIRED_PROFILE_FIELDS[selectedHouse].reduce<GovernanceProfileFieldErrors>(
    (errors, fieldKey) => {
      const fieldValue = profileDraft[fieldKey]?.trim()
      if (!fieldValue) {
        errors[fieldKey] = createRequiredFieldLabel(fieldKey)
      } else if (URL_FIELDS.includes(fieldKey) && !isValidUrl(fieldValue)) {
        errors[fieldKey] = 'Please enter a valid URL starting with https://'
      }
      return errors
    },
    {},
  )
}

export function isProfileDraftComplete(
  selectedHouse: GovernanceHouse,
  profileDraft: GovernanceProfileDraft,
  fieldErrors: GovernanceProfileFieldErrors,
): boolean {
  const validationErrors = validateProfileDraft(selectedHouse, profileDraft)
  return Object.keys(validationErrors).length === 0 && Object.keys(fieldErrors).length === 0
}
