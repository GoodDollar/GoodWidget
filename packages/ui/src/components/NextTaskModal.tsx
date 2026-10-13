import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Linking } from 'react-native'
import { Drawer } from './Drawer'
import { NextTaskCtaCard } from './NextTaskCtaCard'
import { Heading } from './Heading'
import { Text } from './Text'
import { Button, ButtonText } from './Button'
import { Icon } from './Icon'
import { Stack, YStack } from '../components-test/Stacks'
import { isAllowedExternalCtaUrl, isDevelopmentMode, resolveCtaNavigationOutcome } from './nextTaskNavigation'

/**
 * NextTaskModal does not import `@goodwidget/core` — `packages/ui` has no
 * internal `@goodwidget/*` dependencies (core depends on ui, not the other
 * way around), so importing core's event bus here would create a `ui ->
 * core -> ui` cycle. Instead this duplicates the minimal wire contract
 * (event name + detail shape) that `@goodwidget/core`'s `nextTaskEventBus.ts`
 * also defines, and subscribes directly via `window.addEventListener`. If
 * either side's event name or detail shape changes, the other must be
 * updated to match — there is no shared lower package to centralize this in.
 */
const NEXT_TASK_TRIGGER_EVENT = 'gw:next-task-trigger'

interface NextTaskTriggerDetail {
  source: string
  triggerId: string
  metadata?: Record<string, unknown>
}

export interface NextTaskContent {
  title: string
  description: string
  ctaLabel: string
  /** Where the CTA points. Passed to `resolveNavigation`, then validated
   * and opened externally on the fallback path. */
  ctaTarget: string
  imageUrl?: string
  /** Opaque id surfaced on `onShown` for host-side analytics correlation. */
  contentId?: string
}

export interface NextTaskModalProps {
  /** No fetch, no async — the host decides what content is available and
   * passes it in directly. A missing/null value means "nothing to show". */
  content: NextTaskContent | null | undefined
  /**
   * Lets the host intercept CTA navigation (e.g. in-app routing) instead of
   * the default external-link fallback.
   *   - not passed            → fallback always runs
   *   - returns `true`        → host handled it; no fallback
   *   - returns `false`/void  → fallback runs
   *   - throws                → treated as `false`; error is dev-logged, never thrown further
   */
  resolveNavigation?: (ctaTarget: string) => boolean | void
  onShown?: (payload: { source: string; triggerId: string; contentId?: string }) => void
  onClicked?: (payload: { source: string; triggerId: string; ctaTarget: string }) => void
  onDismissed?: (payload: {
    source: string
    triggerId: string
    reason: 'close-button' | 'skip-link' | 'overlay'
  }) => void
}

type ModalPhase = 'idle' | 'shown'

/**
 * NextTaskModal — listens for `gw:next-task-trigger` and shows `content` in
 * a Drawer when it fires.
 *
 * Integration contract: mount exactly one `NextTaskModal` per page. This
 * component does not detect or coordinate sibling instances — two mounted
 * copies would both react to the same trigger. Multi-instance coordination
 * was deliberately scoped out (round-4 plan revision); keeping to "one per
 * page" is a documentation-only contract, not something enforced at runtime.
 */
export function NextTaskModal({
  content,
  resolveNavigation,
  onShown,
  onClicked,
  onDismissed,
}: NextTaskModalProps) {
  const [phase, setPhase] = useState<ModalPhase>('idle')
  const activeDetailRef = useRef<NextTaskTriggerDetail | null>(null)
  // Guards onClicked/onDismissed so exactly one terminal callback fires per trigger.
  const resolvedRef = useRef(false)

  useEffect(() => {
    const handleTrigger = (event: Event) => {
      const detail = (event as CustomEvent<NextTaskTriggerDetail>).detail
      // Ignore a duplicate trigger that arrives while already showing one.
      if (activeDetailRef.current) return
      if (!content) return

      activeDetailRef.current = detail
      resolvedRef.current = false
      setPhase('shown')
      onShown?.({ source: detail.source, triggerId: detail.triggerId, contentId: content.contentId })
    }

    window.addEventListener(NEXT_TASK_TRIGGER_EVENT, handleTrigger)
    return () => window.removeEventListener(NEXT_TASK_TRIGGER_EVENT, handleTrigger)
    // content is read fresh via closure on each trigger; re-subscribing per
    // content change is unnecessary since the listener only reads the ref/prop at fire time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, onShown])

  const closeWithReason = useCallback(
    (reason: 'close-button' | 'skip-link' | 'overlay') => {
      const detail = activeDetailRef.current
      if (!detail || resolvedRef.current) return
      resolvedRef.current = true
      onDismissed?.({ source: detail.source, triggerId: detail.triggerId, reason })
      activeDetailRef.current = null
      setPhase('idle')
    },
    [onDismissed],
  )

  const handleCtaPress = useCallback(() => {
    const detail = activeDetailRef.current
    if (!detail || !content || resolvedRef.current) return
    resolvedRef.current = true
    onClicked?.({ source: detail.source, triggerId: detail.triggerId, ctaTarget: content.ctaTarget })

    const handledByHost = resolveCtaNavigationOutcome(content.ctaTarget, resolveNavigation, (error) => {
      if (isDevelopmentMode()) {
        console.warn('[NextTaskModal] resolveNavigation threw; falling back to external link.', {
          ctaTarget: content.ctaTarget,
          error,
        })
      }
    })

    if (!handledByHost) {
      if (isAllowedExternalCtaUrl(content.ctaTarget)) {
        void Linking.openURL(content.ctaTarget)
      } else if (isDevelopmentMode()) {
        console.warn('[NextTaskModal] Rejected ctaTarget — only http(s) URLs are allowed.', {
          ctaTarget: content.ctaTarget,
        })
      }
    }

    activeDetailRef.current = null
    setPhase('idle')
  }, [content, onClicked, resolveNavigation])

  if (!content) return null

  return (
    <Drawer open={phase === 'shown'} onClose={() => closeWithReason('overlay')} hideCloseButton>
      <YStack alignItems="flex-end" width="100%">
        <Button
          size="sm"
          variant="ghost"
          iconSize="sm"
          onPress={() => closeWithReason('close-button')}
          aria-label="Close"
        >
          <Icon name="x" size="sm" />
        </Button>
      </YStack>
      <NextTaskCtaCard>
        {content.imageUrl ? (
          <Stack width={96} height={96} borderRadius="$3" overflow="hidden">
            <Image
              source={{ uri: content.imageUrl }}
              accessibilityLabel={content.title}
              resizeMode="cover"
              style={{ width: '100%', height: '100%' }}
            />
          </Stack>
        ) : null}
        <Heading level={5} textAlign="center">
          {content.title}
        </Heading>
        <Text variant="caption" tone="secondary" center>
          {content.description}
        </Text>
        <Button variant="primary" fullWidth onPress={handleCtaPress}>
          <ButtonText>{content.ctaLabel}</ButtonText>
        </Button>
        <Button variant="text" onPress={() => closeWithReason('skip-link')}>
          <ButtonText>Skip</ButtonText>
        </Button>
      </NextTaskCtaCard>
    </Drawer>
  )
}
