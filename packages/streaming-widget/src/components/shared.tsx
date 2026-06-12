import React from 'react'
import {
  Badge,
  BadgeText,
  Card,
  YStack,
  createComponent,
} from '@goodwidget/ui'
import type { WriteStatus } from '../widgetRuntimeContract'

export type SuperTokenSymbol = 'G$' | 'SUP'

export const StreamingTabContent = createComponent(YStack, {
  name: 'StreamingTabContent',
  flex: 1,
  gap: '$3',
  paddingVertical: '$3',
})

export const StreamRow = createComponent(Card, {
  name: 'StreamRow',
  padding: '$3',
  gap: '$2',
})

export const PoolRow = createComponent(Card, {
  name: 'PoolRow',
  padding: '$3',
  gap: '$2',
})

export const EmptyStateCard = createComponent(Card, {
  name: 'EmptyStateCard',
  padding: '$6',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: '$3',
})

export const ErrorStateCard = createComponent(Card, {
  name: 'ErrorStateCard',
  padding: '$4',
  gap: '$2',
})

export const SetStreamFormCard = createComponent(Card, {
  name: 'SetStreamFormCard',
  padding: '$4',
  gap: '$3',
})

export const BalanceCard = createComponent(Card, {
  name: 'BalanceCard',
  padding: '$4',
  gap: '$2',
})

export function WriteStatusBadge({ status }: { status: WriteStatus }) {
  if (status === 'idle') return null
  if (status === 'pending') {
    return (
      <Badge type="warning">
        <BadgeText>Pending</BadgeText>
      </Badge>
    )
  }
  if (status === 'success') {
    return (
      <Badge type="success">
        <BadgeText>Done</BadgeText>
      </Badge>
    )
  }

  return (
    <Badge type="error">
      <BadgeText>Failed</BadgeText>
    </Badge>
  )
}
