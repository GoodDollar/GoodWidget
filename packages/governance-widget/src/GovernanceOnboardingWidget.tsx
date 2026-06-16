import React, { useMemo, useState } from 'react'
import { Stack, styled } from 'tamagui'
import {
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Card,
  createComponent,
  Heading,
  Icon,
  InputError,
  InputFrame,
  InputLabel,
  PageWizardProvider,
  PageWizardShell,
  Stepper,
  Text,
  XStack,
  YStack,
  usePageWizard,
  type PageWizardStep,
  type StepperStepItem,
} from '@goodwidget/ui'
import type {
  GovernanceHouse,
  GovernanceIdentityStatus,
  GovernanceOnboardingAction,
  GovernanceOnboardingStepId,
  GovernanceOnboardingWidgetProps,
  GovernanceProfileDraft,
  GovernanceProfileFieldErrors,
  GovernanceProfileFieldKey,
} from './types'

const ONBOARDING_STEPS: PageWizardStep[] = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'house', title: 'House' },
  { id: 'profile', title: 'Profile' },
  { id: 'stake', title: 'Stake' },
  { id: 'success', title: 'Complete' },
]

const REQUIRED_PROFILE_FIELDS: Record<GovernanceHouse, GovernanceProfileFieldKey[]> = {
  citizenship: ['name', 'socialLinks'],
  alignment: ['name', 'projectWebpage', 'missionStatement', 'distributionStrategy'],
}

