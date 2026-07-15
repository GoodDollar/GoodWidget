import React from 'react'
import { AppKitProvider } from '@reown/appkit/react'
import { base, celo, fuse, mainnet, xdc, type AppKitNetwork } from '@reown/appkit/networks'

const DEFAULT_APPKIT_NETWORKS = [mainnet, base, xdc, fuse, celo] as [AppKitNetwork, ...AppKitNetwork[]]

export function DefaultAppKitProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const projectId = import.meta.env['VITE_REOWN_PROJECT_ID'] as string | undefined

  if (!projectId) {
    return <>{children}</>
  }

  return (
    <AppKitProvider projectId={projectId} networks={DEFAULT_APPKIT_NETWORKS}>
      {children}
    </AppKitProvider>
  )
}
