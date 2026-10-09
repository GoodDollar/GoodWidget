import React from 'react'
import { ButtonText, Heading, Input, Spinner, Text } from '@goodwidget/ui'
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
    <AddressFormCard>
      <Heading level={6} fontSize="$1">Connect or Disconnect Address</Heading>
      <Text fontSize="$1" secondary>
        Enter the address you want to connect to or disconnect from your GoodID, then check its
        status on each supported chain.
      </Text>
      <Input
        value={addressInput}
        onChangeText={onChangeAddressInput}
        placeholder="0x…"
        disabled={isChecking}
        size="sm"
      />
      <ActionButton onPress={onCheckAddress} disabled={isChecking || !addressInput} fullWidth size="sm">
        {isChecking ? <Spinner size="sm" /> : <ButtonText fontSize="$1">Check address</ButtonText>}
      </ActionButton>
    </AddressFormCard>
  )
}
