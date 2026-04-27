declare const process: {
  env: Record<string, string | undefined>
}

declare function setImmediate(callback: (...args: unknown[]) => void, ...args: unknown[]): number
