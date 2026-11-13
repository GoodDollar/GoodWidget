import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { GoodWidgetProvider } from '@goodwidget/core'
import { Button, ButtonText, Text, WidgetDrawer, WidgetListRow, YStack } from '@goodwidget/ui'
import { EcosystemIcon } from './EcosystemIcons'

const meta: Meta = {
  title: 'Design System/Primitives/WidgetDrawer',
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
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('Claim')
  return (
    <YStack>
      <Button onPress={() => setOpen(true)}><ButtonText>Open widgets</ButtonText></Button>
      <Text>Selected: {selected}</Text>
      <WidgetDrawer open={open} onClose={() => setOpen(false)}>
        {(['Claim', 'Reserve'] as const).map((name) => (
          <WidgetListRow key={name} label={name} description={`${name} widget`} icon={<EcosystemIcon name={name} />} active={selected === name} onPress={() => { setSelected(name); setOpen(false) }} />
        ))}
      </WidgetDrawer>
    </YStack>
  )
}
const play: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await userEvent.click(canvas.getByRole('button', { name: 'Open widgets' }))
  const portal = within(document.body)
  await expect(await portal.findByText('All widgets')).toBeVisible()
  await userEvent.click(await portal.findByRole('button', { name: 'Reserve' }))
  await expect(canvas.getByText('Selected: Reserve')).toBeVisible()
  await userEvent.click(canvas.getByRole('button', { name: 'Open widgets' }))
  await userEvent.click(await portal.findByRole('button', { name: 'Close' }))
}
export const Light: Story = { render: () => <Example />, play }
export const Dark: Story = { parameters: { shellTheme: 'dark' }, render: () => <Example />, play }
