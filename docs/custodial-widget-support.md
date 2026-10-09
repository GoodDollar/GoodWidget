# Custodial Claim Widget Support

This guide explains how to enable parallel GoodDollar claims from a custodial
wallet.

Supported chains:

- Fuse: `122`
- Celo: `42220`
- XDC: `50`

## 1. Create one client pair per chain

Create a viem `publicClient` and account-enabled `walletClient` for each supported
chain. The wallet client and public client must use the same chain and account.

```ts
import { createPublicClient, createWalletClient, http, type Account, type Chain } from 'viem'

// Provided by your wallet integration (do not embed private keys in the widget host).
const account = {} as Account

const makeClients = (chain: Chain, rpcUrl: string) => ({
  publicClient: createPublicClient({
    chain,
    transport: http(rpcUrl),
  }),
  walletClient: createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  }),
})

const clientsByChain = {
  122: makeClients(fuseChain, FUSE_RPC_URL),
  42220: makeClients(celoChain, CELO_RPC_URL),
  50: makeClients(xdcChain, XDC_RPC_URL),
}
```

The `account`, chain definitions, and RPC URLs come from the wallet integration.
Keep private keys and signer credentials outside the browser widget.

## 2. Create the custodial execution configuration

Use the helper exported by `@goodwidget/citizen-claim-widget`:

```ts
import { createCitizenClaimWidgetCustodialExecution } from '@goodwidget/citizen-claim-widget'

const claimExecution = createCitizenClaimWidgetCustodialExecution(clientsByChain)
```

## 3. Render the claim widget

Pass the wallet provider and the execution configuration:

```tsx
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'

<CitizenClaimWidget
  provider={walletProvider}
  claimExecution={claimExecution}
  onClaimSuccess={({ chainId, transactionHash }) => {
    console.log(`Claim succeeded on ${chainId}`, transactionHash)
  }}
  onClaimError={({ chainId, message }) => {
    console.error(`Claim failed on ${chainId}`, message)
  }}
/>
```

The connected address exposed by `walletProvider` must match the account attached to
the wallet clients.

## Superfluid campaign widget

Pass the same configuration through `citizenClaimExecution`:

```tsx
import { SuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget'

<SuperfluidCampaignWidget
  provider={walletProvider}
  citizenClaimExecution={claimExecution}
/>
```

## Runtime behavior

When the user claims, the widget:

1. Finds the eligible supported chains.
2. Checks the account and gas requirements for each chain.
3. Requests faucet top-ups when required.
4. Submits eligible claims in parallel.
5. Reports each chain independently through the callbacks.

Claims on different chains are independent. A successful claim is not retried if a
claim on another chain fails.

## Integration checklist

- Provide clients for every chain the wallet supports.
- Use an account-enabled `walletClient` for every chain.
- Use a chain-matching `publicClient` and `walletClient` pair.
- Pass the wallet's EIP-1193 provider to the widget.
- Keep signing credentials in the wallet integration.
- Handle `onClaimSuccess` and `onClaimError` per chain.
