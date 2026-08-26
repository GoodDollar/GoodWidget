import React from 'react'
import { Icon, Text, XStack, YStack } from '@goodwidget/ui'

/**
 * Antseed's own colours, deliberately hardcoded rather than themed: this depicts
 * a row in a different application, so it has to look the same whichever theme
 * the widget is running in — and reading as foreign is the point. Someone should
 * recognise it when they switch windows.
 */
const ANTSEED_SURFACE = '#f4f5f7'
const ANTSEED_TEXT = '#1c2230'
const ANTSEED_MUTED = '#5a6479'
const EXPORT_RING = '#22a06b'
const IMPORT_RING = '#e08b1a'

type SignerRowMode = 'generate' | 'import'

interface AntseedSignerRowProps {
  /**
   * Which arrows to call out. Both glyphs sit on the same row in Antseed and
   * mean opposite things, so the wrong emphasis here is how someone overwrites
   * a key they never backed up.
   */
  mode: SignerRowMode
  /** Signer address Antseed currently holds — illustrative, not the user's own. */
  sampleAddress?: string
}

function ArrowButton({
  direction,
  ringColor,
  dimmed,
}: {
  direction: 'arrow-down' | 'arrow-up'
  ringColor: string
  dimmed: boolean
}) {
  return (
    <YStack
      width={26}
      height={26}
      borderRadius="$full"
      borderWidth={2}
      borderColor={dimmed ? 'transparent' : ringColor}
      alignItems="center"
      justifyContent="center"
      opacity={dimmed ? 0.35 : 1}
    >
      <Icon name={direction} size="xs" color="inherit" />
    </YStack>
  )
}

/**
 * Illustration of Antseed's Profile → Signer row, used to point at the two
 * arrow buttons the setup copy refers to.
 *
 * Drawn from primitives rather than shipped as a bitmap: no widget in this repo
 * bundles image assets, a screenshot would need a loader plus a CSP-safe
 * delivery route for third-party host pages, and a redraw does not go stale
 * every time Antseed adjusts its own layout.
 */
export function AntseedSignerRow({
  mode,
  sampleAddress = '0x395a…2b49',
}: AntseedSignerRowProps) {
  const isGenerate = mode === 'generate'

  return (
    <YStack gap="$2" width="100%">
      <XStack
        backgroundColor={ANTSEED_SURFACE}
        borderRadius="$3"
        paddingHorizontal="$3"
        paddingVertical="$2.5"
        alignItems="center"
        justifyContent="space-between"
        gap="$2"
      >
        <Text fontSize="$3" color={ANTSEED_TEXT}>
          Signer
        </Text>

        <XStack alignItems="center" gap="$2" color={ANTSEED_TEXT}>
          {/* Export/back up. Called out in both modes: it is the step that makes
              an overwrite recoverable, and the only step in the import flow. */}
          <ArrowButton direction="arrow-down" ringColor={EXPORT_RING} dimmed={false} />
          {/* Import. Only relevant when there is a new key to paste in. */}
          <ArrowButton direction="arrow-up" ringColor={IMPORT_RING} dimmed={!isGenerate} />
          <Text fontSize="$2" color={ANTSEED_MUTED}>
            {sampleAddress}
          </Text>
        </XStack>
      </XStack>

      <Text fontSize="$2" secondary textAlign="center" lineHeight="$3">
        {isGenerate ? (
          <>
            In Antseed&apos;s <Text fontSize="$2" fontWeight="700">Profile → Signer</Text>: tap ↓ to
            back up the key it holds now, then ↑ to import this one
          </>
        ) : (
          <>
            In Antseed&apos;s <Text fontSize="$2" fontWeight="700">Profile → Signer</Text>: tap ↓ to
            export the key it holds now, then paste it below
          </>
        )}
      </Text>
    </YStack>
  )
}
