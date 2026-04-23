/**
 * AlertPage — demo page for the Alert primitive.
 *
 * Route: /components/alert
 */
import React from 'react'
import { MiniAppShell, Card, Heading, Text, Alert, YStack } from '@goodwidget/ui'

export function AlertPage() {
  return (
    <MiniAppShell title="Alert">
      <Card>
        <Heading level={5}>Types</Heading>
        <YStack gap="$3">
          {/* data-testid: Alert-<type> */}
          <Alert
            type="info"
            title="Information"
            message="This is an informational message."
            data-testid="Alert-info"
          />
          <Alert
            type="success"
            title="Success"
            message="The operation completed successfully."
            data-testid="Alert-success"
          />
          <Alert
            type="warning"
            title="Warning"
            message="Please review before continuing."
            data-testid="Alert-warning"
          />
          <Alert
            type="error"
            title="Error"
            message="Something went wrong. Please try again."
            data-testid="Alert-error"
          />
        </YStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Alert } from '@goodwidget/ui'

<Alert
  type="error"
  title="Error"
  message="Something went wrong."
/>`}</Text>
      </Card>
    </MiniAppShell>
  )
}
