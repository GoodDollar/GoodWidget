# AI Credits Widget

```tsx
import { AiCreditsWidget } from '@goodwidget/ai-credits-widget'

<AiCreditsWidget provider={provider} backendUrl="https://your-ai-credits-backend.example" />
```

For a Custom Element, import `@goodwidget/ai-credits-widget/register`. This import is safe during
Node.js and Next.js server evaluation; it registers `<ai-credits-widget>` only in a browser. Set
the injected EIP-1193 provider and optional `themeOverrides` as element properties.

Production requires `backendUrl`. The widget keeps its Celo and Base RPC and contract defaults
internally and fails closed with a backend-unavailable state when the production backend is absent.
Only the `development` environment may use the built-in mock backend and chain clients.

## Deposit Minimum

One-time deposits require at least $1 of principal, excluding bonuses, when the selected
buyer's stored `balance` in AntseedDeposits is zero. The widget reads `buyers(buyer).balance`
directly, not operator accounting or an available/reserved balance calculation. Any positive
stored balance permits smaller top-ups, subject to the Celo vault's separate first-payer minimum.
Spending or withdrawing the buyer's balance to zero restores the minimum.

The widget reloads this check when buyers change and rechecks before submitting payment.
Failed balance reads block one-time deposits until refresh succeeds; stream-only changes keep
their existing monthly minimum. This is widget validation, not a Celo contract upgrade, and
cannot prevent cross-chain balance changes after submission.

## EIP-1193 capabilities

Grant only these EIP-1193 methods to the injected provider:

- `eth_accounts` and `eth_chainId` to read the connected wallet.
- `eth_requestAccounts` when the user selects **Connect Wallet**.
- `wallet_switchEthereumChain` when the user selects the Celo network switch action.
- `personal_sign` when the user generates the signer key.
- `eth_sendTransaction` when the user confirms a Celo payment.