const DEFAULT_TRANSACTION_STEPS: StepperStepItem[] = [
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

const DEFAULT_FINAL_ACTIONS: GovernanceOnboardingAction[] = [
  { id: 'dashboard', label: 'Open governance dashboard', variant: 'primary' },
  { id: 'members', label: 'View member guide', variant: 'secondary' },
]

const HOUSE_COPY: Record<
  GovernanceHouse,
  {
    title: string
    summary: string
    helper: string
  }
> = {
  citizenship: {
    title: 'House of Citizenship',
    summary: 'Represent verified community members and highlight your public governance identity.',
    helper: 'Collect the profile details that describe the member behind the wallet.',
  },
  alignment: {
    title: 'House of Alignment',
    summary: 'Coordinate aligned projects and explain how your mission creates value for the network.',
    helper: 'Collect project-facing metadata that can later map to the onchain registration shape.',
  },
}

const HouseOptionButton = createComponent(Stack, {
  name: 'GovernanceHouseOptionButton',
  tag: 'button',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  width: '100%',
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$borderColor',
  backgroundColor: '$background',
  padding: '$4',
  gap: '$3',
  cursor: 'pointer',
  hoverStyle: {
    borderColor: '$borderColorFocus',
    backgroundColor: '$backgroundHover',
  },
  pressStyle: {
    borderColor: '$borderColorFocus',
    backgroundColor: '$backgroundPress',
  },
  variants: {
    selected: {
      true: {
        borderColor: '$borderColorFocus',
        backgroundColor: '$backgroundHover',
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
        cursor: 'not-allowed',
        pointerEvents: 'none',
      },
    },
  } as const,
})

const ProfileTextArea = createComponent(Stack, {
  name: 'GovernanceOnboardingTextArea',
  tag: 'textarea',
  backgroundColor: '$background',
  borderRadius: '$2',
  borderWidth: 1,
  borderColor: '$borderColor',
  paddingHorizontal: '$3',
  paddingVertical: '$3',
  minHeight: 112,
  color: '$color',
  fontFamily: '$body',
  fontSize: '$3',
  lineHeight: '$4',
  outlineWidth: 0,
  resize: 'vertical' as const,
  hoverStyle: {
    borderColor: '$borderColorHover',
  },
  focusStyle: {
    borderColor: '$borderColorFocus',
    shadowColor: '$shadowColorFocus',
    shadowRadius: 4,
    shadowOpacity: 1,
  },
  variants: {
    error: {
      true: {
        borderColor: '$error',
      },
    },
  } as const,
})

const SuccessGlyph = styled(YStack, {
  name: 'GovernanceOnboardingSuccessGlyph',
  width: 64,
  height: 64,
  borderRadius: '$full',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$successMuted',
})

interface GovernanceWizardData extends Record<string, unknown> {
  selectedHouse?: GovernanceHouse
  profileDraft: GovernanceProfileDraft
}

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

function validateProfileDraft(
  selectedHouse: GovernanceHouse,
  profileDraft: GovernanceProfileDraft,
): GovernanceProfileFieldErrors {
  return REQUIRED_PROFILE_FIELDS[selectedHouse].reduce<GovernanceProfileFieldErrors>((errors, fieldKey) => {
    const fieldValue = profileDraft[fieldKey]?.trim()
    if (!fieldValue) {
      errors[fieldKey] = createRequiredFieldLabel(fieldKey)
    }
    return errors
  }, {})
}

function isProfileDraftComplete(
  selectedHouse: GovernanceHouse,
  profileDraft: GovernanceProfileDraft,
  fieldErrors: GovernanceProfileFieldErrors,
): boolean {
  const validationErrors = validateProfileDraft(selectedHouse, profileDraft)
  return Object.keys(validationErrors).length === 0 && Object.keys(fieldErrors).length === 0
}

function resolveStakeSummary(transactionSteps: StepperStepItem[]): {
  title: string
  badgeType: 'info' | 'warning' | 'success'
  description: string
} {
  const failedStep = transactionSteps.find((step) => step.status === 'failed' || step.status === 'attention')
  if (failedStep) {
    return {
      title: 'Action required',
      badgeType: 'warning',
      description: failedStep.description ?? 'A stake transaction needs attention before governance onboarding can finish.',
    }
  }

  const activeStep = transactionSteps.find((step) => step.status === 'active')
  if (activeStep) {
    return {
      title: 'Transaction in progress',
      badgeType: 'info',
      description: activeStep.description ?? 'The next governance transaction is currently waiting for confirmation.',
    }
  }

  return {
    title: 'Stake confirmed',
    badgeType: 'success',
    description: 'All presentational transaction states are completed and the member can move to the final success state.',
  }
}

function renderButtonLabel(label: string) {
  return <ButtonText>{label}</ButtonText>
}

function OnboardingNotice({
  badgeLabel,
  badgeType,
  title,
  description,
  iconName,
}: {
  badgeLabel: string
  badgeType: 'info' | 'warning' | 'success'
  title: string
  description: string
  iconName: 'info' | 'check' | 'alert-triangle'
}) {
  return (
    <Card outlined>
      <XStack alignItems="flex-start" gap="$3">
        <YStack
          width={44}
          height={44}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          backgroundColor={
            badgeType === 'success'
              ? '$successMuted'
              : badgeType === 'warning'
                ? '$warningMuted'
                : '$infoMuted'
          }
        >
          <Icon name={iconName} color={badgeType === 'warning' ? 'error' : badgeType === 'success' ? 'success' : 'primary'} />
        </YStack>
        <YStack flex={1} gap="$2">
          <Badge type={badgeType}>
            <BadgeText>{badgeLabel}</BadgeText>
          </Badge>
          <YStack gap="$1">
            <Heading level={5}>{title}</Heading>
            <Text tone="secondary">{description}</Text>
          </YStack>
        </YStack>
      </XStack>
    </Card>
  )
}

function HouseSelectionCard({
  house,
  isSelected,
  isDisabled,
  onPress,
}: {
  house: GovernanceHouse
  isSelected: boolean
  isDisabled: boolean
  onPress: () => void
}) {
  const houseCopy = HOUSE_COPY[house]

  return (
    <HouseOptionButton
      selected={isSelected}
      disabled={isDisabled}
      aria-pressed={isSelected}
      onPress={onPress}
      data-testid={`GovernanceOnboardingWidget-house-${house}`}
    >
      <XStack alignItems="center" justifyContent="space-between" width="100%">
        <Badge type={isSelected ? 'success' : 'info'}>
          <BadgeText>{isSelected ? 'Selected' : 'Choose house'}</BadgeText>
        </Badge>
        <Icon name={isSelected ? 'check' : 'chevron-right'} color={isSelected ? 'success' : 'muted'} />
      </XStack>
      <YStack gap="$1">
        <Heading level={5}>{houseCopy.title}</Heading>
        <Text>{houseCopy.summary}</Text>
      </YStack>
      <Text tone="secondary">{houseCopy.helper}</Text>
    </HouseOptionButton>
  )
}

function ProfileField({
  label,
  placeholder,
  value,
  helperText,
  errorMessage,
  onChangeText,
}: {
  label: string
  placeholder: string
  value?: string
  helperText?: string
  errorMessage?: string
  onChangeText: (nextValue: string) => void
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
      {helperText ? <Text variant="caption">{helperText}</Text> : null}
    </YStack>
  )
}

function ProfileTextAreaField({
  label,
  placeholder,
  value,
  helperText,
  errorMessage,
  onChangeText,
}: {
  label: string
  placeholder: string
  value?: string
  helperText?: string
  errorMessage?: string
  onChangeText: (nextValue: string) => void
}) {
  return (
    <YStack gap="$1">
      <InputLabel>{label}</InputLabel>
      <ProfileTextArea
        value={value ?? ''}
        placeholder={placeholder}
        error={Boolean(errorMessage)}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
          onChangeText(event.currentTarget.value)
        }}
      />
      {helperText ? <Text variant="caption">{helperText}</Text> : null}
      {errorMessage ? <InputError>{errorMessage}</InputError> : null}
    </YStack>
  )
}

