import React, { useCallback, useEffect, useRef } from 'react'
import { Image } from 'tamagui'
import { Anchor } from './Anchor'
import { Badge, BadgeText } from '../components-test/Badge'
import { Button, ButtonText } from './Button'
import { Drawer } from './Drawer'
import { Heading } from './Heading'
import { Icon } from './Icon'
import { NextTaskCtaCard } from './NextTaskCtaCard'
import { Text } from './Text'
import { createToast } from './Toast'
import { Stack, YStack } from '../components-test/Stacks'
import { invokeHostCallbackSafely } from './invokeHostCallbackSafely'
import { isAllowedExternalCtaUrl } from './nextTaskNavigation'

const NEXT_TASK_HEADLINE = 'One good next step'
const NEXT_TASK_SUPPORTING_COPY =
  'Small actions today create a bigger impact tomorrow. Thanks for being part of GoodDollar.'
const NEXT_TASK_RECOMMENDED_LABEL = 'RECOMMENDED'
const NEXT_TASK_SKIP_LABEL = 'Skip for now'
const NAVIGATION_FAILED_TOAST_MESSAGE = 'Could not open this link. Please try again.'
const REJECTED_URL_TOAST_MESSAGE = 'This link cannot be opened.'

export interface NextTaskContent {
  title: string
  description: string
  ctaLabel: string
  /** Where the CTA points. Handed untouched to `resolveNavigation` when the
   * host passes one; otherwise validated (http/https only) and rendered as an
   * Anchor `href`. */
  ctaTarget: string
  imageUrl?: string
  /** Opaque id surfaced on `onShown` for host-side analytics correlation. */
  contentId?: string
}

export type NextTaskDismissReason = 'close-button' | 'skip-link' | 'overlay'

export interface NextTaskModalProps {
  /** Controlled visibility. The modal calls `onClose` on every dismissal and
   * after a CTA press, so the host/widget state always follows. */
  open: boolean
  /** No fetch, no async — the host decides what content is available and
   * passes it in directly. A missing/null value means "nothing to show". */
  content: NextTaskContent | null | undefined
  onClose: () => void
  /**
   * CTA navigation contract (the host handles it, or an Anchor does — never both):
   *   - passed  → the CTA is a Button; the host owns navigation entirely
   *               (e.g. in-app routing). `ctaTarget` is handed over untouched and
   *               the modal opens no link itself, with no external fallback.
   *   - absent  → the CTA is an `Anchor` to `ctaTarget` (http/https only). A
   *               rejected URL renders a Button that shows an error toast.
   *   - throws or rejects → caught and shown as an error toast; the modal still closes.
   * The error toast needs a mounted `<ToastContainer />`.
   */
  resolveNavigation?: (ctaTarget: string) => void | Promise<void>
  onShown?: (payload: { contentId?: string }) => void
  onClicked?: (payload: { ctaTarget: string }) => void
  onDismissed?: (payload: { reason: NextTaskDismissReason }) => void
  /** Pill shown at the top of the sheet, e.g. "Claim completed". Hidden when omitted. */
  statusLabel?: string
  /** Applied to the rendered card root, for Storybook/Playwright targeting. */
  testID?: string
}

/**
 * NextTaskModal — a controlled bottom sheet that recommends one next action.
 *
 * The host owns `open`; this component never listens for global events.
 * Mount exactly one per page and mount a `<ToastContainer />` so navigation
 * errors are visible.
 */
