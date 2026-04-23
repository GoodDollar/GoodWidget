import React, { useEffect, useState } from 'react'
import { Dialog as TamaguiDialog, Stack, Text as TamaguiText, styled } from 'tamagui'
import { createComponent } from '../createComponent'
import { Icon } from './Icon'
import { Spinner } from '../components-test/Spinner'

// ---------------------------------------------------------------------------
// Dialog store — module-level queue for imperative dialog management.
// Only one dialog is shown at a time; subsequent createDialog calls replace
// the current state (queue management can be layered on top if needed).
// ---------------------------------------------------------------------------

export type DialogStatus = 'idle' | 'pending' | 'success' | 'error'

export interface DialogConfig {
  title?: string
  body?: string
  /** Optional image URL displayed above the title */
  image?: string
  /** Accessible alt text for the image — required when image is provided */
  imageAlt?: string
  acceptLabel?: string
  rejectLabel?: string
  onAccept?: () => void | Promise<void>
  onReject?: () => void
  /** Whether to show the close (×) icon button in the top-right corner */
  showClose?: boolean
}

interface DialogState extends DialogConfig {
  isOpen: boolean
  status: DialogStatus
}

type DialogListener = (state: DialogState) => void

let _state: DialogState = { isOpen: false, status: 'idle' }
const _listeners: Set<DialogListener> = new Set()

function _notify() {
  _listeners.forEach((l) => l({ ..._state }))
}

/** Open the dialog with the given config. Replaces any open dialog. */
export function createDialog(config: DialogConfig) {
  _state = { ...config, isOpen: true, status: 'idle' }
  _notify()
}

/** Update the status of the currently open dialog (e.g. after async accept). */
export function updateDialogStatus(status: DialogStatus) {
  _state = { ..._state, status }
  _notify()
}

/** Imperatively close the dialog. */
export function closeDialog() {
  _state = { isOpen: false, status: 'idle' }
  _notify()
}

/** React hook — subscribes to dialog state; re-renders on changes. */
export function useDialog(): DialogState {
  const [state, setState] = useState<DialogState>({ ..._state })

  useEffect(() => {
    // Sync immediately in case state changed between render and effect
    setState({ ..._state })
    _listeners.add(setState)
    return () => {
      _listeners.delete(setState)
    }
  }, [])

  return state
}

// ---------------------------------------------------------------------------
// Styled sub-parts — each is registered in the manifest via createComponent.
// ---------------------------------------------------------------------------

/**
 * DialogOverlay — full-screen backdrop behind the modal.
 * Named 'DialogOverlay' so host can override via light_DialogOverlay theme.
 */
const DialogOverlay = createComponent(TamaguiDialog.Overlay as any, {
  name: 'DialogOverlay',
  backgroundColor: '$backgroundOverlay',
  animation: ['medium', { opacity: { overshootClamping: true } }] as any,
  enterStyle: { opacity: 0 },
  exitStyle: { opacity: 0 },
})

/**
 * DialogFrame — the modal content container.
 * Named 'Dialog' so Tamagui resolves light_Dialog / dark_Dialog component themes.
 */
const DialogFrame = createComponent(TamaguiDialog.Content as any, {
  name: 'Dialog',
  backgroundColor: '$background',
  borderRadius: '$4',
  padding: '$8',
  width: 345,
  maxWidth: '92%',
  borderWidth: 1,
  borderColor: '$borderColor',
  shadowColor: '$shadowColor',
  shadowRadius: 24,
  shadowOpacity: 1,
  shadowOffset: { width: 0, height: 8 },
  gap: '$4',
  alignSelf: 'center',
  animation: ['medium', { opacity: { overshootClamping: true } }] as any,
  enterStyle: { opacity: 0, scale: 0.97 },
  exitStyle: { opacity: 0, scale: 0.97 },
})

const DialogTitle = styled(TamaguiText, {
  name: 'DialogTitle',
  fontFamily: '$body',
  fontSize: 20,
  fontWeight: '600',
  color: '$color',
  textAlign: 'center',
})

const DialogBody = styled(TamaguiText, {
  name: 'DialogBody',
  fontFamily: '$body',
  fontSize: '$1',
  fontWeight: '400',
  color: '$placeholderColor',
  textAlign: 'center',
  lineHeight: '$1',
})

// ---------------------------------------------------------------------------
// GoodWidgetDialog — reactive dialog driven by the imperative store above.
// Mount <GoodWidgetDialog /> once at the widget boundary; it renders itself
// reactively based on createDialog / updateDialogStatus calls.
// ---------------------------------------------------------------------------

interface GoodWidgetDialogProps {
  /** Optional custom accept button renderer */
  renderAccept?: (onPress: () => void, label: string) => React.ReactNode
  /** Optional custom reject button renderer */
  renderReject?: (onPress: () => void, label: string) => React.ReactNode
}

