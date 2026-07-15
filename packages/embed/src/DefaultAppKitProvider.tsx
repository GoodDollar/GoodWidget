import React from 'react'
import { AppKitProvider } from '@reown/appkit/react'
import { base, celo, fuse, mainnet, xdc, type AppKitNetwork } from '@reown/appkit/networks'

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
  const finalProjectId = (import.meta.env['VITE_REOWN_PROJECT_ID'] as string) ?? propProjectId

  if (!finalProjectId) {
    return <>{children}</>
  }

  return (
    <AppKitProvider
      projectId={finalProjectId}
      networks={propNetworks || DEFAULT_APPKIT_NETWORKS}
      showWallets={true}
      {...rest}
    >
      {children}
    </AppKitProvider>
  )
}
