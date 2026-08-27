import React from 'react'
import { Text, YStack } from '@goodwidget/ui'
import antseedSignerRow from '../../assets/antseed-signer-row.png'

type SignerRowMode = 'generate' | 'import'

interface AntseedSignerRowProps {
  /**
   * Which arrow the caption points at. Both glyphs sit on the same Antseed row
   * and do opposite things, so naming the wrong one is how someone overwrites a
   * key they never backed up.
   */
  mode: SignerRowMode
}

/**
 * Screenshot of Antseed's Profile → Signer row, captioned per flow.
 *
 * The image shows both arrow buttons because that is what the user will
 * actually see; the caption below names the one to press. Deliberately one
 * action per flow — an earlier version also told the user to back up first,
 * which duplicated the warning rendered just above this in BuyerKeyPanel and
 * left two different keys to keep straight in a single sentence. Backing up
 * belongs to that warning; this line only answers "which arrow".
 */
export function AntseedSignerRow({ mode }: AntseedSignerRowProps) {
  const isGenerate = mode === 'generate'

  return (
    <YStack gap="$2" width="100%">
      <img
        src={antseedSignerRow}
        alt="The Signer row in Antseed's Profile, showing a download arrow to export the current key and an upload arrow to import a new one"
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
      />

      <Text fontSize="$2" secondary textAlign="center" lineHeight="$3">
        {isGenerate ? (
          <>
            In Antseed&apos;s{' '}
            <Text fontSize="$2" fontWeight="700">
              Profile → Signer
            </Text>
            , copy the key above and paste it in Antseed.
          </>
        ) : (
          <>
            In Antseed&apos;s{' '}
            <Text fontSize="$2" fontWeight="700">
              Profile → Signer
            </Text>
            , tap ↓ to export your key, then paste it below.
          </>
        )}
      </Text>
    </YStack>
  )
}
