import React from 'react'
import { XStack } from '@goodwidget/ui'
import type { PasskeyProviderOption } from '../adapter.ts'
import type { PasskeyProviderId } from '../widgetRuntimeContract.ts'
import { ProviderTile } from './ProviderTile.tsx'

export interface ProviderChoiceProps {
  providerOptions: PasskeyProviderOption[]
  selectedProviderId: PasskeyProviderId | null
  onSelect: (providerId: PasskeyProviderId) => void
}

/** Row of provider tiles exposed as one radio group. */
export function ProviderChoice({ providerOptions, selectedProviderId, onSelect }: ProviderChoiceProps) {
  return (
    <XStack gap="$3" role="radiogroup" aria-label="Backup provider">
      {providerOptions.map((providerOption) => (
        <ProviderTile
          key={providerOption.id}
          providerId={providerOption.id}
          label={providerOption.label}
          selected={providerOption.id === selectedProviderId}
          onSelect={onSelect}
        />
      ))}
    </XStack>
  )
}
