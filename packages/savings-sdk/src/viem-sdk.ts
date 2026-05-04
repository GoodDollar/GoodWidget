import {
  type PublicClient,
  type WalletClient,
  parseAbi,
  formatEther,
  parseEther,
  type SimulateContractParameters,
} from 'viem'

// GoodDollar staking contract on Celo mainnet
const STAKING_CONTRACT_ADDRESS = '0x799a23dA264A157Db6F9c02BE62F82CE8d602A45' as const

// G$ token contract on Celo mainnet
const GDOLLAR_CONTRACT_ADDRESS = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A' as const

const CELO_CHAIN_ID = 42220

const STAKING_CONTRACT_ABI = parseAbi([
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
  'function transferAndCall(address to, uint256 amount, bytes data) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
])

const stakingContract = {
  address: STAKING_CONTRACT_ADDRESS,
  abi: STAKING_CONTRACT_ABI,
} as const

const gdollarContract = {
  address: GDOLLAR_CONTRACT_ADDRESS,
  abi: G$_ABI,
} as const

export interface GlobalStats {
  /** Total G$ staked in wei */
  totalStaked: bigint
  /** Annual APR as a percentage, e.g. 12.5 means 12.5% */
  annualAPR: number
}

export interface UserStats {
  /** User's G$ wallet balance in wei */
  walletBalance: bigint
  /** User's currently staked amount in wei */
  currentStake: bigint
  /** Accumulated but unclaimed G$ rewards in wei */
  unclaimedRewards: bigint
  /** Projected weekly rewards in wei based on current stake */
  userWeeklyRewards: bigint
}

/**
 * GooddollarSavingsSDK — viem-based protocol client for the GoodDollar savings/staking contract.
 *
 * Source: adapted from packages/savings-sdk in the GoodDollar/GoodSDKs repository.
 * Requires a Celo mainnet PublicClient (chain id 42220).
 * Optionally accepts a WalletClient for write operations.
 */
export class GooddollarSavingsSDK {
  private publicClient: PublicClient
  private walletClient: WalletClient | null = null
  private totalStaked: bigint = BigInt(0)
  private cachedRewardRate: bigint = BigInt(0)

  constructor(publicClient: PublicClient, walletClient?: WalletClient) {
    if (!publicClient) throw new Error('Public client is required')
    if (publicClient.chain?.id !== CELO_CHAIN_ID) {
      throw new Error('Public client must be connected to Celo mainnet (chain id 42220)')
    }
    this.publicClient = publicClient
    if (walletClient) {
      this.setWalletClient(walletClient)
    }
  }

  setWalletClient(walletClient: WalletClient) {
    if (walletClient.chain?.id !== CELO_CHAIN_ID) {
      throw new Error('Wallet client must be connected to Celo mainnet (chain id 42220)')
    }
    this.walletClient = walletClient
  }

  async getGlobalStats(): Promise<GlobalStats> {
    const [totalSupply, periodFinish, effectiveRewardRate] = await Promise.all([
      this.publicClient.readContract({ ...stakingContract, functionName: 'totalSupply' }),
      this.publicClient.readContract({ ...stakingContract, functionName: 'periodFinish' }),
      this.publicClient.readContract({
        ...stakingContract,
        functionName: 'getEffectiveRewardRate',
      }),
    ])

    const currentTime = BigInt(Math.floor(Date.now() / 1000))
    const isFinished = periodFinish > 0n && periodFinish < currentTime
    this.totalStaked = totalSupply
    this.cachedRewardRate = isFinished ? 0n : effectiveRewardRate

    let annualAPR = 0
    if (!isFinished && totalSupply > 0n) {
      const secondsInYear = BigInt(365 * 24 * 60 * 60)
      annualAPR =
        (toEtherNumber(this.cachedRewardRate * secondsInYear) * 100) / toEtherNumber(totalSupply)
    }

    return { totalStaked: totalSupply, annualAPR }
  }

  async getUserStats(account: `0x${string}`): Promise<UserStats> {
    const [walletBalance, currentStake, unclaimedRewards] = await Promise.all([
      this.publicClient.readContract({
        ...gdollarContract,
        functionName: 'balanceOf',
        args: [account],
      }),
      this.publicClient.readContract({
        ...stakingContract,
        functionName: 'balanceOf',
        args: [account],
      }),
      this.publicClient.readContract({
        ...stakingContract,
        functionName: 'earned',
        args: [account],
      }),
    ])

    let userWeeklyRewards = 0n
    if (currentStake > 0n) {
      if (this.totalStaked === 0n) {
        await this.getGlobalStats()
      }
      if (this.totalStaked > 0n) {
        const oneWeekSeconds = BigInt(7 * 24 * 60 * 60)
        userWeeklyRewards = (this.cachedRewardRate * oneWeekSeconds * currentStake) / this.totalStaked
      }
    }

    return { walletBalance, currentStake, unclaimedRewards, userWeeklyRewards }
  }

  async stake(amount: bigint, onHash?: (hash: `0x${string}`) => void) {
    if (amount <= 0n) throw new Error('Amount must be greater than zero')

    const account = await this.getAccount()

    const balance = await this.publicClient.readContract({
      ...gdollarContract,
      functionName: 'balanceOf',
      args: [account],
    })

    if (balance < amount) throw new Error('Insufficient G$ balance for staking')

    await this.ensureAllowance(account, amount, onHash)

    return this.submitAndWait({ ...stakingContract, functionName: 'stake', args: [amount] }, onHash)
  }

  async unstake(amount: bigint, onHash?: (hash: `0x${string}`) => void) {
    if (amount <= 0n) throw new Error('Amount must be greater than zero')
    return this.submitAndWait(
      { ...stakingContract, functionName: 'withdraw', args: [amount] },
      onHash,
    )
  }

  async claimReward(onHash?: (hash: `0x${string}`) => void) {
    return this.submitAndWait({ ...stakingContract, functionName: 'getReward', args: [] }, onHash)
  }

  private async submitAndWait(
    simulateParams: SimulateContractParameters,
    onHash?: (hash: `0x${string}`) => void,
  ) {
    if (!this.walletClient) throw new Error('Wallet client not initialized')

    const account = await this.getAccount()

    const { request } = await this.publicClient.simulateContract({
      account,
      ...simulateParams,
    })

    const hash = await this.walletClient.writeContract(request)
    if (onHash) onHash(hash)

    return this.publicClient.waitForTransactionReceipt({ hash })
  }

  private async getAccount(): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error('Wallet client not initialized')
    const [account] = await this.walletClient.getAddresses()
    if (!account) throw new Error('No account found in wallet client')
    return account
  }

  private async ensureAllowance(
    account: `0x${string}`,
    amount: bigint,
    onHash?: (hash: `0x${string}`) => void,
  ) {
    const allowance = await this.publicClient.readContract({
      ...gdollarContract,
      functionName: 'allowance',
      args: [account, STAKING_CONTRACT_ADDRESS],
    })

    if (allowance < amount) {
      await this.submitAndWait(
        { ...gdollarContract, functionName: 'approve', args: [STAKING_CONTRACT_ADDRESS, amount] },
        onHash,
      )
    }
  }
}

/** Format a bigint wei value as a plain number (ether units). */
export function toEtherNumber(value: bigint): number {
  return Number(formatEther(value))
}

/** Format a bigint wei value for display, e.g. "1,234.56 G$". */
export function formatGDollar(value: bigint, decimals = 2): string {
  const num = toEtherNumber(value)
  return (
    new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num) + ' G$'
  )
}

/** Parse a human-readable string (ether units) to bigint wei. */
export { parseEther as parseGDollar }
