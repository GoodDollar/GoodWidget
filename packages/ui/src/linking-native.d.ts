// The UI build resolves react-native through react-native-web for types.
// Only this subset is needed for the native-only Next Task fallback.
declare module 'react-native' {
  export const Linking: {
    openURL(url: string): Promise<unknown>
  }
}
