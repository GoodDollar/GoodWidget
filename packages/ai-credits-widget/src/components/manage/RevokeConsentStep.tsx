import React from 'react'
import {
  Button,
  ButtonText,
  Icon,
  PermissionList,
  PermissionRow,
  Spinner,
  Text,
  XStack,
  YStack,
  Heading,
} from '@goodwidget/ui'
import { truncateAddress, compactButtonProps, monospaceSingleLineStyle } from '../shared/styles'

interface RevokeConsentStepProps {
  signerPubKey: string | null
  operatorConsentPending?: boolean
  /** Surfaced only after a confirm attempt, so a stale widget error stays out of this sheet. */
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Drawer body for withdrawing the operator authorization — the counterpart to
 * OperatorConsentStep, and deliberately shaped like it so the grant and the
 * withdrawal read as two sides of the same permission.
 */
export function RevokeConsentStep({
  signerPubKey,
  operatorConsentPending = false,
  error = null,
  onConfirm,
  onCancel,
}: RevokeConsentStepProps) {
  return (
    <YStack gap="$3">
      <Heading level={5}>Unauthorize Credit Management?</Heading>
      <Text fontSize="$2" lineHeight="$3">
        This removes the operator&apos;s ability to act on your behalf. It is an on-chain change,
        not a payment.
      </Text>

      <PermissionList>
        <PermissionRow tone="cannot" lead="Stops" divided>
          the operator from fulfilling purchases you initiate.
        </PermissionRow>
      </PermissionList>

      <Text fontSize="$2" tone="soft" lineHeight="$3">
        Your credits and your signer key stay where they are. You can authorize the wallet again at
        any time.
      </Text>

      {signerPubKey && (
        <Text fontSize="$2" lineHeight="$2">
          Signer Address:{' '}
          <Text fontSize="$2" style={monospaceSingleLineStyle}>
            {truncateAddress(signerPubKey)}
          </Text>
        </Text>
      )}

      {error && (
        <XStack gap="$2" alignItems="flex-start">
          <Icon name="alert-circle" size="sm" color="error" />
          <Text fontSize="$2" color="$error" flex={1} lineHeight="$3">
            {error}
          </Text>
        </XStack>
      )}

      <YStack gap="$2">
        <Button
          size="sm"
          variant="outline"
          borderColor="$error"
          {...compactButtonProps}
          disabled={operatorConsentPending}
          onPress={onConfirm}
        >
          {operatorConsentPending ? (
            <XStack gap="$2" alignItems="center">
              <ButtonText color="$error">Unauthorizing…</ButtonText>
              <Spinner size="sm" />
            </XStack>
          ) : (
            <ButtonText color="$error">Unauthorize Credit Management</ButtonText>
          )}
        </Button>
        <Button
          size="sm"
          variant="text"
          {...compactButtonProps}
          disabled={operatorConsentPending}
          onPress={onCancel}
        >
          <ButtonText>Cancel</ButtonText>
        </Button>
      </YStack>
    </YStack>
  )
}
