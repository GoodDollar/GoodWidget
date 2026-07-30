import React from 'react'
import { Button, ButtonText } from '@goodwidget/ui'
import { compactButtonProps } from './shared/styles'

interface ConnectWalletPromptProps {
  onConnect: () => void
}

/** Disconnected-state header CTA — replaced by a wallet chip once connected. */
export function ConnectWalletPrompt({ onConnect }: ConnectWalletPromptProps) {
  return (
    // flexShrink={0} keeps this button at its true natural (min-content) size for
    // both the header row's flexWrap line-fit decision and its rendered width —
    // unlike flexBasis={0}, which let the row's flex algorithm shrink the button
    // toward zero width and visibly break its "Connect wallet" label, since the
    // Button's own rounded-corner clipping disables the browser's automatic
    // minimum-size protection. The button's label doesn't reflow, so its natural
    // size is also the correct minimum: wrap only when that size doesn't fit.
    <Button size="sm" {...compactButtonProps} flexShrink={0} onPress={onConnect}>
      <ButtonText>Connect wallet</ButtonText>
    </Button>
  )
}
