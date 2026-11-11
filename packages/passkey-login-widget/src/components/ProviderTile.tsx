import React from 'react'
import { createComponent, Stack, Text } from '@goodwidget/ui'
import type { PasskeyProviderId } from '../widgetRuntimeContract.ts'
import { ProviderLogo } from './ProviderLogo.tsx'

/**
 * Selectable provider tile. Named so the `light_/dark_PasskeyProviderTile` component themes
 * in `config.ts` drive its surface; the selected state uses the primary / info tokens.
 */
const ProviderTileFrame = createComponent(Stack, {
  name: 'PasskeyProviderTile',
  tag: 'button',
  flex: 1,
  alignItems: 'center',
  paddingVertical: '$5',
  gap: '$2',
  borderWidth: 2,
  borderRadius: '$3',
  backgroundColor: '$background',
  borderColor: '$borderColor',
  cursor: 'pointer',
  hoverStyle: { backgroundColor: '$backgroundHover' },
  pressStyle: { backgroundColor: '$backgroundPress' },
  focusStyle: { outlineStyle: 'solid', outlineWidth: 2, outlineColor: '$borderColorFocus' },
  variants: {
    selected: {
      true: { borderColor: '$primary', backgroundColor: '$infoMuted' },
    },
  } as const,
})

export interface ProviderTileProps {
  providerId: PasskeyProviderId
  label: string
  selected: boolean
  onSelect: (providerId: PasskeyProviderId) => void
}

/** One radio option of a provider choice group (B2 / C1). Native button: Space/Enter select it. */
export function ProviderTile({ providerId, label, selected, onSelect }: ProviderTileProps) {
  return (
    <ProviderTileFrame
      role="radio"
      aria-checked={selected}
      aria-label={label}
      selected={selected}
      onPress={() => onSelect(providerId)}
      data-testid={`provider-tile-${providerId}`}
    >
      <ProviderLogo providerId={providerId} />
      <Text bold>{label}</Text>
    </ProviderTileFrame>
  )
}
