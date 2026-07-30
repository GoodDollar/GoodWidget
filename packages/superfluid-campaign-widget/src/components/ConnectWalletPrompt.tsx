import React from 'react'
import { Button, ButtonText } from '@goodwidget/ui'
import { compactButtonProps } from './shared/styles'

interface ConnectWalletPromptProps {
  onConnect: () => void
}

/** Disconnected-state header CTA — replaced by a wallet chip once connected. */
export function ConnectWalletPrompt({ onConnect }: ConnectWalletPromptProps) {
  return (
    // flexBasis={0} keeps this button's hypothetical size (used by the header row's
    // flexWrap line-fit decision) at its automatic minimum instead of its full padded
    // width — otherwise the row wrapped to a new line even at widths where the button
    // (like before flexWrap existed) simply shrinks its padding and fits inline.
    <Button size="sm" {...compactButtonProps} flexBasis={0} onPress={onConnect}>
      <ButtonText>Connect wallet</ButtonText>
    </Button>
  )
}
