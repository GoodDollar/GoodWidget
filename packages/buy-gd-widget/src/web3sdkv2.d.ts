declare module '@gooddollar/web3sdk-v2/dist/esm/sdk/buygd/react' {
  export function useBuyGd(options: {
    donateOrExecTo?: string
    callData?: string
    withSwap?: boolean
  }): {
    createAndSwap: (minAmount: string) => Promise<unknown>
    swap: (minAmount: string) => Promise<unknown>
    triggerSwapTx: () => Promise<Response>
    swapState: unknown
    createState: unknown
    gdHelperAddress: unknown
  }
}
