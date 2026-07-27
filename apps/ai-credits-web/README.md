# AI Credits web app

This Vite app renders the standalone GoodDollar AI credits developer landing page and embeds
`AiCreditsWidget` when an injected browser wallet is available.

## Production configuration

Set these build-time values in the production hosting environment. Vite exposes `VITE_` values to
the browser, so do not put secrets in them.

| Variable | Purpose | Fallback |
| --- | --- | --- |
| `VITE_AI_CREDITS_BACKEND_URL` | AI credits backend used for quotes, payment notifications, and credit status. | None; the widget reports the backend as unavailable. |
| `VITE_AI_CREDITS_FUNDING_VAULT_ADDRESS` | Base funding vault / operator contract used for Base-side credit actions. | None; purchasing cannot proceed. |
| `VITE_AI_CREDITS_VAULT_ADDRESS` | Celo G$ Antseed vault contract that receives the G$ payment. | Widget fallback address; set explicitly for production. |
| `VITE_AI_CREDITS_GOODID_ADDRESS` | Celo GoodID contract used to determine bonus eligibility. | Widget default GoodID address; set explicitly for production. |
| `VITE_AI_CREDITS_BASE_RPC_URL` | Base Mainnet RPC endpoint used for credit and operator reads. | Public Base RPC default. |
| `VITE_AI_CREDITS_CELO_RPC_URL` | Celo Mainnet RPC endpoint used for payment and GoodID reads. | Public Celo RPC default. |

Example deployment configuration:

```dotenv
VITE_AI_CREDITS_BACKEND_URL=https://api.example.com
VITE_AI_CREDITS_FUNDING_VAULT_ADDRESS=0x...
VITE_AI_CREDITS_VAULT_ADDRESS=0x...
VITE_AI_CREDITS_GOODID_ADDRESS=0x...
VITE_AI_CREDITS_BASE_RPC_URL=https://base-rpc.example.com
VITE_AI_CREDITS_CELO_RPC_URL=https://celo-rpc.example.com
```

Use the deployed contracts and managed RPC endpoints approved for the target environment. Keep
local values in `.env.local`, which is ignored by Git.
