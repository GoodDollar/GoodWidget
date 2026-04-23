/**
 * ToastPage — demo page for the Toast component.
 *
 * Route: /components/toast
 */
import React, { useState } from 'react'
import {
  MiniAppShell,
  Card,
  Heading,
  Text,
  Toast,
  Button,
  ButtonText,
  YStack,
} from '@goodwidget/ui'

export function ToastPage() {
  const [visible, setVisible] = useState(false)

  return (
    <MiniAppShell title="Toast">
      {/* Inline Toast (always visible for Playwright inspection) */}
      <Card>
        <Heading level={5}>Inline Toast</Heading>
        <YStack gap="$3">
          <Toast
            type="success"
            message="Transaction confirmed!"
            data-testid="Toast-success"
          />
          <Toast
            type="error"
            message="Something went wrong."
            data-testid="Toast-error"
          />
          <Toast
            type="info"
            message="Wallet connected."
            data-testid="Toast-info"
          />
        </YStack>
      </Card>

      {/* Togglable toast */}
      <Card>
        <Heading level={5}>Toggle</Heading>
        <Button onPress={() => setVisible((v) => !v)}>
          <ButtonText>{visible ? 'Hide Toast' : 'Show Toast'}</ButtonText>
        </Button>
        {visible && (
          <Toast
            type="info"
            message="Toggled toast — click button to hide."
            data-testid="Toast-toggled"
          />
        )}
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Toast } from '@goodwidget/ui'

<Toast type="success" message="Transaction confirmed!" />`}</Text>
      </Card>
    </MiniAppShell>
  )
}
