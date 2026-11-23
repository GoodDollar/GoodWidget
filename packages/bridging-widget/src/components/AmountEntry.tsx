import React, { useState } from 'react'
import { Button, ButtonText, InputFrame, Text, XStack } from '@goodwidget/ui'
import { formatUnits } from 'viem'
import type { BridgeConfig } from '@goodsdks/bridging-sdk'
import { getChainDecimals } from '../adapter/chains'
import { formatInputAmount, formatTokenAmount } from '../amount'
import { RouteSelectionCard } from './shared'

interface AmountEntryProps {
  inputAmount: string
  sourceChainId?: number | null
  isConnected?: boolean
  bridgeConfig: BridgeConfig | null
  isBridgeConfigLoading: boolean
  onChangeAmount: (raw: string) => void
  onPressMax: () => void
}

// G$ amount field for the Bridge tab: balance + MAX on top, a right-aligned
// numeric input below. Mirrors goodreserve-widget's "Swap from" card so the
// two widgets read as the same family.
export function AmountEntry({
  inputAmount,
  sourceChainId,
  isConnected = true,
  bridgeConfig,
  isBridgeConfigLoading,
  onChangeAmount,
  onPressMax,
}: AmountEntryProps) {
  // Full precision while typing, shortened once the field loses focus — same
  // split as goodreserve-widget, so MAX still spends the exact balance.
  const [isFocused, setIsFocused] = useState(false)
  const displayValue = isFocused ? inputAmount : formatInputAmount(inputAmount)

  const sourceDecimals = getChainDecimals(sourceChainId)
  const balanceLabel = !isConnected
    ? '—'
    : bridgeConfig
      ? formatTokenAmount(formatUnits(bridgeConfig.tokenBalance, sourceDecimals))
      : isBridgeConfigLoading
        ? '…'
        : '\u2014'

  return (
    <RouteSelectionCard testID="BridgingWidget-amount-card" padding="$3" gap="$1">
      <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" columnGap="$2">
        <Text fontSize={12} fontWeight="600" color="$secondaryColor">
          Amount to send
        </Text>
        <XStack gap="$2" alignItems="center">
          <Text fontSize={12} fontWeight="600" color="$secondaryColor">
            Balance: {balanceLabel} G$
          </Text>
          <Button
            testID="BridgingWidget-max"
            size="sm"
            variant="ghost"
            paddingHorizontal="$1"
            disabled={!isConnected || !bridgeConfig || isBridgeConfigLoading}
            onPress={onPressMax}
          >
            <ButtonText fontSize={12} color="$primary">MAX</ButtonText>
          </Button>
        </XStack>
      </XStack>
      <XStack justifyContent="space-between" alignItems="center" gap="$3">
        <Text fontSize={21} fontWeight="700" color="$textColor">
          G$
        </Text>
        <InputFrame
          flex={1}
          minWidth={0}
          aria-label="Amount to send"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$2"
          backgroundColor="$backgroundInput"
          paddingHorizontal="$3"
          minHeight="$8"
          fontWeight="700"
          color="$textColor"
          inputMode="decimal"
          style={{ textAlign: 'right', fontSize: '21px' }}
          value={displayValue}
          placeholder="0.00"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChangeAmount(event.target.value)
          }
        />
      </XStack>
    </RouteSelectionCard>
  )
}
