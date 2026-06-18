import React from 'react'
import { Badge, BadgeText, Card, Heading, Text, XStack, YStack } from '@goodwidget/ui'
import { HOUSE_COPY } from '../copy'
import { MembershipStakeBanner } from '../MembershipStakeBanner'
import { ProfileField } from '../ProfileField'
import { ProfileTextAreaField } from '../ProfileTextAreaField'
import { isProfileDraftComplete } from '../validation'
import type {
  GovernanceHouse,
  GovernanceProfileDraft,
  GovernanceProfileFieldErrors,
  GovernanceProfileFieldKey,
} from '../../types'

interface ProfileStepContentProps {
  selectedHouse: GovernanceHouse
  profileDraft: GovernanceProfileDraft
  fieldErrors: GovernanceProfileFieldErrors
  stakeAmountLabel: string
  onProfileFieldChange: (fieldKey: GovernanceProfileFieldKey, nextValue: string) => void
}

const STAKE_WARNING =
  'Please ensure you have at least the required G$ in your wallet. Staked tokens are locked for the duration of active governance cycles.'

export function ProfileStepContent({
  selectedHouse,
  profileDraft,
  fieldErrors,
  stakeAmountLabel,
  onProfileFieldChange,
}: ProfileStepContentProps) {
  const isReadyToContinue = isProfileDraftComplete(selectedHouse, profileDraft, fieldErrors)
  const isPristine = Object.values(profileDraft).every((fieldValue) => !fieldValue)
  const hasErrors = Object.keys(fieldErrors).length > 0
  const statusBadgeLabel = isReadyToContinue
    ? 'Ready to continue'
    : hasErrors
      ? 'Validation needed'
      : isPristine
        ? 'Profile empty'
        : 'Editing profile'

  return (
    <YStack gap="$3">
      <MembershipStakeBanner stakeAmountLabel={stakeAmountLabel} warningMessage={STAKE_WARNING} />

      <Card elevated>
        <YStack gap="$3">
          <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
            <YStack gap="$1">
              <Heading level={5}>{HOUSE_COPY[selectedHouse].title} profile</Heading>
              <Text tone="secondary">{HOUSE_COPY[selectedHouse].helper}</Text>
            </YStack>
            <Badge type={isReadyToContinue ? 'success' : hasErrors ? 'warning' : 'info'}>
              <BadgeText>{statusBadgeLabel}</BadgeText>
            </Badge>
          </XStack>

          <YStack gap="$3">
            <ProfileField
              label="Name"
              placeholder="Describe the member or project name"
              value={profileDraft.name}
              errorMessage={fieldErrors.name}
              helperText="This value is shared across both house registration variants."
              onChangeText={(nextValue) => onProfileFieldChange('name', nextValue)}
            />

            {selectedHouse === 'citizenship' ? (
              <ProfileField
                label="Social links"
                placeholder="https://twitter.com/your-handle"
                value={profileDraft.socialLinks}
                errorMessage={fieldErrors.socialLinks}
                helperText="Use a short, reviewer-friendly list of public social URLs."
                onChangeText={(nextValue) => onProfileFieldChange('socialLinks', nextValue)}
              />
            ) : (
              <>
                <ProfileField
                  label="Project webpage"
                  placeholder="https://goodproject.example"
                  value={profileDraft.projectWebpage}
                  errorMessage={fieldErrors.projectWebpage}
                  helperText="Point reviewers to the project homepage or primary documentation page."
                  onChangeText={(nextValue) => onProfileFieldChange('projectWebpage', nextValue)}
                />
                <ProfileTextAreaField
                  label="Mission statement"
                  placeholder="Explain the mission that aligns the project with the GoodDollar ecosystem."
                  value={profileDraft.missionStatement}
                  errorMessage={fieldErrors.missionStatement}
                  helperText="This field is intended for longer descriptive copy."
                  onChangeText={(nextValue) => onProfileFieldChange('missionStatement', nextValue)}
                />
                <ProfileTextAreaField
                  label="Distribution strategy"
                  placeholder="Describe how governance-approved funding will be allocated."
                  value={profileDraft.distributionStrategy}
                  errorMessage={fieldErrors.distributionStrategy}
                  helperText="Keep the strategy readable for reviewers in both light and dark mode."
                  onChangeText={(nextValue) => onProfileFieldChange('distributionStrategy', nextValue)}
                />
              </>
            )}
          </YStack>
        </YStack>
      </Card>
    </YStack>
  )
}
