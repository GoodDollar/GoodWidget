import {
  type PublicClient,
  type WalletClient,
  parseAbi,
  formatEther,
  parseEther,
  type SimulateContractParameters,
} from 'viem'

// ---------------------------------------------------------------------------
// Contract ABIs
// ---------------------------------------------------------------------------

const STAKING_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function earned(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function periodFinish() view returns (uint256)',
  'function getEffectiveRewardRate() view returns (uint256)',
  'function stake(uint256 amount)',
  'function withdraw(uint256 amount)',
  'function getReward()',
])

const G$_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
])

// ---------------------------------------------------------------------------
// Contract addresses (Celo mainnet, chain id 42220)
// ---------------------------------------------------------------------------

/** GoodDollar staking/savings contract on Celo mainnet */
export const STAKING_CONTRACT_ADDRESS =
  '0x799a23dA264A157Db6F9c02BE62F82CE8d602A45' as const

/** G$ token contract on Celo mainnet */
export const GDOLLAR_CONTRACT_ADDRESS =
  '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A' as const

const stakingContract = {
  address: STAKING_CONTRACT_ADDRESS,
  abi: STAKING_ABI,
} as const

const gdollarContract = {
  address: GDOLLAR_CONTRACT_ADDRESS,
  abi: G$_ABI,
} as const

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GlobalStats {
  /** Total G$ staked in the pool (18-decimal wei) */
  totalStaked: bigint
  /** Annual percentage rate (e.g. 12.5 means 12.5%) */
  annualAPR: number
}

export interface UserStats {
  /** User's G$ wallet balance (18-decimal wei) */
  walletBalance: bigint
  /** User's current stake in the pool (18-decimal wei) */
  currentStake: bigint
  /** Accumulated but unclaimed reward (18-decimal wei) */
  unclaimedRewards: bigint
  /** Estimated weekly reward for the user (18-decimal wei) */
  userWeeklyRewards: bigint
}

// ---------------------------------------------------------------------------
// SDK class
// ---------------------------------------------------------------------------

/**
 * GooddollarSavingsSDK — thin viem wrapper for the GoodDollar savings/staking
 * contract on Celo mainnet (chain id 42220).
 *
 * A `publicClient` is required at construction. A `walletClient` is only
 * needed for write operations (stake / unstake / claimReward).
 */
export class GooddollarSavingsSDK {
  private publicClient: PublicClient
  private walletClient: WalletClient | null = null

  /** Cached values used to derive per-user weekly rewards */
  private _totalStaked: bigint = 0n
  private _rewardRate: bigint = 0n

  constructor(publicClient: PublicClient, walletClient?: WalletClient) {
    if (!publicClient) throw new Error('publicClient is required')
    if ((publicClient.chain?.id as number) !== 42220) {
      throw new Error('publicClient must be on Celo mainnet (chainId 42220)')
    }
    this.publicClient = publicClient
    if (walletClient) this.setWalletClient(walletClient)
  }

  setWalletClient(walletClient: WalletClient) {
    if ((walletClient.chain?.id as number) !== 42220) {
      throw new Error('walletClient must be on Celo mainnet (chainId 42220)')
    }
    this.walletClient = walletClient
  }

  // -------------------------------------------------------------------------
  // Read methods
  // -------------------------------------------------------------------------

  async getGlobalStats(): Promise<GlobalStats> {
    const [totalSupply, periodFinish, effectiveRewardRate] = await Promise.all([
      this.publicClient.readContract({ ...stakingContract, functionName: 'totalSupply' }),
      this.publicClient.readContract({ ...stakingContract, functionName: 'periodFinish' }),
      this.publicClient.readContract({ ...stakingContract, functionName: 'getEffectiveRewardRate' }),
    ])

    const now = BigInt(Math.floor(Date.now() / 1000))
    const isFinished = periodFinish > 0n && periodFinish < now

    this._totalStaked = totalSupply
    this._rewardRate = isFinished ? 0n : effectiveRewardRate

    let annualAPR = 0
    if (!isFinished && totalSupply > 0n) {
      const secondsInYear = BigInt(365 * 24 * 60 * 60)
      annualAPR =
        (Number(formatEther(this._rewardRate * secondsInYear)) * 100) /
        Number(formatEther(totalSupply))
    }

    return { totalStaked: totalSupply, annualAPR }
  }

