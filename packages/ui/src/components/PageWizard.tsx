import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Stack } from 'tamagui'
import { createComponent } from '../createComponent'
import { XStack, YStack } from '../components-test/Stacks'
import { Heading } from './Heading'
import { Text } from './Text'

export interface PageWizardStep {
  id: string
  title: string
  description?: string
}

export interface PageWizardContextValue {
  currentIndex: number
  currentStep?: PageWizardStep
  steps: PageWizardStep[]
  data: Record<string, unknown>
  setData: (patch: PageWizardDataPatch) => void
  next: () => void
  back: () => void
  goTo: (index: number) => void
  goToStep: (stepId: string) => void
  isFirst: boolean
  isLast: boolean
}

export type PageWizardDataPatch =
  | Record<string, unknown>
  | ((previous: Record<string, unknown>) => Record<string, unknown>)

interface PageWizardProviderProps {
  steps: PageWizardStep[]
  initialStepId?: string
  currentStepId?: string
  initialData?: Record<string, unknown>
  onStepChange?: (stepId: string, index: number) => void
  children: ReactNode
}

interface PageWizardShellProps {
  title: string
  description?: string
  footer?: ReactNode
  children: ReactNode
  dataTestId?: string
  /**
   * Renders the horizontal step track and mobile summary when true. Use false
   * for end-state views (e.g. a celebration screen) where the wizard progress
   * should be hidden from the user.
   */
  showStepper?: boolean
  /**
   * Optional subset of steps to render in the visual stepper indicator.
   * When provided, only these steps appear in the step track while the full
   * steps array from context is still used for navigation. Useful when the
   * wizard has a terminal/celebration step that should not appear in the
   * progress track (e.g. a success screen).
   */
  stepperSteps?: PageWizardStep[]
}

const PageWizardContext = createContext<PageWizardContextValue | null>(null)

const PageWizardStepCircle = createComponent(Stack, {
  name: 'PageWizardStepCircle',
  width: 32,
  height: 32,
  borderRadius: '$full',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '$borderColor',
  backgroundColor: '$background',
})

function resolveStepIndex(steps: PageWizardStep[], stepId?: string): number {
  if (!stepId) {
    return 0
  }

  const nextIndex = steps.findIndex((step) => step.id === stepId)
  return nextIndex >= 0 ? nextIndex : 0
}

export function PageWizardProvider({
  steps,
  initialStepId,
  currentStepId,
  initialData,
  onStepChange,
  children,
}: PageWizardProviderProps) {
  const [uncontrolledStepId, setUncontrolledStepId] = useState<string | undefined>(initialStepId)
  const [data, setDataState] = useState<Record<string, unknown>>(initialData ?? {})

  const resolvedStepId = currentStepId ?? uncontrolledStepId ?? steps[0]?.id
  const currentIndex = resolveStepIndex(steps, resolvedStepId)

  const setData = useCallback((patch: PageWizardDataPatch) => {
    setDataState((previousData) => {
      const resolvedPatch = typeof patch === 'function' ? patch(previousData) : patch
      return {
        ...previousData,
        ...resolvedPatch,
      }
    })
  }, [])

  const updateStep = useCallback(
    (nextIndex: number) => {
      if (steps.length === 0) {
        return
      }

      const boundedIndex = Math.max(0, Math.min(nextIndex, steps.length - 1))
      const nextStep = steps[boundedIndex]

      if (!currentStepId) {
        setUncontrolledStepId(nextStep.id)
      }

      onStepChange?.(nextStep.id, boundedIndex)
    },
    [currentStepId, onStepChange, steps],
  )

  const goTo = useCallback(
    (nextIndex: number) => {
      updateStep(nextIndex)
    },
    [updateStep],
  )

  const goToStep = useCallback(
    (stepId: string) => {
      updateStep(resolveStepIndex(steps, stepId))
    },
    [steps, updateStep],
  )

  const next = useCallback(() => {
    updateStep(currentIndex + 1)
  }, [currentIndex, updateStep])

  const back = useCallback(() => {
    updateStep(currentIndex - 1)
  }, [currentIndex, updateStep])

  const value = useMemo<PageWizardContextValue>(
    () => ({
      currentIndex,
      currentStep: steps[currentIndex],
      steps,
      data,
      setData,
      next,
      back,
      goTo,
      goToStep,
      isFirst: currentIndex <= 0,
      isLast: currentIndex >= steps.length - 1,
    }),
    [back, currentIndex, data, goTo, goToStep, next, setData, steps],
  )

  return <PageWizardContext.Provider value={value}>{children}</PageWizardContext.Provider>
}

