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
import { Icon } from './Icon'
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

/**
 * Individual step bullet — a small numbered circle.
 * Active: filled with $primary, white number.
 * Completed: filled with $success, white checkmark icon.
 * Pending: transparent background, $borderColor border, $placeholderColor number.
 *
 * Design reference: Figma/Stitch GoodWidget Library node 2373-2 — the stepper
 * is always rendered horizontally at the top of the screen on all breakpoints.
 */
const PageWizardStepBullet = createComponent(Stack, {
  name: 'PageWizardStepBullet',
  width: 28,
  height: 28,
  borderRadius: '$full',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1.5,
  borderColor: '$borderColor',
  backgroundColor: '$background',
})

/**
 * Connector line between two step bullets.
 * Filled ($primary) when the left step is completed, grey ($borderColor) otherwise.
 */
const PageWizardConnector = createComponent(Stack, {
  name: 'PageWizardConnector',
  flex: 1,
  height: 2,
  borderRadius: '$full',
  backgroundColor: '$borderColor',
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

  // Use the provided stepperSteps for visual display, falling back to all steps.
  // This allows a terminal step (e.g. success) to be excluded from the track.
  const displaySteps = stepperSteps ?? steps
  const displayCurrentIndex = stepperSteps
    ? (() => {
        const idx = stepperSteps.findIndex((s) => s.id === currentStep?.id)
        if (idx !== -1) return idx
        const fullIndex = steps.findIndex((s) => s.id === currentStep?.id)
        if (fullIndex !== -1) {
          const lastStepperStep = stepperSteps[stepperSteps.length - 1]
          const lastStepperFullIndex = steps.findIndex((s) => s.id === lastStepperStep?.id)
          if (lastStepperFullIndex !== -1 && fullIndex > lastStepperFullIndex) {
            return stepperSteps.length
          }
        }
        return 0
      })()
    : currentIndex

  return (
    <YStack gap="$4" width="100%" data-testid={dataTestId}>
      {showStepper ? (
        <YStack gap="$3">
          {/*
           * Horizontal step track — always rendered on all breakpoints.
           * Design: Figma node 2373-2 / Stitch preview shows the numbered bullet
           * track at the top of the screen on every screen size. There is no
           * mobile-only text fallback replacing the track; only the track itself
           * is shown. The "Step X of Y" label has been removed in favour of the
           * always-visible numbered bullets per the requested design.
           */}
          <XStack
            alignItems="center"
            gap="$2"
            width="100%"
            data-testid="PageWizardStep-track"
          >
            {displaySteps.map((step, index) => {
              const isActiveStep = index === displayCurrentIndex
              const isCompletedStep = index < displayCurrentIndex
              const isLastStep = index === displaySteps.length - 1
              const connectorColor =
                index < displayCurrentIndex ? '$primary' : '$borderColor'

              return (
                <React.Fragment key={step.id}>
                  <YStack
                    alignItems="center"
                    gap="$1"
                    data-testid={`PageWizardStep-${step.id}`}
                    data-state={isActiveStep ? 'active' : isCompletedStep ? 'completed' : 'pending'}
                  >
                    <PageWizardStepBullet
                      backgroundColor={
                        isCompletedStep
                          ? '$success'
                          : isActiveStep
                            ? '$primary'
                            : '$background'
                      }
                      borderColor={
                        isCompletedStep
                          ? '$success'
                          : isActiveStep
                            ? '$primary'
                            : '$borderColor'
                      }
                    >
                      {isCompletedStep ? (
                        <Icon name="check" size="xs" color="white" />
                      ) : (
                        <Text
                          fontSize={11}
                          lineHeight={14}
                          color={
                            isActiveStep ? '$white' : '$placeholderColor'
                          }
                          fontWeight="700"
                        >
                          {index + 1}
                        </Text>
                      )}
                    </PageWizardStepBullet>
                    <Text
                      variant="caption"
                      color={isActiveStep ? '$color' : '$placeholderColor'}
                      fontWeight={isActiveStep ? '700' : '500'}
                      textAlign="center"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {step.title}
                    </Text>
                  </YStack>
                  {!isLastStep ? (
                    <PageWizardConnector
                      backgroundColor={connectorColor}
                      data-testid={`PageWizardConnector-${index}`}
                      // Align connector with the center of the bullet circles,
                      // not the bottom of the label text. marginBottom offsets
                      // the label height so the line sits at bullet midpoint.
                      marginBottom="$3"
                    />
                  ) : null}
                </React.Fragment>
              )
            })}
          </XStack>

          <YStack gap="$1" alignItems="center">
            <Heading level={3} textAlign="center">{title}</Heading>
            {description ? <Text tone="secondary" textAlign="center">{description}</Text> : null}
          </YStack>
        </YStack>
      ) : null}

      {children}
      {footer}
    </YStack>
  )
}
