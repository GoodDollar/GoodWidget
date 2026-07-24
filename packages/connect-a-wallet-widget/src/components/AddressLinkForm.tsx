import React from 'react'
import { ButtonText, Heading, Input, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import { ActionButton, AddressFormCard } from './shared'

interface AddressLinkFormProps {
  addressInput: string
  isChecking: boolean
  onChangeAddressInput: (value: string) => void
  onCheckAddress: () => void
}

export function AddressLinkForm({
  addressInput,
  isChecking,
  onChangeAddressInput,
  onCheckAddress,
}: AddressLinkFormProps) {
  return (
    <AddressFormCard gap="$2">
      <Heading level={5} fontWeight="600">
        Wallet address to link
      </Heading>
      <Text tone="secondary" fontSize="$2" lineHeight="$2">
        Enter the address you want to connect to or disconnect from your GoodID, then check its
        status on each supported chain.
      </Text>
      {/* Input and action button share a single row so the pair reads as one
          validate bar, matching the design reference's compact address field. */}
      <XStack gap="$2" alignItems="center" paddingTop="$1">
        <YStack flex={1}>
          <Input
            value={addressInput}
            onChangeText={onChangeAddressInput}
            placeholder="0x…"
            disabled={isChecking}
          />
        </YStack>
        <ActionButton onPress={onCheckAddress} disabled={isChecking || !addressInput} minWidth={128}>
          {isChecking ? <Spinner size="sm" /> : <ButtonText>Check address</ButtonText>}
        </ActionButton>
      </XStack>
    </AddressFormCard>
  )
}
