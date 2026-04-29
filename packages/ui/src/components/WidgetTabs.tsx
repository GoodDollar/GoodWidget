import React from 'react'
import type { ReactNode } from 'react'
import { createComponent } from '../createComponent'
import { XStack, YStack } from '../components-test/Stacks'
import { Text } from './Text'
import { Heading } from './Heading'
import { Badge, BadgeText } from '../components-test/Badge'

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
  renderLabel?: (tab: WidgetTab, isActive: boolean) => ReactNode
}

export function WidgetTabs({
  chainId,
  tabs,
  activeTab,
  withConnectionStatus = true,
  onTabChange,
  renderLabel,
}: WidgetTabsProps) {
  return (
    <YStack gap="$3">
      {withConnectionStatus && (
        <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$1">
          <Heading level={4}>GoodDollar</Heading>
          {chainId && (
            <Badge type="info">
              <BadgeText>Chain {chainId}</BadgeText>
            </Badge>
          )}
        </XStack>
      )}
      <WidgetTabsFrame>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <WidgetTabItem
              key={tab.id}
              borderColor={isActive ? '$borderColorFocus' : '$backgroundTransparent'}
              onPress={() => onTabChange(tab.id)}
              cursor="pointer"
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
