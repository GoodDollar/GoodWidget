export const connectAWalletIntegration = {
  id: 'connect-a-wallet',
  sdk: '@goodsdks/citizen-sdk',
  capabilitySource: 'citizenSdkCapabilities',
  uses: ['connectAccount', 'disconnectAccount', 'checkConnectedStatus'],
  chains: [122, 42220, 50],
  states: [
    'not_connected',
    'connecting',
    'connected_no_input',
    'checking_address',
    'ready',
    'error',
  ],
  events: ['link-success', 'link-error', 'unlink-success'],
} as const

export type ConnectAWalletIntegration = typeof connectAWalletIntegration
