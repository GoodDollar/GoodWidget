export type StepperStepStatus = 'pending' | 'ready' | 'active' | 'completed' | 'failed' | 'attention'

export type MarkerStyle =
  | { type: 'ring'; border: string; fill?: string }
  | { type: 'fill'; color: string; icon: 'check' | 'alert-triangle' | 'loader'; spin?: boolean }

export type StepStyle = {
  connector: string
  label: string
  statusColor?: string
  titleColor: string
  borderColor: string
  active: boolean
  failed: boolean
  attention: boolean
  marker: MarkerStyle
}

export const MARKER_SIZE = 28
export const ROW_GAP_PX = 8
export const FOCUSED_STATUSES = new Set<StepperStepStatus>([
  'ready',
  'active',
  'failed',
  'attention',
])

export const STEP_STYLE: Record<StepperStepStatus, StepStyle> = {
  pending: {
    connector: '$borderColor',
    label: 'Pending',
    titleColor: '$placeholderColor',
    borderColor: 'transparent',
    active: false,
    failed: false,
    attention: false,
    marker: { type: 'ring', border: '$borderColor' },
  },
  ready: {
    connector: '$borderColor',
    label: 'Ready',
    statusColor: '$primary',
    titleColor: '$color',
    borderColor: '$borderColorFocus',
    active: true,
    failed: false,
    attention: false,
    marker: { type: 'ring', border: '$borderColorFocus', fill: '$backgroundHover' },
  },
  active: {
    connector: '$borderColor',
    label: 'In progress',
    statusColor: '$primary',
    titleColor: '$color',
    borderColor: '$borderColorFocus',
    active: true,
    failed: false,
    attention: false,
    marker: { type: 'fill', color: '$borderColorFocus', icon: 'loader', spin: true },
  },
  completed: {
    connector: '$borderColorFocus',
    label: 'Completed',
    statusColor: '$success',
    titleColor: '$colorSoft',
    borderColor: 'transparent',
    active: false,
    failed: false,
    attention: false,
    marker: { type: 'fill', color: '$borderColorFocus', icon: 'check' },
  },
  failed: {
    connector: '$borderColor',
    label: 'Needs attention',
    statusColor: '$warning',
    titleColor: '$warning',
    borderColor: '$warning',
    active: false,
    failed: true,
    attention: false,
    marker: { type: 'fill', color: '$warning', icon: 'alert-triangle' },
  },
  attention: {
    connector: '$borderColor',
    label: 'In progress',
    statusColor: '$warning',
    titleColor: '$warning',
    borderColor: '$warning',
    active: true,
    failed: false,
    attention: true,
    marker: { type: 'ring', border: '$warning', fill: '$background' },
  },
}
