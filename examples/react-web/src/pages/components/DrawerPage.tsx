/**
 * DrawerPage — demo page for the Drawer component.
 *
 * Route: /components/drawer
 */
import React, { useState } from 'react'
import {
  MiniAppShell,
  Card,
  Heading,
  Text,
  Drawer,
  Button,
  ButtonText,
  YStack,
} from '@goodwidget/ui'

export function DrawerPage() {
  const [open, setOpen] = useState(false)

  return (
    <MiniAppShell title="Drawer">
      <Card>
        <Heading level={5}>Trigger</Heading>
        <YStack gap="$3">
          <Text secondary>A Drawer slides up from the bottom and overlays the content.</Text>
          <Button onPress={() => setOpen(true)} data-testid="Drawer-trigger">
            <ButtonText>Open Drawer</ButtonText>
          </Button>
        </YStack>
      </Card>

      {/* The Drawer itself */}
      <Drawer open={open} onClose={() => setOpen(false)} data-testid="Drawer-panel">
        <Heading level={4}>Drawer content</Heading>
        <Text secondary>Any content can be placed inside a Drawer.</Text>
        <Button fullWidth onPress={() => setOpen(false)}>
          <ButtonText>Close</ButtonText>
        </Button>
      </Drawer>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Drawer } from '@goodwidget/ui'

<Drawer open={open} onClose={() => setOpen(false)}>
  <Text>Content</Text>
  <Button onPress={() => setOpen(false)}>
    <ButtonText>Close</ButtonText>
  </Button>
</Drawer>`}</Text>
      </Card>
    </MiniAppShell>
  )
}
