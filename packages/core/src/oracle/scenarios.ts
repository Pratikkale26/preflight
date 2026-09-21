import {
  ActivationType,
  BaseFeeMode,
  buildCurve,
  CollectFeeMode,
  type ConfigParameters,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
} from '@meteora-ag/dynamic-bonding-curve-sdk'

/**
 * Configurations used to drive the oracle.
 *
 * These are deliberately plain: a single well-understood curve is worth more at
 * this stage than a wide matrix, because every field of every resulting swap is
 * going to be asserted against. Broader coverage comes later, once the engine
 * exists to compare against.
 */

export interface BaselineOptions {
  /**
   * Decimals of the quote asset. DBC accepts any SPL mint as quote, and live
   * pools use SOL (9), USDC (6) and arbitrary project tokens (6), so this is a
   * real axis rather than a hypothetical one.
   */
  readonly quoteDecimals?: TokenDecimal
  /** Decimals of the token being launched. */
  readonly baseDecimals?: TokenDecimal
  /**
   * Quote raised before the curve graduates, in whole quote tokens. The right
   * value differs by quote asset: 50 SOL and 50 USDC are not comparable sums.
   */
  readonly migrationQuoteThreshold?: number
  /** Total supply of the launched token. */
  readonly totalTokenSupply?: number
}

/**
 * A baseline launch: two curve segments, a flat 1% fee, no dynamic fee, fees
 * collected in the quote token, graduating to DAMM v2.
 *
 * A flat fee schedule (start == end) is chosen on purpose so that the first
 * fixtures isolate curve mechanics from fee decay; time-varying fees are a
 * separate scenario.
 */
export function baselineConfig(options: BaselineOptions = {}): ConfigParameters {
  return buildCurve({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: options.baseDecimals ?? TokenDecimal.SIX,
      tokenQuoteDecimal: options.quoteDecimals ?? TokenDecimal.NINE,
      tokenAuthorityOption: TokenAuthorityOption.CreatorUpdateAuthority,
      totalTokenSupply: options.totalTokenSupply ?? 1_000_000_000,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: 100,
          endingFeeBps: 100,
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 0,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps100,
      migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    },
    liquidityDistribution: {
      partnerPermanentLockedLiquidityPercentage: 100,
      partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 0,
      creatorLiquidityPercentage: 0,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    percentageSupplyOnMigration: 20,
    migrationQuoteThreshold: options.migrationQuoteThreshold ?? 50,
  })
}

/**
 * Quote assets that mirror what DBC is actually used with in production.
 *
 * A survey of 500 live DBC pools found SOL at 9 decimals, USDC at 6, and
 * project tokens at 6. Meteora's StockLaunch additionally pairs launches
 * against Backpack-issued equities. The engine must not privilege any of them.
 */
export const QUOTE_ASSET_PROFILES = [
  { label: 'SOL', decimals: TokenDecimal.NINE, migrationQuoteThreshold: 50 },
  { label: 'USDC', decimals: TokenDecimal.SIX, migrationQuoteThreshold: 10_000 },
  { label: 'tokenized equity', decimals: TokenDecimal.SIX, migrationQuoteThreshold: 750 },
] as const
