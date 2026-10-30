import React from 'react'
import { ButtonText, Heading, Input, Spinner, Text } from '@goodwidget/ui'
import { ActionButton, AddressFormCard } from './shared'

interface AddressLinkFormProps {
  addressInput: string
  isChecking: boolean
  disabled?: boolean
  error?: string | null
  onChangeAddressInput: (value: string) => void
  onCheckAddress: () => void
}

export function AddressLinkForm({
  addressInput,
  isChecking,
  disabled,
  error,
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
        aria-label="Wallet address"
        aria-invalid={!!error}
        errorMessage={error ?? undefined}
        disabled={disabled || isChecking}
        size="sm"
      />
      <ActionButton onPress={onCheckAddress} disabled={disabled || isChecking || !addressInput.trim()} fullWidth size="sm">
        {isChecking ? <Spinner size="sm" /> : <ButtonText fontSize="$1">Check address</ButtonText>}
      </ActionButton>
    </AddressFormCard>
  )
}
