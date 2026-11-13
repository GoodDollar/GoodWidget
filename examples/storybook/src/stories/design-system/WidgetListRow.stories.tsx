import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { GoodWidgetProvider } from '@goodwidget/core'
import { Icon, WidgetListRow, YStack } from '@goodwidget/ui'

const meta: Meta = {
  title: 'Design System/Primitives/WidgetListRow',
  tags: ['autodocs', 'showcase', 'ecosystem-shell'],
  decorators: [(Story, context) => (
    <GoodWidgetProvider defaultTheme={context.parameters.shellTheme ?? 'light'}>
      <YStack width="100%"><Story /></YStack>
    </GoodWidgetProvider>
  )],
}
export default meta
type Story = StoryObj
function Example() {
  const [selected, setSelected] = useState('Claim')
  return (
    <YStack>
      <WidgetListRow label="Claim" description="Claim your daily G$ UBI" icon={<Icon name="wallet" />} active={selected === 'Claim'} onPress={() => setSelected('Claim')} />
      <WidgetListRow label="Reserve" description="Swap through the GoodReserve" icon={<Icon name="globe" />} active={selected === 'Reserve'} onPress={() => setSelected('Reserve')} />
      <WidgetListRow label="Disabled" description="Unavailable" icon={<Icon name="wallet" />} disabled onPress={() => setSelected('Disabled')} />
    </YStack>
  )
}
const play: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await expect(canvas.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  await userEvent.click(canvas.getByRole('button', { name: 'Reserve' }))
  await expect(canvas.getByRole('button', { name: 'Reserve' })).toHaveAttribute('aria-pressed', 'true')
  await expect(canvas.getByRole('button', { name: 'Claim' })).toHaveAttribute('aria-pressed', 'false')
}
export const Light: Story = { render: () => <Example />, play }
export const Dark: Story = { parameters: { shellTheme: 'dark' }, render: () => <Example />, play }