export function NextTaskModal({
  open,
  content,
  onClose,
  resolveNavigation,
  onShown,
  onClicked,
  onDismissed,
  statusLabel,
  testID,
}: NextTaskModalProps) {
  const isVisible = open && Boolean(content)
  // Guards so exactly one `onShown` fires per open and one terminal action (CTA or dismiss) per open.
  const hasReportedShownRef = useRef(false)
  const hasResolvedRef = useRef(false)

  useEffect(() => {
    if (!isVisible) {
      hasReportedShownRef.current = false
      hasResolvedRef.current = false
      return
    }
    if (hasReportedShownRef.current) return
    hasReportedShownRef.current = true
    invokeHostCallbackSafely('onShown', onShown, { contentId: content?.contentId })
  }, [isVisible, onShown, content?.contentId])

  // Content removed while open: close without reporting a user dismissal.
  useEffect(() => {
    if (open && !content) onClose()
  }, [open, content, onClose])

  const dismissWithReason = useCallback(
    (reason: NextTaskDismissReason) => {
      if (hasResolvedRef.current) return
      hasResolvedRef.current = true
      invokeHostCallbackSafely('onDismissed', onDismissed, { reason })
      onClose()
    },
    [onDismissed, onClose],
  )

  // Host navigation: the host owns the destination; a throw or rejection is shown, never swallowed.
  const handleHostNavigationPress = useCallback(async () => {
    if (!content || !resolveNavigation || hasResolvedRef.current) return
    hasResolvedRef.current = true
    invokeHostCallbackSafely('onClicked', onClicked, { ctaTarget: content.ctaTarget })
    try {
      await resolveNavigation(content.ctaTarget)
    } catch {
      createToast({ message: NAVIGATION_FAILED_TOAST_MESSAGE, status: 'error' })
    }
    onClose()
  }, [content, resolveNavigation, onClicked, onClose])

  // The Anchor opens the link itself; this only reports the click and closes the sheet.
  const handleAnchorPress = useCallback(() => {
    if (!content || hasResolvedRef.current) return
    hasResolvedRef.current = true
    invokeHostCallbackSafely('onClicked', onClicked, { ctaTarget: content.ctaTarget })
    onClose()
  }, [content, onClicked, onClose])

  // A URL that failed the http(s) check is never rendered as an Anchor, so nothing navigates.
  const handleRejectedUrlPress = useCallback(() => {
    if (hasResolvedRef.current) return
    hasResolvedRef.current = true
    createToast({ message: REJECTED_URL_TOAST_MESSAGE, status: 'error' })
    onClose()
  }, [onClose])

  if (!content) return null

  const isCtaTargetOpenableAsLink = !resolveNavigation && isAllowedExternalCtaUrl(content.ctaTarget)
  const handleButtonCtaPress = resolveNavigation ? handleHostNavigationPress : handleRejectedUrlPress

  // `height="full"` (80% snap point): the half-height drawer clips the CTA on a 375x667 phone.
  return (
    <Drawer height="full" open={isVisible} onClose={() => dismissWithReason('overlay')}>
      <YStack alignItems="center" gap="$3" width="100%">
        {statusLabel ? (
          <Badge type="success">
            <Icon name="check" size="sm" />
            <BadgeText>{statusLabel}</BadgeText>
          </Badge>
        ) : null}
        <Heading level={3} textAlign="center">
          {NEXT_TASK_HEADLINE}
        </Heading>
        <Text tone="secondary" center>
          {NEXT_TASK_SUPPORTING_COPY}
        </Text>
        <NextTaskCtaCard testID={testID} data-testid={testID}>
          {content.imageUrl ? (
            <Stack width={96} height={96} borderRadius="$3" overflow="hidden" flexShrink={0}>
              <Image
                source={{ uri: content.imageUrl, width: 96, height: 96 }}
                alt={content.title}
                width="100%"
                height="100%"
                objectFit="cover"
              />
            </Stack>
          ) : null}
          <YStack flex={1} gap="$1" alignItems="flex-start">
            <Badge type="info">
              <BadgeText>{NEXT_TASK_RECOMMENDED_LABEL}</BadgeText>
            </Badge>
            <Heading level={5}>{content.title}</Heading>
            <Text variant="caption" tone="secondary">
              {content.description}
            </Text>
          </YStack>
        </NextTaskCtaCard>
        {isCtaTargetOpenableAsLink ? (
          <Anchor href={content.ctaTarget} onPress={handleAnchorPress}>
            {content.ctaLabel}
          </Anchor>
        ) : (
          <Button variant="primary" fullWidth onPress={handleButtonCtaPress}>
            <ButtonText>{content.ctaLabel}</ButtonText>
          </Button>
        )}
        <Button variant="text" onPress={() => dismissWithReason('skip-link')}>
          <ButtonText>{NEXT_TASK_SKIP_LABEL}</ButtonText>
        </Button>
      </YStack>
    </Drawer>
  )
}
