// `react-native` is an optional peer dependency with no bundled types (its
// package.json declares no `types` field), and the `tsconfig.json` `paths`
// alias that points it at `react-native-web` for editor/typecheck purposes
// doesn't carry types either. Mirrors the same pattern as
// `clipboard-native.d.ts` for `@react-native-clipboard/clipboard`.
//
// Scoped to exactly what this package currently imports as values (`Image`,
// `Linking`, used by NextTaskModal) or types (`LayoutChangeEvent`, used by
// useMeasuredHeight/useMeasuredWidth) — not a full react-native typing.
declare module 'react-native' {
  import type { ComponentType } from 'react'

  export interface LayoutChangeEvent {
    nativeEvent: {
      layout: { x: number; y: number; width: number; height: number }
    }
  }

  export interface ImageProps {
    source: { uri: string }
    accessibilityLabel?: string
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
    style?: unknown
  }
  export const Image: ComponentType<ImageProps>

  export const Linking: {
    openURL: (url: string) => Promise<void>
  }
}