function WelcomeStepContent({
  identityStatus,
}: {
  identityStatus: GovernanceIdentityStatus
}) {
  const isVerified = identityStatus === 'verified'

  return (
    <YStack gap="$3">
      <Card elevated>
        <Text tone="secondary">
          This onboarding flow stays UI-only for now, so it mirrors the future governance membership journey without sending any transactions.
        </Text>
        <OnboardingNotice
          badgeLabel={isVerified ? 'Identity verified' : 'Verification required'}
          badgeType={isVerified ? 'success' : 'warning'}
          iconName={isVerified ? 'check' : 'alert-triangle'}
          title={isVerified ? 'You are ready to continue into governance onboarding.' : 'Complete identity verification before onboarding can continue.'}
          description={
            isVerified
              ? 'Your wallet can move to house selection and profile setup.'
              : 'The verify action stays available, but the proceed CTA remains disabled until verification succeeds.'
          }
        />
      </Card>
    </YStack>
  )
}

function HouseStepContent({
  selectedHouse,
  disabledHouseOptions,
  onHouseSelect,
}: {
  selectedHouse?: GovernanceHouse
  disabledHouseOptions: GovernanceHouse[]
  onHouseSelect: (nextHouse: GovernanceHouse) => void
}) {
  return (
    <YStack gap="$3">
      <Card elevated>
        <Text tone="secondary">
          Select the governance house that should receive your onboarding profile and stake commitment.
        </Text>
        <YStack gap="$3">
          <HouseSelectionCard
            house="citizenship"
            isSelected={selectedHouse === 'citizenship'}
            isDisabled={disabledHouseOptions.includes('citizenship')}
            onPress={() => onHouseSelect('citizenship')}
          />
          <HouseSelectionCard
            house="alignment"
            isSelected={selectedHouse === 'alignment'}
            isDisabled={disabledHouseOptions.includes('alignment')}
            onPress={() => onHouseSelect('alignment')}
          />
        </YStack>
      </Card>
    </YStack>
  )
}

function ProfileStepContent({
  selectedHouse,
  profileDraft,
  fieldErrors,
  stakeAmountLabel,
  onProfileFieldChange,
}: {
  selectedHouse: GovernanceHouse
  profileDraft: GovernanceProfileDraft
  fieldErrors: GovernanceProfileFieldErrors
  stakeAmountLabel: string
  onProfileFieldChange: (fieldKey: GovernanceProfileFieldKey, nextValue: string) => void
}) {
  const isReadyToContinue = isProfileDraftComplete(selectedHouse, profileDraft, fieldErrors)
  const isPristine = Object.values(profileDraft).every((fieldValue) => !fieldValue)
  const statusBadgeLabel = isReadyToContinue
    ? 'Ready to continue'
    : Object.keys(fieldErrors).length > 0
      ? 'Validation needed'
      : isPristine
        ? 'Profile empty'
        : 'Editing profile'

  return (
    <YStack gap="$3">
      <Card elevated>
        <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
          <Badge type={isReadyToContinue ? 'success' : Object.keys(fieldErrors).length > 0 ? 'warning' : 'info'}>
            <BadgeText>{statusBadgeLabel}</BadgeText>
          </Badge>
          <Badge type="info">
            <BadgeText>{stakeAmountLabel} stake required</BadgeText>
          </Badge>
        </XStack>

        <YStack gap="$1">
          <Heading level={5}>{HOUSE_COPY[selectedHouse].title} profile</Heading>
          <Text tone="secondary">{HOUSE_COPY[selectedHouse].helper}</Text>
        </YStack>

        <OnboardingNotice
          badgeLabel="Stake reminder"
          badgeType="warning"
          iconName="alert-triangle"
          title="Keep enough G$ available before you continue."
          description={`The wallet needs at least ${stakeAmountLabel} available, and the membership stake remains locked for the full governance term after confirmation.`}
        />

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
      </Card>
    </YStack>
  )
}

