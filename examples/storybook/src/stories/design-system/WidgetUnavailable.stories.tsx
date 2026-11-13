import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { GoodWidgetProvider } from '@goodwidget/core'
import { Text, WidgetUnavailable, YStack } from '@goodwidget/ui'

const meta: Meta = {
  title: 'Design System/Primitives/WidgetUnavailable',
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
  const [switching, setSwitching] = useState(false)
  return (
    <YStack>
      <WidgetUnavailable widgetName="Citizen Claim" networkName="Ethereum" switching={switching} onSwitchNetwork={() => setSwitching(true)} />
      {switching && <Text>Switch requested</Text>}
    </YStack>
  )
}
const play: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await expect(canvas.getByText(/Citizen Claim is not supported on Ethereum/)).toBeVisible()
  await userEvent.click(canvas.getByRole('button', { name: 'Switch network' }))
  await expect(canvas.getByText('Switch requested')).toBeVisible()
  await expect(canvas.getByRole('button', { name: 'Switch network' })).toBeDisabled()
}
export const Light: Story = { render: () => <Example />, play }
export const Dark: Story = { parameters: { shellTheme: 'dark' }, render: () => <Example />, play }
