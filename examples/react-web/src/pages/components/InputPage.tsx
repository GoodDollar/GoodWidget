/**
 * InputPage — demo page for the Input primitive.
 *
 * Route: /components/input
 */
import React, { useState } from 'react'
import { MiniAppShell, Card, Heading, Text, Input, YStack } from '@goodwidget/ui'

export function InputPage() {
  const [value, setValue] = useState('')

  return (
    <MiniAppShell title="Input">
      <Card>
        <Heading level={5}>Default</Heading>
        <YStack gap="$3">
          {/* data-testid: Input-default */}
          <Input
            label="Name"
            placeholder="Enter your name..."
            value={value}
            onChangeText={setValue}
            data-testid="Input-default"
          />
          <Input label="Email" placeholder="you@example.com" data-testid="Input-email" />
          <Input
            label="With Error"
            placeholder="Bad value..."
            error="This field is required"
            data-testid="Input-error"
          />
          <Input label="Disabled" placeholder="Read only" disabled data-testid="Input-disabled" />
        </YStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Input } from '@goodwidget/ui'

<Input
  label="Name"
  placeholder="Enter your name..."
  value={value}
  onChangeText={setValue}
/>`}</Text>
      </Card>
    </MiniAppShell>
  )
}
