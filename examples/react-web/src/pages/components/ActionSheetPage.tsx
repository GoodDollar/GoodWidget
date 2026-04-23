/**
 * ActionSheetPage — demo page for the ActionSheet component.
 *
 * Route: /components/actionsheet
 */
import React, { useState } from 'react'
import {
  MiniAppShell,
  Card,
  Heading,
  Text,
  ActionSheet,
  Button,
  ButtonText,
  YStack,
} from '@goodwidget/ui'

export function ActionSheetPage() {
  const [open, setOpen] = useState(false)

  return (
    <MiniAppShell title="ActionSheet">
      <Card>
        <Heading level={5}>Trigger</Heading>
        <YStack gap="$3">
          <Text secondary>ActionSheet is a modal bottom panel triggered by user action.</Text>
          <Button onPress={() => setOpen(true)} data-testid="ActionSheet-trigger">
            <ButtonText>Open ActionSheet</ButtonText>
          </Button>
        </YStack>
      </Card>

      {/* The ActionSheet itself */}
      <ActionSheet open={open} onClose={() => setOpen(false)} data-testid="ActionSheet-panel">
        <Heading level={4}>Choose an action</Heading>
        <YStack gap="$2">
          <Button fullWidth onPress={() => setOpen(false)}>
            <ButtonText>Send</ButtonText>
          </Button>
          <Button fullWidth variant="secondary" onPress={() => setOpen(false)}>
            <ButtonText>Receive</ButtonText>
          </Button>
          <Button fullWidth variant="ghost" onPress={() => setOpen(false)}>
            <ButtonText>Cancel</ButtonText>
          </Button>
        </YStack>
      </ActionSheet>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { ActionSheet } from '@goodwidget/ui'

<ActionSheet open={open} onClose={() => setOpen(false)}>
  <Button onPress={() => setOpen(false)}>
    <ButtonText>Action</ButtonText>
  </Button>
</ActionSheet>`}</Text>
      </Card>
    </MiniAppShell>
  )
}
