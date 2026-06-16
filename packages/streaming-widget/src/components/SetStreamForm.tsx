import React from 'react'
import { ButtonText, Heading, Input, Select, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import type {
  SetStreamFormState,
  StreamTimeUnit,
  WriteStatus,
} from '../widgetRuntimeContract'
import { formatFlowRatePerDay } from './format'
import { ActionButton, SetStreamFormCard, type SuperTokenSymbol } from './shared'

interface SetStreamFormProps {
  form: SetStreamFormState
  token: SuperTokenSymbol
  status: WriteStatus
  error: string | null
  txHash: string | null
  timeUnitOptions: Array<{ value: StreamTimeUnit; label: string }>
  onUpdate: (partial: Partial<SetStreamFormState>) => void
  onSubmit: () => void
  onReset: () => void
}

export function SetStreamForm({
  form,
  token,
  status,
  error,
  txHash,
  timeUnitOptions,
  onUpdate,
  onSubmit,
  onReset,
}: SetStreamFormProps) {
  const isSubmitting = status === 'pending'

  return (
    <SetStreamFormCard>
      <Heading level={4}>Create / Update Stream</Heading>

      <YStack gap="$1">
        <Text variant="label">Recipient address</Text>
        <Input
          placeholder="0x..."
          value={form.receiver}
          onChangeText={(value: string) => onUpdate({ receiver: value })}
          editable={!isSubmitting}
        />
      </YStack>

      <XStack gap="$2" alignItems="flex-end">
        <YStack flex={1} gap="$1">
          <Text variant="label">Amount ({token})</Text>
          <Input
            placeholder="100"
            value={form.amount}
            onChangeText={(value: string) => onUpdate({ amount: value })}
            keyboardType="decimal-pad"
            editable={!isSubmitting}
          />
        </YStack>
        <YStack gap="$1" minWidth={130}>
          <Text variant="label">Period</Text>
          <Select
            value={form.timeUnit}
            onValueChange={(value) => onUpdate({ timeUnit: value as StreamTimeUnit })}
            options={timeUnitOptions}
            disabled={isSubmitting}
          />
        </YStack>
      </XStack>

      {form.flowRate !== null && form.flowRate > 0n && (
        <Text variant="caption" secondary>
          About {formatFlowRatePerDay(form.flowRate)} {token}/day
        </Text>
      )}

      {form.validationError && (
        <Text color="$error" variant="caption">
          {form.validationError}
        </Text>
      )}
      {status === 'error' && error && (
        <Text color="$error" variant="caption">
          {error}
        </Text>
      )}
      {status === 'pending' && (
        <Text variant="caption" secondary>
          Transaction pending...
        </Text>
      )}
      {status === 'success' && txHash && (
        <Text color="$success" variant="caption">
          Stream set! Tx: {txHash.slice(0, 10)}...
        </Text>
      )}

      <XStack gap="$2" alignItems="center">
        <ActionButton
          flex={1}
          disabled={isSubmitting || !!form.validationError || !form.flowRate}
          onPress={onSubmit}
        >
          {isSubmitting ? <Spinner size="sm" /> : <ButtonText>Set Stream</ButtonText>}
        </ActionButton>
        {(status === 'success' || status === 'error') && (
          <ActionButton onPress={onReset}>
            <ButtonText>Reset</ButtonText>
          </ActionButton>
        )}
      </XStack>
    </SetStreamFormCard>
  )
}
