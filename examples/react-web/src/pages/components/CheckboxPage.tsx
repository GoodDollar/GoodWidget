/**
 * CheckboxPage — demo page for the Checkbox primitive.
 *
 * Route: /components/checkbox
 */
import React, { useState } from 'react'
import { MiniAppShell, Card, Heading, Text, Checkbox, YStack } from '@goodwidget/ui'

export function CheckboxPage() {
  const [checked, setChecked] = useState(false)
  const [locked, setLocked] = useState(true)

  return (
    <MiniAppShell title="Checkbox">
      <Card>
        <Heading level={5}>States</Heading>
        <YStack gap="$3">
          <Checkbox
            checked={checked}
            onCheckedChange={setChecked}
            label="I agree to the terms"
            data-testid="Checkbox-default"
          />
          <Checkbox
            checked={locked}
            onCheckedChange={setLocked}
            label="Pre-checked option"
            data-testid="Checkbox-checked"
          />
          <Checkbox
            checked={false}
            onCheckedChange={() => {}}
            label="Disabled checkbox"
            disabled
            data-testid="Checkbox-disabled"
          />
        </YStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Checkbox } from '@goodwidget/ui'

<Checkbox
  checked={checked}
  onCheckedChange={setChecked}
  label="I agree to the terms"
/>`}</Text>
      </Card>
    </MiniAppShell>
  )
}
