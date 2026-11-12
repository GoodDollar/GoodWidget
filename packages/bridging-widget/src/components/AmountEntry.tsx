import React, { useState } from 'react'
import { Input, Text, XStack } from '@goodwidget/ui'
import { formatUnits } from 'viem'
import type { BridgeConfig } from '@goodsdks/bridging-sdk'
import { formatInputAmount, formatTokenAmount } from '../amount'
import { RouteSelectionCard } from './shared'

const G_DOLLAR_DECIMALS = 18

interface AmountEntryProps {
  inputAmount: string
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
  bridgeConfig,
  isBridgeConfigLoading,
  onChangeAmount,
  onPressMax,
}: AmountEntryProps) {
  // Full precision while typing, shortened once the field loses focus — same
  // split as goodreserve-widget, so MAX still spends the exact balance.
  const [isFocused, setIsFocused] = useState(false)
  const displayValue = isFocused ? inputAmount : formatInputAmount(inputAmount)

  const balanceLabel = bridgeConfig
    ? formatTokenAmount(formatUnits(bridgeConfig.tokenBalance, G_DOLLAR_DECIMALS))
    : isBridgeConfigLoading
      ? '…'
      : '0.00'

  return (
    <RouteSelectionCard testID="BridgingWidget-amount-card">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={12} fontWeight="600" color="$secondaryColor">
          Amount
        </Text>
        <XStack gap="$2" alignItems="center">
          <Text fontSize={12} fontWeight="600" color="$secondaryColor">
            Balance: {balanceLabel} G$
          </Text>
          <Text
            testID="BridgingWidget-max"
            fontSize={12}
            fontWeight="600"
            color="$primary"
            cursor="pointer"
            onPress={onPressMax}
          >
            MAX
          </Text>
        </XStack>
      </XStack>
      <XStack justifyContent="space-between" alignItems="center" gap="$3">
        <Text fontSize={21} fontWeight="700" color="$textColor">
          G$
        </Text>
        <Input
          flex={1}
          borderWidth={0}
          backgroundColor="$backgroundTransparent"
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
