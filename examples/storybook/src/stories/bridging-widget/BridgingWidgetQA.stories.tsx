import type { Meta, StoryObj } from '@storybook/react'
import { BridgingWidget } from '@goodwidget/bridging-widget'
import {
  BelowMinAmountStory,
  ConfigErrorStory,
  ConfigLoadingStory,
  CustodialLocalFixtureStory,
  FaqTabStory,
  FuseDestinationStory,
  FuseSourceStory,
  HistoryDetailModalOpenStory,
  HistoryEmptyStory,
  HistoryErrorStory,
  HistoryLoadingStory,
  HistoryPopulatedStory,
  InjectedWalletStory,
  InsufficientBalanceStory,
  LightThemePopulatedStory,
  NeedsApprovalStory,
  NoWalletStory,
  QuoteErrorStory,
  QuoteLoadingStory,
  ReadyToBridgeStory,
  ReviewOpenStory,
  RouteNotSupportedStory,
  SubmissionApprovingStory,
  SubmissionBridgingStory,
  SubmissionCompletedStory,
  SubmissionFailedApprovingStory,
  SubmissionFailedBridgingStory,
  WrongChainStory,
} from '../helpers/bridgingWidgetStories'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'

interface BridgingWidgetQAArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<BridgingWidgetQAArgs> = {
  title: 'QA/BridgingWidget/Runtime Fixtures',
  component: BridgingWidget,
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
type Story = StoryObj<BridgingWidgetQAArgs>

export const CustodialLocalFixture: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <CustodialLocalFixtureStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const InjectedWallet: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <InjectedWalletStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const NoWallet: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <NoWalletStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const WrongChain: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <WrongChainStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const RouteNotSupported: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <RouteNotSupportedStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const ConfigLoading: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <ConfigLoadingStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const ConfigError: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <ConfigErrorStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const QuoteLoading: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <QuoteLoadingStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const QuoteError: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <QuoteErrorStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const BelowMinAmount: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <BelowMinAmountStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const InsufficientBalance: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <InsufficientBalanceStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const NeedsApproval: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <NeedsApprovalStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const ReadyToBridge: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <ReadyToBridgeStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const ReviewOpen: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <ReviewOpenStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const SubmissionApproving: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <SubmissionApprovingStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const SubmissionBridging: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <SubmissionBridgingStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const SubmissionCompleted: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <SubmissionCompletedStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const SubmissionFailedApproving: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <SubmissionFailedApprovingStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const SubmissionFailedBridging: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <SubmissionFailedBridgingStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const HistoryLoading: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <HistoryLoadingStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const HistoryEmpty: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <HistoryEmptyStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const HistoryError: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <HistoryErrorStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const HistoryPopulated: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <HistoryPopulatedStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const HistoryDetailModalOpen: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <HistoryDetailModalOpenStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const FaqTab: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <FaqTabStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

/** Always mounts with defaultTheme="light" regardless of the control, to demonstrate the
 * explicit light-theme branch; brandPreset still applies on top. */
export const LightThemePopulated: Story = {
  render: ({ brandPreset }) => (
    <LightThemePopulatedStory themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const FuseSource: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <FuseSourceStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const FuseDestination: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <FuseDestinationStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

