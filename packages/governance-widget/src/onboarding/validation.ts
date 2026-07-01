import { REQUIRED_PROFILE_FIELDS } from './constants'
import type {
  GovernanceHouse,
  GovernanceProfileDraft,
  GovernanceProfileFieldErrors,
  GovernanceProfileFieldKey,
} from '../types'

/** Minimum character counts (after trimming) for each field. */
const FIELD_MIN_LENGTH: Partial<Record<GovernanceProfileFieldKey, number>> = {
  name: 3,
  missionStatement: 20,
  distributionStrategy: 20,
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

function getFieldError(
  fieldKey: GovernanceProfileFieldKey,
  fieldValue: string | undefined,
): string | undefined {
  const trimmed = fieldValue?.trim() ?? ''

  if (!trimmed) {
    switch (fieldKey) {
      case 'name': return 'Name is required'
      case 'socialLinks': return 'Social links are required'
      case 'projectWebpage': return 'Project webpage is required'
      case 'missionStatement': return 'Mission statement is required'
      case 'distributionStrategy': return 'Distribution strategy is required'
      default: return 'This field is required'
    }
  }

  const min = FIELD_MIN_LENGTH[fieldKey]
  if (min !== undefined && trimmed.length < min) {
    return `Must be at least ${min} characters`
  }

  if (URL_FIELDS.includes(fieldKey) && !isValidUrl(trimmed)) {
    return 'Please enter a valid URL starting with https://'
  }

  return undefined
}

export function validateProfileDraft(
  selectedHouse: GovernanceHouse,
  profileDraft: GovernanceProfileDraft,
): GovernanceProfileFieldErrors {
  return REQUIRED_PROFILE_FIELDS[selectedHouse].reduce<GovernanceProfileFieldErrors>(
    (errors, fieldKey) => {
      const error = getFieldError(fieldKey, profileDraft[fieldKey])
      if (error) errors[fieldKey] = error
      return errors
    },
    {},
  )
}

export function isProfileDraftComplete(
  selectedHouse: GovernanceHouse,
  profileDraft: GovernanceProfileDraft,
): boolean {
  const validationErrors = validateProfileDraft(selectedHouse, profileDraft)
  return Object.keys(validationErrors).length === 0
}
