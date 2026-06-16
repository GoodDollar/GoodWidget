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
  setData: (patch: Record<string, unknown>) => void
  next: () => void
  back: () => void
  goTo: (index: number) => void
  goToStep: (stepId: string) => void
  isFirst: boolean
  isLast: boolean
}

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

  const setData = useCallback((patch: Record<string, unknown>) => {
    setDataState((previousData) => ({
      ...previousData,
      ...patch,
    }))
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
}: PageWizardShellProps) {
  const { currentIndex, steps } = usePageWizard()

  return (
    <YStack gap="$4" width="100%" data-testid={dataTestId}>
      <YStack gap="$3">
        <XStack
          gap="$3"
          overflow="auto"
          paddingBottom="$1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {steps.map((step, index) => {
            const isActiveStep = index === currentIndex
            const isCompletedStep = index < currentIndex
            const stepColor = isActiveStep || isCompletedStep ? '$white' : '$placeholderColor'
            const connectorColor = index < currentIndex ? '$success' : '$borderColor'

            return (
              <XStack key={step.id} alignItems="center" gap="$2" minWidth={120} flexShrink={0}>
                <YStack alignItems="center" gap="$1.5">
                  <PageWizardStepCircle
                    backgroundColor={
                      isActiveStep ? '$primary' : isCompletedStep ? '$success' : '$background'
                    }
                    borderColor={
                      isActiveStep ? '$primary' : isCompletedStep ? '$success' : '$borderColor'
                    }
                  >
                    <Text color={stepColor} fontWeight="700">
                      {index + 1}
                    </Text>
                  </PageWizardStepCircle>
                  <Text
                    variant="caption"
                    color={isActiveStep ? '$color' : '$placeholderColor'}
                    fontWeight={isActiveStep ? '700' : '500'}
                    center
                  >
                    {step.title}
                  </Text>
                </YStack>
                {index < steps.length - 1 ? (
                  <YStack flex={1} height={2} borderRadius="$full" backgroundColor={connectorColor} />
                ) : null}
              </XStack>
            )
          })}
        </XStack>

        <YStack gap="$1">
          <Heading level={3}>{title}</Heading>
          {description ? <Text tone="secondary">{description}</Text> : null}
        </YStack>
      </YStack>

      {children}
      {footer}
    </YStack>
  )
}