function StakeStepContent({
  stakeAmountLabel,
  transactionSteps,
}: {
  stakeAmountLabel: string
  transactionSteps: StepperStepItem[]
}) {
  const stakeSummary = resolveStakeSummary(transactionSteps)

  return (
    <YStack gap="$3">
      <Card elevated>
        <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
          <Badge type="info">
            <BadgeText>{stakeAmountLabel} locked stake</BadgeText>
          </Badge>
          <Badge type={stakeSummary.badgeType}>
            <BadgeText>{stakeSummary.title}</BadgeText>
          </Badge>
        </XStack>

        <Text tone="secondary">
          This screen stays presentational today, but the step statuses already match the future runtime states for pending, active, completed, and failed stake transitions.
        </Text>

        <Stepper
          steps={transactionSteps}
          header={
            <YStack gap="$1">
              <Heading level={5}>Stake progress tracker</Heading>
              <Text tone="secondary">{stakeSummary.description}</Text>
            </YStack>
          }
          maxHeight={320}
        />
      </Card>
    </YStack>
  )
}

function SuccessStepContent({
  finalActions,
  onFinalActionPress,
}: {
  finalActions: GovernanceOnboardingAction[]
  onFinalActionPress?: (actionId: string) => void
}) {
  return (
    <YStack gap="$3">
      <Card elevated>
        <YStack alignItems="center" gap="$3" paddingVertical="$2">
          <SuccessGlyph>
            <Icon name="check" size="lg" color="success" />
          </SuccessGlyph>
          <YStack gap="$1" alignItems="center">
            <Heading level={4}>Governance onboarding complete</Heading>
            <Text tone="secondary" center>
              The final success state keeps the celebratory confirmation compact while still leaving room for one or more post-onboarding redirects.
            </Text>
          </YStack>
          <YStack gap="$2" width="100%">
            {finalActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant ?? 'primary'}
                fullWidth
                disabled={action.disabled}
                onPress={() => onFinalActionPress?.(action.id)}
              >
                {renderButtonLabel(action.label)}
              </Button>
            ))}
          </YStack>
        </YStack>
      </Card>
    </YStack>
  )
}

