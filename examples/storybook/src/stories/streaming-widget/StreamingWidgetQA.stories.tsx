import type { Meta, StoryObj } from '@storybook/react'
import { StreamingWidget } from '@goodwidget/streaming-widget'
import {
  BaseSupBalanceAndReserveStory,
  CreateUpdateFailureStory,
  CreateUpdateFormStory,
  CreateUpdateInvalidInputStory,
  CreateUpdatePendingStory,
  CreateUpdateSuccessStory,
  CustodialLocalFixtureStory,
  EmptyStateStory,
  ErrorStateStory,
  LightThemePopulatedStory,
  LoadingStateStory,
  NoWalletStory,
  NonBaseSupReserveDisabledStory,
  PoolClaimableAmountErrorStory,
  PoolClaimErrorStory,
  PoolClaimPendingStory,
  PoolClaimStateStory,
  PoolClaimSuccessStory,
  PoolConnectedStateStory,
  PopulatedStateStory,
  WrongChainStory,
} from '../helpers/streamingWidgetStories'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'

interface StreamingWidgetQAArgs {
  apiKey?: string
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<StreamingWidgetQAArgs> = {
  title: 'QA/StreamingWidget/Runtime Fixtures',
  component: StreamingWidget,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
  argTypes: {
    apiKey: {
      control: 'text',
      name: 'TheGraph API key',
      description:
        'Optional TheGraph key passed to the SDK-backed streaming adapter for Base SUP reserve queries.',
    },
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
    apiKey: '',
    defaultTheme: 'dark',
    brandPreset: 'None',
  },
}

export default meta
type Story = StoryObj<StreamingWidgetQAArgs>

export const CustodialLocalFixture: Story = {
  render: ({ apiKey, defaultTheme, brandPreset }) => (
    <CustodialLocalFixtureStory
      apiKey={apiKey}
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
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

export const LoadingState: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <LoadingStateStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const EmptyState: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <EmptyStateStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const ErrorState: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <ErrorStateStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const PopulatedState: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <PopulatedStateStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

/** Always mounts with defaultTheme="light" regardless of the control, to demonstrate the
 * explicit light-theme branch; brandPreset still applies on top. */
export const LightThemePopulated: Story = {
  render: ({ brandPreset }) => (
    <LightThemePopulatedStory themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const CreateUpdateForm: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <CreateUpdateFormStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const CreateUpdateInvalidInput: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <CreateUpdateInvalidInputStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const CreateUpdatePending: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <CreateUpdatePendingStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const CreateUpdateSuccess: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <CreateUpdateSuccessStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const CreateUpdateFailure: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <CreateUpdateFailureStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const PoolClaimState: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <PoolClaimStateStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const PoolConnectedState: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <PoolConnectedStateStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const PoolClaimPending: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <PoolClaimPendingStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const PoolClaimSuccess: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <PoolClaimSuccessStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const PoolClaimError: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <PoolClaimErrorStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const PoolClaimableAmountError: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <PoolClaimableAmountErrorStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const BaseSupBalanceAndReserve: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <BaseSupBalanceAndReserveStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const NonBaseSupReserveDisabled: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <NonBaseSupReserveDisabledStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}
