import React, { useEffect, useRef, useState } from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'
import { Icon } from './Icon'
import { Spinner } from '../components-test/Spinner'

// ---------------------------------------------------------------------------
// Toast store — module-level queue for imperative toast management.
// Multiple toasts can be visible at once; each is identified by a unique id.
// ---------------------------------------------------------------------------

export type ToastStatus = 'pending' | 'success' | 'error' | 'info'

export interface ToastConfig {
  message: string
  /** Semantic status — drives the status icon and optional border accent */
  status?: ToastStatus
  /**
   * Auto-close duration in ms.
   * Set to 0 for persistent toasts (requires manual removeToast call).
   */
  duration?: number
}

export interface ToastItem extends ToastConfig {
  id: string
}

type ToastListener = (toasts: ToastItem[]) => void

let _toasts: ToastItem[] = []
const _listeners: Set<ToastListener> = new Set()
// Monotonically increasing counter — avoids Math.random() collisions
let _toastCounter = 0

function _notify() {
  const snapshot = [..._toasts]
  _listeners.forEach((l) => l(snapshot))
}

/** Add a new toast to the queue. Returns the toast id for later updates. */
export function createToast(config: ToastConfig): string {
  const id = String(++_toastCounter)
  _toasts = [..._toasts, { duration: 4000, ...config, id }]
  _notify()
  return id
}

/** Update an existing toast by id (e.g. change status after async operation). */
export function updateToast(id: string, update: Partial<Omit<ToastItem, 'id'>>) {
  _toasts = _toasts.map((t) => (t.id === id ? { ...t, ...update } : t))
  _notify()
}

/** Remove a toast from the queue by id. */
export function removeToast(id: string) {
  _toasts = _toasts.filter((t) => t.id !== id)
  _notify()
}

/** React hook — subscribes to the toast queue; re-renders on changes. */
export function useToast(): ToastItem[] {
  const [toasts, setToasts] = useState<ToastItem[]>([..._toasts])

  useEffect(() => {
    // Sync immediately in case queue changed between render and effect
    setToasts([..._toasts])
    _listeners.add(setToasts)
    return () => {
      _listeners.delete(setToasts)
    }
  }, [])

  return toasts
}

// ---------------------------------------------------------------------------
// Styled sub-parts
// ---------------------------------------------------------------------------

/**
 * ToastFrame — the visible notification surface.
 * Named 'Toast' so Tamagui resolves light_Toast / dark_Toast component themes.
 *
 * Status variant adjusts the border accent color to communicate the toast type:
 *   pending → primary (blue)
 *   success → success (green)
 *   error   → error (red)
 *   info    → primary (blue)
 */
const ToastFrame = createComponent(Stack, {
  name: 'Toast',
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  borderRadius: '$3',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$borderColor',
  shadowColor: '$shadowColor',
  shadowRadius: 8,
  shadowOpacity: 1,
  shadowOffset: { width: 0, height: 4 },
  gap: '$2',
  overflow: 'hidden',

  variants: {
    status: {
      pending: { borderColor: '$primary' },
      success: { borderColor: '$success' },
      error: { borderColor: '$error' },
      info: { borderColor: '$primary' },
    },
  } as const,
})

// ---------------------------------------------------------------------------
// ProgressBar — animated bottom bar for auto-close toasts
// ---------------------------------------------------------------------------

// Inject the progress keyframe once at module load (web only)
let _progressStyleInjected = false
function _ensureProgressStyle() {
  if (_progressStyleInjected || typeof document === 'undefined') return
  _progressStyleInjected = true
  const style = document.createElement('style')
  style.id = 'gw-toast-progress'
  style.textContent = '@keyframes gw-toast-progress { from { width: 100%; } to { width: 0%; } }'
  document.head.appendChild(style)
}

interface ProgressBarProps {
  duration: number
}

/**
 * ProgressBar — thin bottom bar that shrinks from 100% to 0% over `duration` ms.
 */
function ProgressBar({ duration }: ProgressBarProps) {
  _ensureProgressStyle()

  return (
    <Stack
      position="absolute"
      bottom={0}
      left={0}
      height={3}
      backgroundColor="$primary"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={{ animation: `gw-toast-progress ${duration}ms linear forwards` } as any}
    />
  )
}

