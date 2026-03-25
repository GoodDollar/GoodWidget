import React from 'react'
import { GoodWidgetProvider, useWallet } from '@goodwidget/core'
import {
  MiniAppShell,
  Card,
  Heading,
  Text,
  Button,
  ButtonText,
} from '@goodwidget/ui'

function MyMiniApp() {
  const { address, connect } = useWallet()

  return (
    <MiniAppShell title="My Mini App">
      <Card>
        <Heading level={4}>Welcome</Heading>
        <Text secondary>
          {address ? `Connected: ${address}` : 'Connect your wallet to get started.'}
        </Text>
        {!address && (
          <Button onPress={connect} fullWidth>
            <ButtonText>Connect Wallet</ButtonText>
          </Button>
        )}
      </Card>
    </MiniAppShell>
  )
}

export function App() {
  return (
    <GoodWidgetProvider defaultTheme="light">
      <MyMiniApp />
    </GoodWidgetProvider>
  )
}
