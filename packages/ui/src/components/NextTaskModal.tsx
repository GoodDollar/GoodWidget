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
import {
  isAllowedExternalCtaUrl,
  NEXT_TASK_HEADLINE,
  NEXT_TASK_SUPPORTING_COPY,
  NEXT_TASK_RECOMMENDED_LABEL,
  NEXT_TASK_SKIP_LABEL,
  NAVIGATION_FAILED_TOAST_MESSAGE,
  REJECTED_URL_TOAST_MESSAGE,
  type NextTaskContent,
} from './nextTaskNavigation'

export {
  NEXT_TASK_HEADLINE,
  NEXT_TASK_SUPPORTING_COPY,
  NEXT_TASK_RECOMMENDED_LABEL,
  NEXT_TASK_SKIP_LABEL,
  NAVIGATION_FAILED_TOAST_MESSAGE,
  REJECTED_URL_TOAST_MESSAGE,
  type NextTaskContent,
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
  // `resolveNavigation` passed: the CTA is a Button; the host owns navigation
  //             entirely (e.g. in-app routing). `ctaTarget` is handed over untouched and
  //             the modal opens no link itself, with no external fallback.
  // `resolveNavigation` absent: the CTA is an `Anchor` to `ctaTarget` (http/https only). A
  //             rejected URL renders a Button that shows an error toast.
  // throws or rejects: caught and shown as an error toast; the drawer stays open so the user can retry or dismiss.
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
  // On error, the drawer stays open so the user can retry or dismiss.
  const handleHostNavigationPress = useCallback(async () => {
    if (!content || !resolveNavigation || hasResolvedRef.current) return
    invokeHostCallbackSafely('onClicked', onClicked, { ctaTarget: content.ctaTarget })
    try {
      await resolveNavigation(content.ctaTarget)
      hasResolvedRef.current = true
      onClose()
    } catch {
      createToast({ message: NAVIGATION_FAILED_TOAST_MESSAGE, status: 'error' })
    }
  }, [content, resolveNavigation, onClicked, onClose])

  // The Anchor opens the link itself; this only reports the click and closes the sheet.
  const handleAnchorPress = useCallback(() => {
    if (!content || hasResolvedRef.current) return
    hasResolvedRef.current = true
    invokeHostCallbackSafely('onClicked', onClicked, { ctaTarget: content.ctaTarget })
    onClose()
  }, [content, onClicked, onClose])

  // A URL that failed the http(s) check is never rendered as an Anchor, so nothing navigates.
  // The drawer stays open on error so the user can inspect or dismiss.
  const handleRejectedUrlPress = useCallback(() => {
    createToast({ message: REJECTED_URL_TOAST_MESSAGE, status: 'error' })
  }, [])

  if (!content) return null

  const isCtaTargetOpenableAsLink = !resolveNavigation && isAllowedExternalCtaUrl(content.ctaTarget)
  const handleButtonCtaPress = resolveNavigation ? handleHostNavigationPress : handleRejectedUrlPress

  const effectiveStatusLabel = content.statusLabel ?? statusLabel
  const effectiveHeadline = content.headline ?? NEXT_TASK_HEADLINE
  const effectiveSupportingCopy = content.supportingCopy ?? NEXT_TASK_SUPPORTING_COPY
  const effectiveRecommendedLabel = content.recommendedLabel ?? NEXT_TASK_RECOMMENDED_LABEL
  const effectiveSkipLabel = content.skipLabel ?? NEXT_TASK_SKIP_LABEL

  // `height="full"` (80% snap point): the half-height drawer clips the CTA on a 375x667 phone.
  return (
    <Drawer height="full" open={isVisible} onClose={() => dismissWithReason('overlay')}>
      <YStack
        alignItems="center"
        gap="$3"
        width="100%"
        maxHeight="100%"
        style={{ overflowY: 'auto' }}
      >
        {effectiveStatusLabel ? (
          <Badge type="success">
            <Icon name="check" size="sm" />
            <BadgeText>{effectiveStatusLabel}</BadgeText>
          </Badge>
        ) : null}
        <Heading level={3} textAlign="center">
          {effectiveHeadline}
        </Heading>
        <Text tone="secondary" center>
          {effectiveSupportingCopy}
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
              <BadgeText>{effectiveRecommendedLabel}</BadgeText>
            </Badge>
            <Heading level={5}>{content.title}</Heading>
            <Text variant="caption" tone="secondary">
              {content.description}
            </Text>
          </YStack>
        </NextTaskCtaCard>
        {isCtaTargetOpenableAsLink ? (
          <Anchor href={content.ctaTarget} onPress={handleAnchorPress} style={{ width: '100%', textDecoration: 'none' }}>
            <Button variant="primary" fullWidth>
              <ButtonText>{content.ctaLabel}</ButtonText>
            </Button>
          </Anchor>
        ) : (
          <Button variant="primary" fullWidth onPress={handleButtonCtaPress}>
            <ButtonText>{content.ctaLabel}</ButtonText>
          </Button>
        )}
        <Button variant="text" onPress={() => dismissWithReason('skip-link')}>
          <ButtonText>{effectiveSkipLabel}</ButtonText>
        </Button>
      </YStack>
    </Drawer>
  )
}