  async getUserStats(): Promise<UserStats> {
    const account = await this._getAccount()

    const [balance, staked, earned] = await Promise.all([
      this.publicClient.readContract({ ...gdollarContract, functionName: 'balanceOf', args: [account] }),
      this.publicClient.readContract({ ...stakingContract, functionName: 'balanceOf', args: [account] }),
      this.publicClient.readContract({ ...stakingContract, functionName: 'earned', args: [account] }),
    ])

    // Ensure global stats are loaded so we can estimate weekly rewards
    if (staked > 0n && this._totalStaked === 0n) {
      await this.getGlobalStats()
    }

    let userWeeklyRewards = 0n
    if (staked > 0n && this._totalStaked > 0n) {
      const oneWeekSeconds = BigInt(7 * 24 * 60 * 60)
      userWeeklyRewards = (this._rewardRate * oneWeekSeconds * staked) / this._totalStaked
    }

    return {
      walletBalance: balance,
      currentStake: staked,
      unclaimedRewards: earned,
      userWeeklyRewards,
    }
  }

  // -------------------------------------------------------------------------
  // Write methods
  // -------------------------------------------------------------------------

  /**
   * Stake G$ tokens. Automatically ensures the staking contract has sufficient
   * allowance before submitting the stake transaction.
   *
   * @param amount - Amount in 18-decimal G$ wei.
   * @param onHash - Optional callback fired once the tx hash is known.
   */
  async stake(amount: bigint, onHash?: (hash: `0x${string}`) => void) {
    if (amount <= 0n) throw new Error('Amount must be greater than zero')
    const account = await this._getAccount()

    const balance = await this.publicClient.readContract({
      ...gdollarContract,
      functionName: 'balanceOf',
      args: [account],
    })
    if (balance < amount) throw new Error('Insufficient G$ balance for staking')

    await this._ensureAllowance(amount, onHash)

    return this._submitAndWait({ ...stakingContract, functionName: 'stake', args: [amount] }, onHash)
  }

  /**
   * Unstake (withdraw) G$ tokens.
   *
   * @param amount - Amount in 18-decimal G$ wei.
   * @param onHash - Optional callback fired once the tx hash is known.
   */
  async unstake(amount: bigint, onHash?: (hash: `0x${string}`) => void) {
    if (amount <= 0n) throw new Error('Amount must be greater than zero')
    return this._submitAndWait({ ...stakingContract, functionName: 'withdraw', args: [amount] }, onHash)
  }

  /**
   * Claim accumulated staking rewards.
   *
   * @param onHash - Optional callback fired once the tx hash is known.
   */
  async claimReward(onHash?: (hash: `0x${string}`) => void) {
    return this._submitAndWait({ ...stakingContract, functionName: 'getReward', args: [] }, onHash)
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async _submitAndWait(
    params: SimulateContractParameters,
    onHash?: (hash: `0x${string}`) => void,
  ) {
    if (!this.walletClient) throw new Error('walletClient not initialized')
    const account = await this._getAccount()
    const { request } = await this.publicClient.simulateContract({ account, ...params })
    const hash = await this.walletClient.writeContract(request)
    onHash?.(hash)
    return this.publicClient.waitForTransactionReceipt({ hash })
  }

  private async _getAccount(): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error('walletClient not initialized')
    const [account] = await this.walletClient.getAddresses()
    if (!account) throw new Error('No account in walletClient')
    return account
  }

  private async _ensureAllowance(amount: bigint, onHash?: (hash: `0x${string}`) => void) {
    const account = await this._getAccount()
    const allowance = await this.publicClient.readContract({
      ...gdollarContract,
      functionName: 'allowance',
      args: [account, STAKING_CONTRACT_ADDRESS],
    })
    if (allowance < amount) {
      await this._submitAndWait(
        { ...gdollarContract, functionName: 'approve', args: [STAKING_CONTRACT_ADDRESS, amount] },
        onHash,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Formatting utilities (exported for widget use)
// ---------------------------------------------------------------------------

/** Convert a bigint wei value to a human-readable G$ string. */
export function formatG$(amount: bigint, decimals = 2): string {
  const n = Number(formatEther(amount))
  return Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n)
}

/** Parse a user-supplied G$ string to wei bigint. Returns null on invalid input. */
export function parseG$(value: string): bigint | null {
  if (!value || !value.trim()) return null
  try {
    return parseEther(value as `${number}`)
  } catch {
    return null
  }
}
