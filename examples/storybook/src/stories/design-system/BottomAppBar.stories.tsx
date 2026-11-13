import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { GoodWidgetProvider } from '@goodwidget/core'
import { BottomAppBar, BottomBarItem, YStack } from '@goodwidget/ui'
import { EcosystemIcon } from './EcosystemIcons'

const meta: Meta = {
  title: 'Design System/Primitives/BottomAppBar',
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
    <BottomAppBar data-testid="BottomAppBar-default">
      {(['Claim', 'Reserve', 'More'] as const).map((label) => (
        <BottomBarItem key={label} label={label} icon={<EcosystemIcon name={label} muted={selected !== label} />} active={selected === label} onPress={() => setSelected(label)} />
      ))}
    </BottomAppBar>
  )
}

const play: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await expect(canvas.getByRole('button', { name: 'Claim' })).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(canvas.getByRole('button', { name: 'Reserve' }))
  await expect(canvas.getByRole('button', { name: 'Reserve' })).toHaveAttribute('aria-pressed', 'true')
  await expect(canvas.getByRole('button', { name: 'Claim' })).toHaveAttribute('aria-pressed', 'false')
}

export const Light: Story = { render: () => <Example />, play }
export const Dark: Story = { parameters: { shellTheme: 'dark' }, render: () => <Example />, play }
