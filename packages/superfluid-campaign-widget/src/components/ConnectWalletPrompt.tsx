import React from 'react'
import { Button, ButtonText } from '@goodwidget/ui'

interface ConnectWalletPromptProps {
  onConnect: () => void
}

/** Disconnected-state header CTA — replaced by a wallet chip once connected. */
export function ConnectWalletPrompt({ onConnect }: ConnectWalletPromptProps) {
  return (
    <Button size="sm" onPress={onConnect}>
      <ButtonText>Connect wallet</ButtonText>
    </Button>
  )
}
