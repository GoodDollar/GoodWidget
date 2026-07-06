import type { ChangeEvent } from 'react'
import { Theme, XStack, YStack } from 'tamagui'
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
  ctaDisabled: boolean
  onProfileFieldChange: (fieldKey: GovernanceProfileFieldKey, nextValue: string) => void
  onProfileFieldBlur: (fieldKey: GovernanceProfileFieldKey) => void
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

// ── Inline single-line field ──────────────────────────────────────────────────
function FormField({
  label,
  placeholder,
  helperText,
  value,
  errorMessage,
  onChangeText,
  onBlur,
}: {
  label: string
  placeholder: string
  helperText?: string
  value?: string
  errorMessage?: string
  onChangeText: (v: string) => void
  onBlur?: () => void
}) {
  return (
    <YStack gap="$1">
      <InputLabel>{label}</InputLabel>
      <InputFrame
        placeholder={placeholder}
        value={value ?? ''}
        error={Boolean(errorMessage)}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChangeText(event.currentTarget.value)
        }}
        onBlur={() => {
          onBlur?.(value ?? '')
        }}
      />
      {/* Show the requirement hint only when there is no error showing */}
      {helperText && !errorMessage ? (
        <Text variant="caption" tone="secondary">{helperText}</Text>
      ) : null}
      {errorMessage ? <InputError>{errorMessage}</InputError> : null}
    </YStack>
  )
}

export function ProfileStepContent({
  selectedHouse,
  profileDraft,
  fieldErrors,
  stakeAmountLabel,
  ctaDisabled,
  onProfileFieldChange,
  onProfileFieldBlur,
  onContinuePress,
}: ProfileStepContentProps) {

  return (
    <YStack gap="$3">
      <Card elevated>
        <YStack gap="$4">
          {/* ── Membership Stake banner (Figma: inline inside card) ──────── */}
          <Theme name="OnboardingAccentRow">
            <YStack
              borderRadius="$3"
              borderWidth={1}
              borderColor="$primary"
              backgroundColor="$backgroundHover"
              padding="$3"
              gap="$3"
            >
              {/* Amount row */}
              <XStack alignItems="center" gap="$3">
                <Icon name="shield-check" size="md" color="primary" />
                <YStack gap="$0.5">
                  <Text variant="caption" tone="secondary">
                    Membership Stake
                  </Text>
                  <Text fontWeight="700" fontSize="$6" lineHeight="$6" color="$color">
                    {stakeAmountLabel}
                  </Text>
                </YStack>
              </XStack>

              {/* Warning row — Figma uses red/error styling, not orange/warning */}
              <XStack
                alignItems="flex-start"
                gap="$3"
                padding="$3"
                borderRadius="$2"
                backgroundColor="$errorMuted"
                borderWidth={1}
                borderColor="$error"
              >
                <Icon name="alert-triangle" color="error" size="sm" />
                <Text variant="caption" flex={1}>
                  {resolveStakeWarning(selectedHouse, stakeAmountLabel)}
                </Text>
              </XStack>
            </YStack>
          </Theme>

          {/* ── Profile fields ──────────────────────────────────────────── */}
          <YStack gap="$3">
            <FormField
              label="Official Name"
              placeholder="John Doe or Organization"
              helperText="Min. 3 characters"
              value={profileDraft.name}
              errorMessage={fieldErrors.name}
              onChangeText={(v) => onProfileFieldChange('name', v)}
              onBlur={(v) => onProfileFieldBlur('name', v)}
            />

            {selectedHouse === 'citizenship' ? (
              <FormField
                label="Social Profile Link"
                placeholder="https://twitter.com/username"
                helperText="Must start with https://"
                value={profileDraft.socialLinks}
                errorMessage={fieldErrors.socialLinks}
                onChangeText={(v) => onProfileFieldChange('socialLinks', v)}
                onBlur={(v) => onProfileFieldBlur('socialLinks', v)}
              />
            ) : (
              <>
                <FormField
                  label="External Link"
                  placeholder="https://example.com"
                  helperText="Must start with https://"
                  value={profileDraft.projectWebpage}
                  errorMessage={fieldErrors.projectWebpage}
                  onChangeText={(v) => onProfileFieldChange('projectWebpage', v)}
                  onBlur={(v) => onProfileFieldBlur('projectWebpage', v)}
                />
                <ProfileTextAreaField
                  label="Mission Statement"
                  placeholder="What is the primary goal of your alignment?"
                  helperText="Min. 20 characters"
                  value={profileDraft.missionStatement}
                  errorMessage={fieldErrors.missionStatement}
                  onChangeText={(v) => onProfileFieldChange('missionStatement', v)}
                  onBlur={(v) => onProfileFieldBlur('missionStatement', v)}
                />
                <ProfileTextAreaField
                  label="Redistribution Strategy"
                  placeholder="How do you plan to allocate resources?"
                  helperText="Min. 20 characters"
                  value={profileDraft.distributionStrategy}
                  errorMessage={fieldErrors.distributionStrategy}
                  onChangeText={(v) => onProfileFieldChange('distributionStrategy', v)}
                  onBlur={(v) => onProfileFieldBlur('distributionStrategy', v)}
                />
              </>
            )}
          </YStack>

          {/* ── CTA button (Figma: inside card at bottom) ───────────────── */}
          <Button
            fullWidth
            disabled={ctaDisabled}
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