function GovernanceOnboardingFlow({
  identityStatus,
  disabledHouseOptions,
  initialFieldErrors,
  stakeAmountLabel,
  transactionSteps,
  finalActions,
  onVerifyIdentity,
  onFinalActionPress,
  dataTestId,
}: {
  identityStatus: GovernanceIdentityStatus
  disabledHouseOptions: GovernanceHouse[]
  initialFieldErrors: GovernanceProfileFieldErrors
  stakeAmountLabel: string
  transactionSteps: StepperStepItem[]
  finalActions: GovernanceOnboardingAction[]
  onVerifyIdentity?: () => void
  onFinalActionPress?: (actionId: string) => void
  dataTestId?: string
}) {
  const { currentStep, data, setData, next, back, isFirst, currentIndex } = usePageWizard()
  const [fieldErrors, setFieldErrors] = useState<GovernanceProfileFieldErrors>(initialFieldErrors)

  const wizardData = data as GovernanceWizardData
  const selectedHouse = wizardData.selectedHouse
  const profileDraft = wizardData.profileDraft ?? {}
  const resolvedHouse = selectedHouse ?? 'citizenship'
  const isIdentityVerified = identityStatus === 'verified'
  const isProfileReady = isProfileDraftComplete(resolvedHouse, profileDraft, fieldErrors)

  const updateProfileField = (fieldKey: GovernanceProfileFieldKey, nextValue: string) => {
    setData({
      profileDraft: {
        ...profileDraft,
        [fieldKey]: nextValue,
      },
    })

    setFieldErrors((previousErrors) => {
      const nextErrors = { ...previousErrors }
      delete nextErrors[fieldKey]
      return nextErrors
    })
  }

  const handleProfileContinue = () => {
    const nextFieldErrors = validateProfileDraft(resolvedHouse, profileDraft)
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length === 0) {
      next()
    }
  }

  const handleHouseSelect = (nextHouse: GovernanceHouse) => {
    setData({ selectedHouse: nextHouse })
  }

  let shellTitle = 'Governance onboarding'
  let shellDescription = 'Move through the five-step UI flow before the runtime integration is wired.'
  let shellContent: React.ReactNode = null
  let shellFooter: React.ReactNode = null

  switch (currentStep?.id as GovernanceOnboardingStepId | undefined) {
    case 'welcome':
    default:
      shellTitle = 'Join GoodDollar governance'
      shellDescription = 'Start with identity status, then move through house selection, profile setup, staking progress, and success.'
      shellContent = <WelcomeStepContent identityStatus={identityStatus} />
      shellFooter = (
        <XStack gap="$3" justifyContent="space-between" flexWrap="wrap">
          <Button variant="secondary" onPress={onVerifyIdentity}>
            {renderButtonLabel(isIdentityVerified ? 'Review verification' : 'Verify identity')}
          </Button>
          <Button disabled={!isIdentityVerified} onPress={next}>
            {renderButtonLabel('Continue to house selection')}
          </Button>
        </XStack>
      )
      break

    case 'house':
      shellTitle = 'Select your governance house'
      shellDescription = 'Choose the house that should own the profile and membership stake shown in later steps.'
      shellContent = (
        <HouseStepContent
          selectedHouse={selectedHouse}
          disabledHouseOptions={disabledHouseOptions}
          onHouseSelect={handleHouseSelect}
        />
      )
      shellFooter = (
        <XStack gap="$3" justifyContent="space-between" flexWrap="wrap">
          <Button variant="secondary" onPress={back} disabled={isFirst}>
            {renderButtonLabel('Back')}
          </Button>
          <Button disabled={!selectedHouse} onPress={next}>
            {renderButtonLabel('Continue to profile')}
          </Button>
        </XStack>
      )
      break

    case 'profile':
      shellTitle = `Complete the ${HOUSE_COPY[resolvedHouse].title} profile`
      shellDescription = 'Keep the form readable in light and dark themes while collecting the stake-aware metadata required by the selected house.'
      shellContent = (
        <ProfileStepContent
          selectedHouse={resolvedHouse}
          profileDraft={profileDraft}
          fieldErrors={fieldErrors}
          stakeAmountLabel={stakeAmountLabel}
          onProfileFieldChange={updateProfileField}
        />
      )
      shellFooter = (
        <XStack gap="$3" justifyContent="space-between" flexWrap="wrap">
          <Button variant="secondary" onPress={back}>
            {renderButtonLabel('Back')}
          </Button>
          <Button onPress={handleProfileContinue}>
            {renderButtonLabel(isProfileReady ? 'Continue to stake flow' : 'Validate and continue')}
          </Button>
        </XStack>
      )
      break

    case 'stake':
      shellTitle = 'Track the membership stake journey'
      shellDescription = 'Present the transaction tracker so a future runtime can drive its step statuses without changing the screen structure.'
      shellContent = (
        <StakeStepContent stakeAmountLabel={stakeAmountLabel} transactionSteps={transactionSteps} />
      )
      shellFooter = (
        <XStack gap="$3" justifyContent="space-between" flexWrap="wrap">
          <Button variant="secondary" onPress={back}>
            {renderButtonLabel('Back')}
          </Button>
          <Button onPress={next}>
            {renderButtonLabel('Continue to success')}
          </Button>
        </XStack>
      )
      break

    case 'success':
      shellTitle = 'Membership onboarding completed'
      shellDescription = 'Leave the screen ready for one or more redirect actions after a successful governance onboarding flow.'
      shellContent = (
        <SuccessStepContent finalActions={finalActions} onFinalActionPress={onFinalActionPress} />
      )
      shellFooter = (
        <Text variant="caption" tone="secondary" data-testid="GovernanceOnboardingWidget-step-index">
          Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
        </Text>
      )
      break
  }

  return (
    <PageWizardShell
      title={shellTitle}
      description={shellDescription}
      footer={shellFooter}
      dataTestId={dataTestId}
    >
      {shellContent}
    </PageWizardShell>
  )
}

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
