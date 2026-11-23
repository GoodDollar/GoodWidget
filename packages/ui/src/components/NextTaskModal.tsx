import React, { useCallback, useEffect, useRef } from 'react'
import { Image, Sheet } from 'tamagui'
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

export const NEXT_TASK_HEADLINE = 'One good next step'
export const NEXT_TASK_SUPPORTING_COPY =
  'Small actions today create a bigger impact tomorrow. Thanks for being part of GoodDollar.'
export const NEXT_TASK_RECOMMENDED_LABEL = 'RECOMMENDED'
export const NEXT_TASK_SKIP_LABEL = 'Skip for now'
export const NEXT_TASK_STATUS_LABEL = 'Claim completed'
export const NAVIGATION_FAILED_TOAST_MESSAGE = 'Could not open this link. Please try again.'
export const REJECTED_URL_TOAST_MESSAGE = 'This link cannot be opened.'

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
  /** Optional headline overriding the default ("One good next step" / NEXT_TASK_HEADLINE). */
  headline?: string
  /** Optional supporting copy overriding the default text (NEXT_TASK_SUPPORTING_COPY). */
  supportingCopy?: string
  /** Optional badge label overriding the default ("RECOMMENDED" / NEXT_TASK_RECOMMENDED_LABEL). */
  recommendedLabel?: string
  /** Optional label overriding the default ("Skip for now" / NEXT_TASK_SKIP_LABEL). */
  skipLabel?: string
  /** Optional status pill label (e.g. "Claim completed"). When omitted on both content
   * and prop, no status pill is rendered. When set, takes precedence over the `statusLabel`
   * prop on `NextTaskModal`. */
  statusLabel?: string
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
   *   - throws or rejects → caught and shown as an error toast; the modal stays open so the user can retry or dismiss.
   * The error toast needs a mounted `<ToastContainer />`.
   */
  resolveNavigation?: (ctaTarget: string) => void | Promise<void>
  onShown?: (payload: { contentId?: string }) => void
  onClicked?: (payload: { ctaTarget: string }) => void
  onDismissed?: (payload: { reason: NextTaskDismissReason }) => void
  /**
   * Optional status pill shown at the top of the sheet, e.g. "Claim completed".
   * If `content.statusLabel` is also set, `content.statusLabel` takes precedence over this prop.
   * If both are omitted, no status pill is rendered.
   */
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
  // Guards so exactly one `onShown` fires per open and one `onClicked` per open intent.
  const hasReportedShownRef = useRef(false)
  const hasReportedClickedRef = useRef(false)
  const isNavigatingRef = useRef(false)
  const hasClosedRef = useRef(false)
  // Tracks the active visibility/navigation session so stale async completions after close or unmount are ignored.
  const navigationGenerationRef = useRef(0)

  useEffect(() => {
    if (!isVisible) {
      navigationGenerationRef.current += 1
      hasReportedShownRef.current = false
      hasReportedClickedRef.current = false
      isNavigatingRef.current = false
      hasClosedRef.current = false
    }
  }, [isVisible])

  useEffect(
    () => () => {
      navigationGenerationRef.current += 1
    },
    [],
  )

  useEffect(() => {
    if (!isVisible || hasReportedShownRef.current) return
    hasReportedShownRef.current = true
    invokeHostCallbackSafely('onShown', onShown, { contentId: content?.contentId })
  }, [isVisible, onShown, content?.contentId])

  // Content removed while open: close without reporting a user dismissal.
  useEffect(() => {
    if (open && !content) onClose()
  }, [open, content, onClose])

  const dismissWithReason = useCallback(
    (reason: NextTaskDismissReason) => {
      if (hasClosedRef.current) return
      hasClosedRef.current = true
      isNavigatingRef.current = false
      navigationGenerationRef.current += 1
      invokeHostCallbackSafely('onDismissed', onDismissed, { reason })
      onClose()
    },
    [onDismissed, onClose],
  )

  // Host navigation: the host owns the destination; a throw or rejection is shown, never swallowed.
  // The drawer stays open so the user can retry or dismiss. Dismissal remains unblocked during pending navigation.
  const handleHostNavigationPress = useCallback(async () => {
    if (!content || !resolveNavigation || hasClosedRef.current || isNavigatingRef.current) return
    isNavigatingRef.current = true
    const attemptGeneration = ++navigationGenerationRef.current

    if (!hasReportedClickedRef.current) {
      hasReportedClickedRef.current = true
      invokeHostCallbackSafely('onClicked', onClicked, { ctaTarget: content.ctaTarget })
    }

    try {
      await resolveNavigation(content.ctaTarget)
    } catch {
      if (attemptGeneration !== navigationGenerationRef.current) return
      isNavigatingRef.current = false
      createToast({ message: NAVIGATION_FAILED_TOAST_MESSAGE, status: 'error' })
      return
    }

    if (attemptGeneration !== navigationGenerationRef.current) return
    isNavigatingRef.current = false
    hasClosedRef.current = true
    onClose()
  }, [content, resolveNavigation, onClicked, onClose])

  // The Anchor opens the link itself; this only reports the click and closes the sheet.
  const handleAnchorPress = useCallback(() => {
    if (!content || hasClosedRef.current) return
    hasClosedRef.current = true
    if (!hasReportedClickedRef.current) {
      hasReportedClickedRef.current = true
      invokeHostCallbackSafely('onClicked', onClicked, { ctaTarget: content.ctaTarget })
    }
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

  // `height="fit"`: the sheet height follows its content up to the viewport cap, with inner scrolling for long copy or landscape.
  // Sheet.ScrollView ensures long copy scrolls smoothly on native platforms as well as web.
  return (
    <Drawer height="fit" open={isVisible} onClose={() => dismissWithReason('overlay')}>
      <Sheet.ScrollView
        width="100%"
        flex={1}
        minHeight={0}
        showsVerticalScrollIndicator={false}
      >
        <YStack
          alignItems="center"
          gap="$4"
          width="100%"
          paddingBottom="$2"
        >
          <YStack alignItems="center" gap="$2.5" width="100%">
            {effectiveStatusLabel ? (
              <Badge type="success">
                <Icon name="check" size="xs" />
                <BadgeText>{effectiveStatusLabel}</BadgeText>
              </Badge>
            ) : null}
            <Heading level={5} textAlign="center">
              {effectiveHeadline}
            </Heading>
            <Text tone="secondary" center fontSize="$2" lineHeight="$2">
              {effectiveSupportingCopy}
            </Text>
          </YStack>
          <NextTaskCtaCard
            theme="Card"
            testID={testID}
            data-testid={testID}
            {...(!content.imageUrl ? { padding: '$4' } : {})}
          >
            {content.imageUrl ? (
              <Stack
                width={96}
                height={96}
                borderRadius="$3"
                overflow="hidden"
                flexShrink={0}
                alignSelf="flex-start"
                backgroundColor="$backgroundHover"
              >
                <Image
                  source={{ uri: content.imageUrl, width: 96, height: 96 }}
                  alt={content.title}
                  width="100%"
                  height="100%"
                  objectFit="cover"
                />
              </Stack>
            ) : null}
            <YStack flex={1} gap="$1.5" alignItems="flex-start">
              <Badge type="info">
                <BadgeText>{effectiveRecommendedLabel}</BadgeText>
              </Badge>
              <Heading level={6} fontSize="$3" lineHeight="$3" $sm={{ fontSize: '$2', lineHeight: '$2' }}>{content.title}</Heading>
              <Text fontSize="$2" lineHeight="$2" tone="secondary">
                {content.description}
              </Text>
            </YStack>
          </NextTaskCtaCard>
          <YStack width="100%" alignItems="center" gap="$4">
            {/*
             * Note: Anchor wraps Tamagui's Anchor directly rather than through `createComponent`
             * (so native `onPress` propagates to `Linking.openURL`), and therefore does not
             * participate in the theme-manifest override chain. The wrapped Button provides
             * standard themeable styling.
             */}
            {isCtaTargetOpenableAsLink ? (
              <Anchor
                href={content.ctaTarget}
                onPress={handleAnchorPress}
                style={{ width: '100%', textDecoration: 'none' }}
              >
                <Button
                  variant="primary"
                  fullWidth
                  tag="span"
                  role="presentation"
                  tabIndex={-1}
                  pointerEvents="none"
                >
                  <ButtonText>{content.ctaLabel}</ButtonText>
                </Button>
              </Anchor>
            ) : (
              <Button variant="primary" fullWidth onPress={handleButtonCtaPress}>
                <ButtonText>{content.ctaLabel}</ButtonText>
              </Button>
            )}
            <Button variant="text" onPress={() => dismissWithReason('skip-link')}>
              <ButtonText color="$textSecondary" fontWeight="400">{effectiveSkipLabel}</ButtonText>
            </Button>
          </YStack>
        </YStack>
      </Sheet.ScrollView>
    </Drawer>
  )
}
