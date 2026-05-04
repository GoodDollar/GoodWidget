// Config
export {
  createGoodWidgetConfig,
  createGoodWidgetThemes,
  mergeThemeOverrides,
  defaultConfig,
  defaultPreset,
} from './config'
export type { TamaguiConfig } from './config'
export type {
  GoodWidgetConfig,
  GoodWidgetThemeOverrides,
  GoodWidgetThemes,
  GoodWidgetThemeValues,
  GoodWidgetTokenOverrides,
  GoodWidgetTokenValues,
  WidgetAnimationConfig,
  WidgetAnimationsPreset,
  WidgetComponentTheme,
  WidgetDesignPreset,
  WidgetDesignSemantics,
  WidgetFontDefinition,
  WidgetTypographyPreset,
} from './configTypes'

// Theme
export { defaultTokenValues, createGoodWidgetTokens, createThemeValues } from './theme'
export { goodWalletV2Preset } from './presets'

// createComponent + Manifest
export { createComponent } from './createComponent'
export { getThemeManifest, getComponentManifest, registerComponent } from './manifest'
export type { ThemeManifest, ComponentManifestEntry } from './manifest'

// Layout
export { Container } from './components-test/Container'
export { Card } from './components/Card'
export { GlowCard } from './components/GlowCard'
export { XStack, YStack, ZStack } from './components-test/Stacks'
export { Separator } from './components/Separator'
export { ScrollArea } from './components-test/ScrollArea'

// Typography
export { Heading } from './components/Heading'
export { Text } from './components/Text'

// Inputs
export { Button, ButtonFrame, ButtonText, PillText } from './components/Button'
export type { ButtonProps } from './components/Button'
export { Input, InputFrame, InputLabel, InputError } from './components-test/Input'
export type { InputProps } from './components-test/Input'
export { Select } from './components-test/Select'
export type { SelectOption } from './components-test/Select'
export { Checkbox } from './components-test/Checkbox'
export { Switch } from './components-test/Switch'

// Feedback
export { Spinner } from './components-test/Spinner'
export {
  Toast,
  ToastContainer,
  createToast,
  updateToast,
  removeToast,
  useToast,
} from './components/Toast'
export type { ToastStatus, ToastConfig, ToastItem } from './components/Toast'
export { Alert } from './components-test/Alert'
export { Badge, BadgeText } from './components-test/Badge'
export { Drawer } from './components/Drawer'

// Icon — new component with inline SVG registry and semantic color/size props
export { Icon } from './components/Icon'
export type { IconName, IconSize, IconColor, IconProps } from './components/Icon'

// Dialog — new component backed by imperative store
export {
  GoodWidgetDialog,
  createDialog,
  updateDialogStatus,
  closeDialog,
  useDialog,
} from './components/Dialog'
export type { DialogConfig, DialogStatus } from './components/Dialog'

// Web3
export { AddressDisplay } from './components-test/AddressDisplay'
export { TokenAmount } from './components/TokenAmount'
export { TransactionButton } from './components-test/TransactionButton'
export { ChainBadge } from './components-test/ChainBadge'
export { WalletInfo } from './components-test/WalletInfo'

// Patterns / Composites
export { MiniAppShell } from './components/MiniAppShell'
export { ActionSheet } from './components-test/ActionSheet'
export { TokenInput } from './components-test/TokenInput'
