/**
 * SwitchPage — demo page for the Switch primitive.
 *
 * Route: /components/switch
 */
import React, { useState } from 'react'
import { MiniAppShell, Card, Heading, Text, Switch, YStack } from '@goodwidget/ui'

export function SwitchPage() {
  const [on, setOn] = useState(false)
  const [preOn, setPreOn] = useState(true)

  return (
    <MiniAppShell title="Switch">
      <Card>
        <Heading level={5}>States</Heading>
        <YStack gap="$3">
          <Switch
            checked={on}
            onCheckedChange={setOn}
            label="Auto-claim"
            data-testid="Switch-default"
          />
          <Switch
            checked={preOn}
            onCheckedChange={setPreOn}
            label="Notifications (on)"
            data-testid="Switch-on"
          />
          <Switch
            checked={false}
            onCheckedChange={() => {}}
            label="Disabled"
            disabled
            data-testid="Switch-disabled"
          />
        </YStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Switch } from '@goodwidget/ui'

<Switch
  checked={on}
  onCheckedChange={setOn}
  label="Auto-claim"
/>`}</Text>
      </Card>
    </MiniAppShell>
  )
}
