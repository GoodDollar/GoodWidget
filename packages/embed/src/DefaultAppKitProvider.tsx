import React from 'react'
import { AppKitProvider, createAppKit } from '@reown/appkit/react'
import { base, celo, fuse, mainnet, xdc, type AppKitNetwork } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// 1. Configure the setup
const projectId = 'YOUR_PROJECT_ID'
const DEFAULT_APPKIT_NETWORKS = [mainnet, base, xdc, fuse, celo] as [
  AppKitNetwork,
  ...AppKitNetwork[],
]
const wagmiAdapter = new WagmiAdapter({ projectId, networks: DEFAULT_APPKIT_NETWORKS })

type DefaultAppKitProviderProps = Omit<
  React.ComponentProps<typeof AppKitProvider>,
  'projectId' | 'networks'
> & {
  projectId?: string
  networks?: [AppKitNetwork, ...AppKitNetwork[]]
}
export function DefaultAppKitProvider({ children, ...appKitProps }: DefaultAppKitProviderProps) {
  const { networks: propNetworks, projectId: propProjectId, ...rest } = appKitProps
  const finalProjectId = (import.meta.env['VITE_REOWN_PROJECT_ID'] as string) ?? propProjectId

  if (!finalProjectId) {
    return <>{children}</>
  }

  return (
    <AppKitProvider
      adapters={[wagmiAdapter]}
      projectId={finalProjectId}
      networks={propNetworks || DEFAULT_APPKIT_NETWORKS}
      {...rest}
    >
      {children}
    </AppKitProvider>
  )
}