export function usePageWizard(): PageWizardContextValue {
  const contextValue = useContext(PageWizardContext)

  if (!contextValue) {
    throw new Error('usePageWizard must be used inside a PageWizardProvider')
  }

  return contextValue
}

export function PageWizardShell({
  title,
  description,
  footer,
  children,
  dataTestId,
  showStepper = true,
  stepperSteps,
}: PageWizardShellProps) {
  const { currentIndex, steps, currentStep } = usePageWizard()
  const activeStep = steps[currentIndex]

  // Use the provided stepperSteps for visual display, falling back to all steps.
  // This allows a terminal step (e.g. success) to be excluded from the track.
  const displaySteps = stepperSteps ?? steps
  const displayCurrentIndex = stepperSteps
    ? stepperSteps.findIndex((s) => s.id === currentStep?.id)
    : currentIndex

  return (
    <YStack gap="$4" width="100%" data-testid={dataTestId}>
      {showStepper ? (
        <YStack gap="$3">
          <YStack
            gap="$1"
            data-testid="PageWizardStep-mobile-summary"
            display="flex"
            $gtSm={{ display: 'none' }}
          >
            <Text variant="caption" tone="secondary">
              {`Step ${displayCurrentIndex >= 0 ? displayCurrentIndex + 1 : currentIndex + 1} of ${displaySteps.length}`}
            </Text>
            {activeStep ? (
              <Text fontWeight="700" color="$color">
                {activeStep.title}
              </Text>
            ) : null}
          </YStack>

          <XStack
            alignItems="center"
            justifyContent="space-between"
            gap="$2"
            width="100%"
            data-testid="PageWizardStep-track"
            display="none"
            $gtSm={{ display: 'flex' }}
          >
            {displaySteps.map((step, index) => {
              const isActiveStep = index === displayCurrentIndex
              const isCompletedStep = index < displayCurrentIndex
              const isLastStep = index === displaySteps.length - 1
              const connectorColor =
                index < displayCurrentIndex ? '$governancePrimary' : '$governanceBorder'

              return (
                <React.Fragment key={step.id}>
                  <YStack
                    alignItems="center"
                    gap="$1"
                    flex={1}
                    minWidth={0}
                    data-testid={`PageWizardStep-${step.id}`}
                    data-state={isActiveStep ? 'active' : isCompletedStep ? 'completed' : 'pending'}
                  >
                    <PageWizardStepCircle
                      backgroundColor={
                        isCompletedStep
                          ? '$governanceSuccess'
                          : isActiveStep
                            ? '$governancePrimary'
                            : '$governanceBackground'
                      }
                      borderColor={
                        isCompletedStep
                          ? '$governanceSuccess'
                          : isActiveStep
                            ? '$governancePrimary'
                            : '$governanceBorder'
                      }
                    >
                      {isCompletedStep ? (
                        // Solid green circle with white checkmark — matches Stitch design
                        <svg
                          width={14}
                          height={14}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M20 6L9 17L4 12" />
                        </svg>
                      ) : (
                        <Text
                          color={
                            isActiveStep ? 'white' : '$governanceTextSecondary'
                          }
                          fontWeight="700"
                        >
                          {index + 1}
                        </Text>
                      )}
                    </PageWizardStepCircle>
                    <Text
                      variant="caption"
                      color={isActiveStep ? '$color' : '$governanceTextSecondary'}
                      fontWeight={isActiveStep ? '700' : '500'}
                      center
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      maxWidth="100%"
                    >
                      {step.title}
                    </Text>
                  </YStack>
                  {!isLastStep ? (
                    <YStack
                      flex={1}
                      height={2}
                      borderRadius="$full"
                      backgroundColor={connectorColor}
                      marginHorizontal="$1"
                      data-testid={`PageWizardConnector-${index}`}
                    />
                  ) : null}
                </React.Fragment>
              )
            })}
          </XStack>

          <YStack gap="$1">
            <Heading level={3}>{title}</Heading>
            {description ? <Text tone="secondary">{description}</Text> : null}
          </YStack>
        </YStack>
      ) : null}

      {children}
      {footer}
    </YStack>
  )
}
