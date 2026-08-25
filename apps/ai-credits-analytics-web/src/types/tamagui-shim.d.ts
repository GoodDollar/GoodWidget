/// <reference types="tamagui" />

// Tamagui module augmentation for custom theme tokens
// This file ensures TypeScript recognizes our theme extensions

declare module 'tamagui' {
  interface TamaguiCustomConfig {
    tokens: {
      color: {
        primary: string
        secondary: string
        background: string
        surface: string
        text: string
        textSecondary: string
        border: string
        error: string
        warning: string
        success: string
        info: string
        live: string
        demo: string
      }
      space: {
        0: number
        1: number
        2: number
        3: number
        4: number
        5: number
        6: number
        8: number
        10: number
        12: number
        16: number
        20: number
        24: number
        32: number
        40: number
        48: number
        64: number
      }
      size: {
        0: number
        1: number
        2: number
        3: number
        4: number
        5: number
        6: number
        7: number
        8: number
        9: number
        10: number
        12: number
        14: number
        16: number
        18: number
        20: number
        24: number
        32: number
        40: number
        48: number
        56: number
        64: number
      }
      radius: {
        0: number
        1: number
        2: number
        3: number
        4: number
        5: number
        6: number
        7: number
        8: number
        9: number
        10: number
        full: number
      }
      zIndex: {
        0: number
        1: number
        2: number
        3: number
        4: number
        5: number
      }
    }
  }
}