/**
 * GoodWidgetDialog — mounts once at the widget boundary.
 *
 * Open imperatively with `createDialog({ title, body, onAccept, ... })`.
 * Track async operations by calling `updateDialogStatus('pending' | 'success' | 'error')`.
 *
 * Visual spec (GoodWalletV2):
 *   - Centered modal, $backgroundOverlay backdrop
 *   - $background (Dialog theme) container
 *   - borderRadius $4 (16px), width 345px, padding $8 (32px)
 *   - Optional image, title (20px/600w), body (12px/400w)
 *   - Accept + optional reject CTAs
 *   - Optional close icon button
 *   - Enter/exit opacity animation
 */
export function GoodWidgetDialog({ renderAccept, renderReject }: GoodWidgetDialogProps = {}) {
  const state = useDialog()

  function handleClose() {
    if (state.onReject) state.onReject()
    closeDialog()
  }

  async function handleAccept() {
    if (!state.onAccept) return
    const result = state.onAccept()
    // Use Promise.resolve() identity check to reliably detect thenables
    // across realms (iframes, different execution contexts)
    if (result !== undefined && result !== null && Promise.resolve(result) === result) {
      updateDialogStatus('pending')
      try {
        await result
        updateDialogStatus('success')
      } catch {
        updateDialogStatus('error')
      }
    } else {
      closeDialog()
    }
  }

  const isPending = state.status === 'pending'

  return (
    <TamaguiDialog
      open={state.isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) handleClose()
      }}
      modal
    >
      <TamaguiDialog.Portal>
        <DialogOverlay key="overlay" />
        <DialogFrame key="content">
          {/* Close button */}
          {state.showClose && (
            <Stack position="absolute" top="$3" right="$3" zIndex={1}>
              <Stack
                cursor="pointer"
                padding="$2"
                borderRadius="$full"
                hoverStyle={{ backgroundColor: '$backgroundPress' }}
                onPress={handleClose}
              >
                <Icon name="x" size="sm" color="muted" />
              </Stack>
            </Stack>
          )}

          {/* Optional image — provide imageAlt in DialogConfig for accessibility */}
          {state.image ? (
            <Stack alignItems="center">
              <img
                src={state.image}
                alt={state.imageAlt ?? ''}
                style={{ maxWidth: '100%', borderRadius: 8 }}
              />
            </Stack>
          ) : null}

          {/* Status feedback icon */}
          {state.status === 'pending' && (
            <Stack alignItems="center" paddingBottom="$2">
              <Spinner size="lg" />
            </Stack>
          )}
          {state.status === 'success' && (
            <Stack alignItems="center" paddingBottom="$2">
              <Icon name="check" size="lg" color="success" />
            </Stack>
          )}
          {state.status === 'error' && (
            <Stack alignItems="center" paddingBottom="$2">
              <Icon name="alert-circle" size="lg" color="error" />
            </Stack>
          )}

          {/* Title */}
          {state.title ? (
            <TamaguiDialog.Title asChild>
              <DialogTitle>{state.title}</DialogTitle>
            </TamaguiDialog.Title>
          ) : null}

          {/* Body */}
          {state.body ? (
            <TamaguiDialog.Description asChild>
              <DialogBody>{state.body}</DialogBody>
            </TamaguiDialog.Description>
          ) : null}

          {/* CTAs */}
          <Stack gap="$2" flexDirection="column">
            {state.onAccept &&
              (renderAccept ? (
                renderAccept(handleAccept, state.acceptLabel ?? 'Accept')
              ) : (
                <Stack
                  tag="button"
                  role="button"
                  cursor={isPending ? 'not-allowed' : 'pointer'}
                  opacity={isPending ? 0.6 : 1}
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="$primary"
                  borderRadius="$full"
                  paddingHorizontal="$4"
                  height="$10"
                  onPress={isPending ? undefined : handleAccept}
                  pointerEvents={isPending ? 'none' : undefined}
                >
                  <TamaguiText
                    fontFamily="$body"
                    fontSize="$3"
                    fontWeight="600"
                    color="$white"
                    userSelect="none"
                  >
                    {state.acceptLabel ?? 'Accept'}
                  </TamaguiText>
                </Stack>
              ))}

            {state.onReject &&
              (renderReject ? (
                renderReject(handleClose, state.rejectLabel ?? 'Cancel')
              ) : (
                <Stack
                  tag="button"
                  role="button"
                  cursor="pointer"
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="$backgroundTransparent"
                  borderRadius="$full"
                  paddingHorizontal="$4"
                  height="$10"
                  onPress={handleClose}
                >
                  <TamaguiText
                    fontFamily="$body"
                    fontSize="$3"
                    fontWeight="500"
                    color="$placeholderColor"
                    userSelect="none"
                  >
                    {state.rejectLabel ?? 'Cancel'}
                  </TamaguiText>
                </Stack>
              ))}
          </Stack>
        </DialogFrame>
      </TamaguiDialog.Portal>
    </TamaguiDialog>
  )
}
