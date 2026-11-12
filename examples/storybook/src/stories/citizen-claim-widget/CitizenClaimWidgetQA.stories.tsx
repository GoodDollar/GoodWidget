import type { Meta, StoryObj } from '@storybook/react'
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'
import {
  CustodialClaimExecutionClaimAllStory,
  CustodialLocalFixtureStory,
  MockClaimExecutionWidgetStory,
} from '../helpers/citizenClaimWidgetStories'
import type { NextTaskContent } from '@goodwidget/ui'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'

interface CitizenClaimWidgetQAArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<CitizenClaimWidgetQAArgs> = {
  title: 'QA/CitizenClaimWidget/Runtime Fixtures',
  component: CitizenClaimWidget,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['dark', 'light'],
      description: 'Base theme applied via the widget’s own defaultTheme prop.',
    },
    brandPreset: {
      control: 'select',
      options: BRAND_PRESET_OPTIONS,
      description: 'Sample host-branding themeOverrides preset.',
    },
  },
  args: {
    defaultTheme: 'dark',
    brandPreset: 'None',
  },
}

export default meta
type Story = StoryObj<CitizenClaimWidgetQAArgs>

export const CustodialLocalFixture: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <CustodialLocalFixtureStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const CustodialExecutionClaimAllContract: Story = {
  render: () => <CustodialClaimExecutionClaimAllStory />,
}

const nextTaskContent: NextTaskContent = {
  title: 'Stake your G$ and earn',
  description: 'Put your claimed G$ to work by staking it for rewards.',
  ctaLabel: 'Open Proposal',
  ctaTarget: 'https://gooddollar.org/stake',
  imageUrl: 'https://placehold.co/96x96',
  contentId: 'stake-prompt',
}

/**
 * Widget opt-in for the post-claim "next task" recommendation. The widget opens it
 * only after a successful claim, and only when `nextTaskContent` is passed.
 *
 * Navigation contract: pass `nextTaskResolveNavigation` and the host owns navigation
 * (the CTA is a Button, here it just logs); omit it and the CTA is an Anchor to
 * `ctaTarget`. The three `onNextTask*` callbacks are analytics hooks; on the custom
 * element they arrive as `next-task-shown` / `next-task-clicked` / `next-task-dismissed` events.
 * Needs a funded custodial fixture key (see `custodialEip1193.ts`) to actually claim.
 */
export const CustodialLocalFixtureWithNextTask: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <CustodialLocalFixtureStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
      nextTaskProps={{
        nextTaskContent,
        nextTaskResolveNavigation: (ctaTarget) => console.info('[next-task] host navigates to', ctaTarget),
        onNextTaskShown: (payload) => console.info('[next-task] shown', payload),
        onNextTaskClicked: (payload) => console.info('[next-task] clicked', payload),
        onNextTaskDismissed: (payload) => console.info('[next-task] dismissed', payload),
      }}
    />
  ),
}

const mockNextTaskProps = {
  nextTaskContent,
  nextTaskResolveNavigation: (ctaTarget: string) => {
    if (typeof document !== 'undefined') {
      document.body.dataset.nextTaskNavigated = ctaTarget
    }
    console.info('[next-task] host navigates to', ctaTarget)
  },
  onNextTaskShown: (payload: { contentId?: string }) => {
    if (typeof document !== 'undefined') {
      document.body.dataset.nextTaskLastEvent = `shown:${payload.contentId ?? ''}`
    }
    console.info('[next-task] shown', payload)
  },
  onNextTaskClicked: (payload: { ctaTarget: string }) => {
    if (typeof document !== 'undefined') {
      document.body.dataset.nextTaskLastEvent = `clicked:${payload.ctaTarget}`
    }
    console.info('[next-task] clicked', payload)
  },
  onNextTaskDismissed: (payload: { reason: string }) => {
    if (typeof document !== 'undefined') {
      document.body.dataset.nextTaskLastEvent = `dismissed:${payload.reason}`
    }
    console.info('[next-task] dismissed', payload)
  },
}

export const MockClaimExecutionWithNextTask: Story = {
  render: () => <MockClaimExecutionWidgetStory nextTaskProps={mockNextTaskProps} />,
}

export const MockClaimExecutionPartialSuccessWithNextTask: Story = {
  render: () => <MockClaimExecutionWidgetStory partialSuccess nextTaskProps={mockNextTaskProps} />,
}

export const MockClaimExecutionSingleChainWithNextTask: Story = {
  render: () => (
    <MockClaimExecutionWidgetStory
      singleChain
      nextTaskProps={{
        nextTaskContent,
      }}
    />
  ),
}

export const MockClaimExecutionSingleClaimFallbackWithNextTask: Story = {
  render: () => (
    <MockClaimExecutionWidgetStory
      singleChain
      emptyClaimables
      nextTaskProps={mockNextTaskProps}
    />
  ),
}

export const MockClaimExecutionAllFailsWithNextTask: Story = {
  render: () => (
    <MockClaimExecutionWidgetStory
      allFail
      nextTaskProps={{
        nextTaskContent,
      }}
    />
  ),
}

export const MockClaimExecutionWithoutNextTask: Story = {
  render: () => <MockClaimExecutionWidgetStory />,
}
