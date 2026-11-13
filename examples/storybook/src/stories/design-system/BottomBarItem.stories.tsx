import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { GoodWidgetProvider } from '@goodwidget/core'
import { BottomAppBar, BottomBarItem, Text, YStack } from '@goodwidget/ui'
import { EcosystemIcon } from './EcosystemIcons'

const meta: Meta = {
  title: 'Design System/Primitives/BottomBarItem',
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
  const [count, setCount] = useState(0)
  return (
    <YStack>
      <BottomAppBar>
        <BottomBarItem label="Claim" icon={<EcosystemIcon name="Claim" />} active onPress={() => setCount(count + 1)} />
        <BottomBarItem label="Loading" icon={<EcosystemIcon name="Streaming" />} loading onPress={() => setCount(count + 1)} />
        <BottomBarItem label="More" icon={<EcosystemIcon name="More" muted />} disabled onPress={() => setCount(count + 1)} />
      </BottomAppBar>
      <Text>Pressed {count}</Text>
    </YStack>
  )
}

const play: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await expect(canvas.getByRole('button', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true')
  await expect(canvas.getByRole('button', { name: 'More' })).toBeDisabled()
  await userEvent.click(canvas.getByRole('button', { name: 'More' }))
  await expect(canvas.getByText('Pressed 0')).toBeVisible()
  await userEvent.click(canvas.getByRole('button', { name: 'Claim' }))
  await expect(canvas.getByText('Pressed 1')).toBeVisible()
  canvas.getByRole('button', { name: 'Claim' }).focus()
  await userEvent.keyboard('{Enter}')
  await expect(canvas.getByText('Pressed 2')).toBeVisible()
}
export const Light: Story = { render: () => <Example />, play }
export const Dark: Story = { parameters: { shellTheme: 'dark' }, render: () => <Example />, play }
