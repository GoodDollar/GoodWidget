import React, { useMemo } from 'react'
import { AppKitProvider } from '@reown/appkit/react'
import { base, celo, fuse, mainnet, xdc, type AppKitNetwork } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

const DEFAULT_APPKIT_NETWORKS = [mainnet, base, xdc, fuse, celo] as [
  AppKitNetwork,
  ...AppKitNetwork[],
]

type DefaultAppKitProviderProps = Omit<
  React.ComponentProps<typeof AppKitProvider>,
  'projectId' | 'networks'
> & {
  projectId?: string
  networks?: [AppKitNetwork, ...AppKitNetwork[]]
}
export function DefaultAppKitProvider({ children, ...appKitProps }: DefaultAppKitProviderProps) {
  const { networks: propNetworks, projectId: propProjectId, ...rest } = appKitProps
  const finalProjectId =
    (import.meta.env['VITE_REOWN_PROJECT_ID'] as string | undefined) ?? propProjectId
  const finalNetworks = propNetworks ?? DEFAULT_APPKIT_NETWORKS

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
      {...rest}
    >
      {children}
    </AppKitProvider>
  )
}
