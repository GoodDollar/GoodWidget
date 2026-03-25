import React, { useEffect, useState } from 'react'
import { Slot } from 'expo-router'
import { GoodWidgetProvider } from '@goodwidget/core'

/**
 * Root layout — wraps the entire app in GoodWidgetProvider.
 *
 * In a real app you'd pass a wallet provider here, e.g. from
 * WalletConnect or an injected provider.
 */
export default function RootLayout() {
  return (
    <GoodWidgetProvider defaultTheme="light">
      <Slot />
    </GoodWidgetProvider>
  )
}