// ---------------------------------------------------------------------------
// Status icon helper
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status?: ToastStatus }) {
  if (!status) return null
  switch (status) {
    case 'pending':
      return <Spinner size="sm" />
    case 'success':
      return <Icon name="check" size="xs" color="success" />
    case 'error':
      return <Icon name="alert-circle" size="xs" color="error" />
    case 'info':
      return <Icon name="info" size="xs" color="primary" />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Single Toast item component
// ---------------------------------------------------------------------------

interface ToastItemProps extends ToastItem {
  onDismiss: (id: string) => void
}

function ToastItemComponent({ id, message, status, duration = 4000, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss after duration (0 = persistent)
  useEffect(() => {
    if (duration <= 0) return
    timerRef.current = setTimeout(() => {
      setVisible(false)
      // Allow exit animation before removing from queue
      setTimeout(() => onDismiss(id), 200)
    }, duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [id, duration, onDismiss])

  if (!visible) return null

  return (
    <ToastFrame status={status}>
      <StatusIcon status={status} />

      <TamaguiText fontFamily="$body" fontSize="$3" color="$color" flex={1}>
        {message}
      </TamaguiText>

      <Stack
        cursor="pointer"
        padding="$1"
        borderRadius="$full"
        hoverStyle={{ backgroundColor: '$backgroundPress' }}
        onPress={() => {
          setVisible(false)
          setTimeout(() => onDismiss(id), 200)
        }}
      >
        <TamaguiText fontSize="$2" color="$placeholderColor" userSelect="none">
          ✕
        </TamaguiText>
      </Stack>

      {/* Progress bar for auto-close toasts */}
      {duration > 0 && <ProgressBar duration={duration} />}
    </ToastFrame>
  )
}

// ---------------------------------------------------------------------------
// ToastContainer — fixed wrapper at the widget boundary
// ---------------------------------------------------------------------------

/**
 * ToastContainer — renders the active toast queue.
 *
 * Mount once at the widget boundary (e.g. inside GoodWidgetProvider).
 * Position: fixed at the bottom of the widget viewport, centered, max-width 768px.
 * z-index: 1000 (above all widget content).
 *
 * Toasts are added imperatively via `createToast(...)` and auto-dismissed
 * after their `duration` (default 4s). Use `removeToast(id)` for manual removal.
 */
export function ToastContainer() {
  const toasts = useToast()

  if (toasts.length === 0) return null

  return (
    <Stack
      position="fixed"
      bottom="$4"
      left="50%"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={{ transform: 'translateX(-50%)' } as any}
      width="100%"
      maxWidth="$maxContentWidth"
      paddingHorizontal="$4"
      gap="$2"
      zIndex={1000}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItemComponent key={toast.id} {...toast} onDismiss={removeToast} />
      ))}
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Legacy single-toast component (backward-compatible)
// ---------------------------------------------------------------------------

interface ToastProps {
  message: string
  status?: ToastStatus
  duration?: number
  onDismiss?: () => void
  visible?: boolean
}

/**
 * Toast — single stateful toast (legacy / controlled usage).
 *
 * For new code, prefer the imperative `createToast` + `ToastContainer` pattern
 * which handles queuing automatically.
 */
export function Toast({ message, status, duration = 3000, onDismiss, visible = true }: ToastProps) {
  const [show, setShow] = useState(visible)

  useEffect(() => {
    setShow(visible)
  }, [visible])

  useEffect(() => {
    if (!show || duration <= 0) return
    const timer = setTimeout(() => {
      setShow(false)
      onDismiss?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [show, duration, onDismiss])

  if (!show) return null

  return (
    <ToastFrame status={status}>
      <StatusIcon status={status} />
      <TamaguiText fontFamily="$body" fontSize="$3" color="$color" flex={1}>
        {message}
      </TamaguiText>
      <Stack
        cursor="pointer"
        onPress={() => {
          setShow(false)
          onDismiss?.()
        }}
      >
        <TamaguiText fontSize="$2" color="$placeholderColor">
          ✕
        </TamaguiText>
      </Stack>
      {duration > 0 && <ProgressBar duration={duration} />}
    </ToastFrame>
  )
}


