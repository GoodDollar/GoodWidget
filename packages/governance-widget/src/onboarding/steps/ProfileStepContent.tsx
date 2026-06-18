import React from 'react'
import { XStack, YStack } from 'tamagui'
import { Button, ButtonText, Card, Icon, Text } from '@goodwidget/ui'
import { InputError, InputFrame, InputLabel } from '@goodwidget/ui'
import { ProfileTextAreaField } from '../ProfileTextAreaField'
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
  onContinuePress: () => void
}

const STAKE_WARNING_GENERIC =
  'Please ensure you have the required G$ in your wallet. Staked tokens are locked for the duration of active governance cycles.'

function resolveStakeWarning(house: GovernanceHouse, stakeAmountLabel: string): string {
  if (house === 'alignment') {
    return `Please ensure you have at least ${stakeAmountLabel} in your wallet. Staked tokens are locked for the duration of active governance cycles.`
  }
  return STAKE_WARNING_GENERIC
}

// ── Inline profile field (avoids extra import of ProfileField) ───────────────
function FormField({
  label,
  placeholder,
  value,
  errorMessage,
  onChangeText,
}: {
  label: string
  placeholder: string
  value?: string
  errorMessage?: string
  onChangeText: (v: string) => void
}) {
  return (
    <YStack gap="$1">
      <InputLabel>{label}</InputLabel>
      <InputFrame
        placeholder={placeholder}
        value={value ?? ''}
        error={Boolean(errorMessage)}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          onChangeText(event.currentTarget.value)
        }}
      />
      {errorMessage ? <InputError>{errorMessage}</InputError> : null}
    </YStack>
  )
}

export function ProfileStepContent({
  selectedHouse,
  profileDraft,
  fieldErrors,
  stakeAmountLabel,
  onProfileFieldChange,
  onContinuePress,
}: ProfileStepContentProps) {

  return (
    <YStack gap="$3">
      <Card elevated>
        <YStack gap="$4">
          {/* ── Membership Stake banner (Figma: inline inside card) ──────── */}
          <YStack
            borderRadius="$3"
            borderWidth={1}
            borderColor="$governancePrimary"
            backgroundColor="$governanceSurfaceAlt"
            padding="$3"
            gap="$3"
          >
            {/* Amount row */}
            <XStack alignItems="center" gap="$3">
              <XStack
                width={36}
                height={36}
                borderRadius="$full"
                alignItems="center"
                justifyContent="center"
                backgroundColor="$infoMuted"
              >
                <Icon name="shield-check" size="sm" color="primary" />
              </XStack>
              <YStack gap="$0.5">
                <Text variant="caption" tone="secondary">
                  Membership Stake
                </Text>
                <Text fontWeight="700" fontSize="$6" lineHeight="$6" color="$color">
                  {stakeAmountLabel}
                </Text>
              </YStack>
            </XStack>

            {/* Warning row */}
            <XStack
              alignItems="flex-start"
              gap="$3"
              padding="$3"
              borderRadius="$2"
              backgroundColor="$governanceErrorMuted"
              borderWidth={1}
              borderColor="$governanceError"
            >
              <Icon name="alert-triangle" color="error" size="sm" />
              <Text variant="caption" flex={1}>
                {resolveStakeWarning(selectedHouse, stakeAmountLabel)}
              </Text>
            </XStack>
          </YStack>

          {/* ── Profile fields ──────────────────────────────────────────── */}
          <YStack gap="$3">
            <FormField
              label="Official Name"
              placeholder="John Doe or Organization"
              value={profileDraft.name}
              errorMessage={fieldErrors.name}
              onChangeText={(v) => onProfileFieldChange('name', v)}
            />

            {selectedHouse === 'citizenship' ? (
              <FormField
                label="Social Profile Link"
                placeholder="https://twitter.com/username"
                value={profileDraft.socialLinks}
                errorMessage={fieldErrors.socialLinks}
                onChangeText={(v) => onProfileFieldChange('socialLinks', v)}
              />
            ) : (
              <>
                <FormField
                  label="External Link"
                  placeholder="https://..."
                  value={profileDraft.projectWebpage}
                  errorMessage={fieldErrors.projectWebpage}
                  onChangeText={(v) => onProfileFieldChange('projectWebpage', v)}
                />
                <ProfileTextAreaField
                  label="Mission Statement"
                  placeholder="What is the primary goal of your alignment?"
                  value={profileDraft.missionStatement}
                  errorMessage={fieldErrors.missionStatement}
                  onChangeText={(v) => onProfileFieldChange('missionStatement', v)}
                />
                <ProfileTextAreaField
                  label="Redistribution Strategy"
                  placeholder="How do you plan to allocate resources?"
                  value={profileDraft.distributionStrategy}
                  errorMessage={fieldErrors.distributionStrategy}
                  onChangeText={(v) => onProfileFieldChange('distributionStrategy', v)}
                />
              </>
            )}
          </YStack>

          {/* ── CTA button (Figma: inside card at bottom) ───────────────── */}
          <Button
            fullWidth
            onPress={onContinuePress}
            aria-label="Create Profile and Stake"
            data-testid="GovernanceOnboardingWidget-profile-cta"
          >
            <ButtonText>Create Profile and Stake</ButtonText>
          </Button>
        </YStack>
      </Card>
    </YStack>
  )
}
