import React from 'react'
import type { ReactNode } from 'react'
import { createComponent } from '../createComponent'
import { XStack, YStack } from '../components-test/Stacks'
import { Text } from './Text'
import { Heading } from './Heading'
import { Badge, BadgeText } from '../components-test/Badge'
import { getChainDisplayName } from '../components-test/ChainBadge'

const WidgetTabsFrame = createComponent(XStack, {
  name: 'WidgetTabs',
  borderBottomWidth: 1,
  borderColor: '$borderColor',
  alignItems: 'center',
  width: '100%',
})

const WidgetTabItem = createComponent(YStack, {
  name: 'WidgetTabItem',
  flex: 1,
  alignItems: 'center',
  paddingVertical: '$2',
  borderBottomWidth: 2,
  borderColor: '$backgroundTransparent',
})

interface WidgetTab {
  id: string
  label: string
}

interface WidgetTabsProps {
  chainId?: number
  tabs: WidgetTab[]
  activeTab: string
  withConnectionStatus?: boolean
  onTabChange: (tabId: string) => void
  isTabDisabled?: (tabId: string) => boolean
  renderLabel?: (tab: WidgetTab, isActive: boolean) => ReactNode
}

export function WidgetTabs({
  chainId,
  tabs,
  activeTab,
  withConnectionStatus = true,
  onTabChange,
  isTabDisabled,
  renderLabel,
}: WidgetTabsProps) {
  return (
    <YStack paddingHorizontal="$3" paddingVertical="$1" gap="$2" width="100%">
      {withConnectionStatus && (
        <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$1">
          <Heading level={4}>GoodDollar</Heading>
          {chainId && (
            <Badge type="info">
              <BadgeText>{getChainDisplayName(chainId)}</BadgeText>
            </Badge>
          )}
        </XStack>
      )}
      <WidgetTabsFrame>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          const disabled = isTabDisabled?.(tab.id) ?? false
          return (
            <WidgetTabItem
              key={tab.id}
              borderColor={isActive ? '$borderColorFocus' : '$backgroundTransparent'}
              onPress={disabled ? undefined : () => onTabChange(tab.id)}
              cursor={disabled ? 'not-allowed' : 'pointer'}
              opacity={disabled ? 0.4 : 1}
            >
              {renderLabel ? (
                renderLabel(tab, isActive)
              ) : (
                <Text variant="label" color={isActive ? '$textColor' : '$placeholderColor'}>
                  {tab.label}
                </Text>
              )}
            </WidgetTabItem>
          )
        })}
      </WidgetTabsFrame>
    </YStack>
  )
}
