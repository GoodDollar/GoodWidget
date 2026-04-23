/**
 * SelectPage — demo page for the Select primitive.
 *
 * Route: /components/select
 */
import React, { useState } from 'react'
import { MiniAppShell, Card, Heading, Text, Select, YStack } from '@goodwidget/ui'

export function SelectPage() {
  const [value, setValue] = useState('')

  return (
    <MiniAppShell title="Select">
      <Card>
        <Heading level={5}>Default</Heading>
        <YStack gap="$3">
          <Select
            options={[
              { label: 'Celo', value: '42220' },
              { label: 'Ethereum', value: '1' },
              { label: 'Fuse', value: '122' },
            ]}
            value={value}
            onValueChange={setValue}
            placeholder="Select chain..."
            data-testid="Select-default"
          />
        </YStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Select } from '@goodwidget/ui'

<Select
  options={[
    { label: 'Celo', value: '42220' },
    { label: 'Ethereum', value: '1' },
  ]}
  value={value}
  onValueChange={setValue}
  placeholder="Select chain..."
/>`}</Text>
      </Card>
    </MiniAppShell>
  )
}
