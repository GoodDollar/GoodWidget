/**
 * TokenAmountPage — demo page for the TokenAmount component.
 *
 * Route: /components/tokenamount
 */
import React from 'react'
import { MiniAppShell, Card, Heading, Text, TokenAmount, YStack } from '@goodwidget/ui'

export function TokenAmountPage() {
  return (
    <MiniAppShell title="TokenAmount">
      <Card>
        <Heading level={5}>Amounts</Heading>
        <YStack gap="$3">
          <TokenAmount
            amount="1234.56"
            token="G$"
            data-testid="TokenAmount-default"
          />
          <TokenAmount
            amount="0.000001"
            token="ETH"
            data-testid="TokenAmount-small"
          />
          <TokenAmount
            amount="1000000"
            token="USDC"
            data-testid="TokenAmount-large"
          />
        </YStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { TokenAmount } from '@goodwidget/ui'

<TokenAmount amount="1234.56" token="G$" />`}</Text>
      </Card>
    </MiniAppShell>
  )
}
