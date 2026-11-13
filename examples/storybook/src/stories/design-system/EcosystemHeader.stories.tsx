import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { GoodWidgetProvider } from '@goodwidget/core'
import { EcosystemHeader, Text, YStack } from '@goodwidget/ui'

const meta: Meta = {
  title: 'Design System/Primitives/EcosystemHeader',
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
  const [connected, setConnected] = useState(false)
  const [acted, setActed] = useState(false)
  return (
    <YStack>
      <EcosystemHeader
        address={connected ? '0x1234567890123456789012345678901234567890' : null}
        chainId={42220}
        onConnect={() => setConnected(true)}
        onWalletAction={() => setActed(true)}
        walletActionLabel="Network settings"
      />
      {acted && <Text>Settings opened</Text>}
    </YStack>
  )
}
const play: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await userEvent.click(canvas.getByRole('button', { name: 'Connect Wallet' }))
  await expect(canvas.getByText('Celo')).toBeVisible()
  await userEvent.click(canvas.getByRole('button', { name: 'Network settings' }))
  await expect(canvas.getByText('Settings opened')).toBeVisible()
}
export const Light: Story = { render: () => <Example />, play }
export const Dark: Story = { parameters: { shellTheme: 'dark' }, render: () => <Example />, play }
export const Connecting: Story = {
  render: () => <EcosystemHeader onConnect={() => {}} connecting />,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Connect Wallet' })
    await expect(button).toBeDisabled()
    await expect(button).toHaveAttribute('aria-busy', 'true')
  },
}
export const NativeWallet: Story = {
  render: () => <EcosystemHeader address="0x1234567890123456789012345678901234567890" chainId={42220} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Wallet options' })).not.toBeInTheDocument()
  },
}
