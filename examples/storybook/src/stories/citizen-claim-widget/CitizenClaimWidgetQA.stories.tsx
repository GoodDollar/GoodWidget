import type { Meta, StoryObj } from '@storybook/react'
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'
import { CustodialLocalFixtureStory } from '../helpers/citizenClaimWidgetStories'

const meta: Meta<typeof CitizenClaimWidget> = {
  title: 'QA/CitizenClaimWidget/Runtime Fixtures',
  component: CitizenClaimWidget,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

export const CustodialLocalFixture: Story = {
  render: () => <CustodialLocalFixtureStory />,
}
