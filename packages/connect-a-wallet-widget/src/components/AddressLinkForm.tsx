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
      <Heading level={5}>Wallet address to link</Heading>
      <Text secondary>
        Enter the address you want to connect to or disconnect from your GoodID, then check its
        status on each supported chain.
      </Text>
      <Input
        value={addressInput}
        onChangeText={onChangeAddressInput}
        placeholder="0x…"
        disabled={isChecking}
      />
      <ActionButton onPress={onCheckAddress} disabled={isChecking || !addressInput} fullWidth>
        {isChecking ? <Spinner size="sm" /> : <ButtonText>Check address</ButtonText>}
      </ActionButton>
    </AddressFormCard>
  )
}
