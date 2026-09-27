import React, { useMemo } from 'react'
import { AppKitProvider } from '@reown/appkit/react'
import { base, celo, fuse, mainnet, xdc, type AppKitNetwork } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// xdc leads the list: AppKit treats the first network as the default chain
// a freshly connecting wallet lands on.
export const DEFAULT_APPKIT_NETWORKS = [xdc, mainnet, base, fuse, celo] as [
  AppKitNetwork,
  ...AppKitNetwork[],
]

/**
 * Identity shown to the wallet in a WalletConnect session request.
 *
 * Without this, AppKit falls back to scraping the host page, which is how a
 * wallet ends up displaying a Storybook story id — or a bare "?" where the app
 * icon belongs — on the approve/reject screen someone is being asked to trust.
 *
 * `icons` must be absolute and publicly reachable: the wallet fetches them from
 * the phone, so a localhost URL or a relative path resolves to nothing.
 */
export interface AppKitMetadata {
  name: string
  description: string
  url: string
  icons: string[]
}

const DEFAULT_METADATA: Omit<AppKitMetadata, 'url'> = {
  name: 'GoodDollar',
  description: 'GoodDollar widgets',
  // Fixed rather than origin-relative on purpose. Wallets do not always load
  // this in the browser: GoodWallet proxies it through Next's image optimizer,
  // which fetches server-side and only accepts hosts on its allowlist. A
  // gooddollar.org URL passes that check from any embedding origin; a preview
  // or vercel.app origin does not.
  icons: ['https://aicredits.gooddollar.org/gooddollar-icon.png'],
}

type DefaultAppKitProviderProps = Omit<
  React.ComponentProps<typeof AppKitProvider>,
  'projectId' | 'networks' | 'metadata'
> & {
  projectId?: string
  networks?: [AppKitNetwork, ...AppKitNetwork[]]
  /** Overrides the identity shown in the wallet's approval sheet. */
  metadata?: Partial<AppKitMetadata>
}
export function DefaultAppKitProvider({ children, ...appKitProps }: DefaultAppKitProviderProps) {
  const { networks: propNetworks, projectId: propProjectId, metadata: propMetadata, ...rest } =
    appKitProps
  const finalProjectId =
    (import.meta.env['VITE_REOWN_PROJECT_ID'] as string | undefined) ?? propProjectId
  const finalNetworks = propNetworks ?? DEFAULT_APPKIT_NETWORKS
  const finalMetadata: AppKitMetadata = {
    ...DEFAULT_METADATA,
    // Origin is only knowable at runtime, and must match the connecting page or
    // wallets flag the session as mismatched.
    url: typeof window !== 'undefined' ? window.location.origin : '',
    ...propMetadata,
  }

  const wagmiAdapter = useMemo(
    () => (finalProjectId ? new WagmiAdapter({ projectId: finalProjectId, networks: finalNetworks }) : null),
    [finalProjectId],
  )

  if (!finalProjectId || !wagmiAdapter) {
    return <>{children}</>
  }

  return (
    <AppKitProvider
      adapters={[wagmiAdapter]}
      projectId={finalProjectId}
      networks={finalNetworks}
      metadata={finalMetadata}
      {...rest}
    >
      {children}
    </AppKitProvider>
  )
}
