import React, { useState } from 'react'
import type { ReactNode } from 'react'
import { XStack, YStack } from 'tamagui'
import { Icon } from './Icon'
import { Text } from './Text'
import { createComponent } from '../createComponent'

export interface AccordionItem {
  id: string
  title: string
  content: ReactNode
}

export interface AccordionProps {
  items: AccordionItem[]
  /** Allow more than one item expanded at once (default false — see below) */
  allowMultipleOpen?: boolean
}

const AccordionFrame = createComponent(YStack, {
  name: 'Accordion',
  width: '100%',
  borderRadius: '$3',
  borderWidth: 1,
  borderColor: '$borderColor',
  overflow: 'hidden',
})

const AccordionRow = createComponent(YStack, {
  name: 'AccordionRow',
  width: '100%',

  variants: {
    isLast: {
      false: { borderBottomWidth: 1, borderColor: '$borderColor' },
    },
  } as const,
})

const AccordionHeader = createComponent(XStack, {
  name: 'AccordionHeader',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  gap: '$2',
  cursor: 'pointer',
  backgroundColor: '$background',

  variants: {
    isOpen: {
      true: { backgroundColor: '$backgroundHover' },
    },
  } as const,
})

const AccordionContent = createComponent(YStack, {
  name: 'AccordionContent',
  paddingHorizontal: '$4',
  paddingBottom: '$3',
  backgroundColor: '$background',
})

export function Accordion({ items, allowMultipleOpen = false }: AccordionProps) {
  // Single-item mode uses a scalar; multi-item mode uses a Set — both stored in one piece of state
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    setOpenIds((current) => {
      const isOpen = current.has(id)

      // Only one item open at a time by default, matching the common FAQ pattern where
      // expanding a new answer collapses the previous one to reduce visual clutter
      if (!allowMultipleOpen) {
        return isOpen ? new Set() : new Set([id])
      }

      const next = new Set(current)
      if (isOpen) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <AccordionFrame>
      {items.map((item, index) => {
        const isOpen = openIds.has(item.id)

        return (
          <AccordionRow key={item.id} isLast={index === items.length - 1}>
            <AccordionHeader
              isOpen={isOpen}
              onPress={() => toggleItem(item.id)}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleItem(item.id)
                }
              }}
            >
              <Text flex={1}>{item.title}</Text>
              <Icon
                name="chevron-down"
                size="sm"
                color="muted"
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 150ms ease',
                }}
              />
            </AccordionHeader>
            {isOpen && (
              <AccordionContent id={`accordion-content-${item.id}`}>{item.content}</AccordionContent>
            )}
          </AccordionRow>
        )
      })}
    </AccordionFrame>
  )
}
