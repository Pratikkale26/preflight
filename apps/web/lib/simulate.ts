import { organic, runScenario, sniper, whale } from '@preflight/agents'
import {
  baselineConfig,
  deriveLaunchMetrics,
  type QuoteAsset,
  engineConfigFromParams,
  SOL,
  TokenProgram,
  USDC,
  validateLaunchConfig,
} from '@preflight/config'
import { type EngineConfig, openingBaseReserve, type PoolState } from '@preflight/core'
import {
  buildReport,
  curveShape,
  type CurveShapePoint,
  type LaunchReport,
} from '@preflight/metrics'

/**
 * Runs a launch in the browser.
 *
 * The whole engine is plain arithmetic, so the simulation happens on the
 * viewer's machine with no server involved. Changing a fee and seeing the
 * holder distribution move should feel immediate, and a round trip would make
 * exploring a curve feel like filing a request.
 */

/**
 * A tokenized equity, described the way a real one behaves: Token-2022 with the
 * extensions a regulated asset tends to carry, which is what makes it need a
 * TokenBadge from Meteora.
 */
export const TOKENIZED_EQUITY: QuoteAsset = {
  mint: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcAgoNZSyNfvHDf',
  symbol: 'AAPLx',
  decimals: 6,
  program: TokenProgram.Token2022,
  extensions: ['TransferHook', 'PermanentDelegate', 'MetadataPointer'],
}

export const QUOTE_ASSETS = { SOL, USDC, AAPLx: TOKENIZED_EQUITY } as const
export type QuoteKey = keyof typeof QUOTE_ASSETS

export interface LaunchInputs {
  readonly quote: QuoteKey
  readonly startingFeeBps: number
  readonly migrationQuoteThreshold: number
  readonly percentageSupplyOnMigration: number
  readonly totalTokenSupply: number
  readonly snipers: number
  readonly whales: number
  readonly organics: number
  readonly seed: string
}

export const DEFAULT_INPUTS: LaunchInputs = {
  quote: 'SOL',
  startingFeeBps: 100,
  migrationQuoteThreshold: 50,
  percentageSupplyOnMigration: 20,
  totalTokenSupply: 1_000_000_000,
  snipers: 1,
  whales: 1,
  organics: 6,
  seed: 'preflight',
}

export interface SimulationOutput {
  readonly report: LaunchReport
  /** Final holdings per participant, for the concentration breakdown. */
  readonly agents: ReturnType<typeof runScenario>['agents']
  /** The curve as designed, before fees or traders. */
  readonly shape: readonly CurveShapePoint[]
  readonly findings: ReturnType<typeof validateLaunchConfig>['findings']
  readonly valid: boolean
  readonly derived: ReturnType<typeof deriveLaunchMetrics>
  readonly quoteAsset: QuoteAsset
}

/** The pool a config starts from, before anyone has traded. */
function openingPool(config: EngineConfig): PoolState {
  return {
    sqrtPrice: config.sqrtStartPrice,
    // What the program would put in the vault: the base the curve has to sell
    // plus what is held back for the graduated pool. Derived rather than
    // invented, so the reserve shown to a reader is the real figure.
    baseReserve: openingBaseReserve(config),
    quoteReserve: 0n,
    protocolBaseFee: 0n,
    protocolQuoteFee: 0n,
    partnerBaseFee: 0n,
    partnerQuoteFee: 0n,
    creatorBaseFee: 0n,
    creatorQuoteFee: 0n,
    activationPoint: 1_767_225_600n,
    volatilityTracker: {
      lastUpdateTimestamp: 0n,
      sqrtPriceReference: config.sqrtStartPrice,
      volatilityAccumulator: 0n,
      volatilityReference: 0n,
    },
    hasSwap: false,
  }
}

export function simulate(inputs: LaunchInputs): SimulationOutput {
  const quoteAsset = QUOTE_ASSETS[inputs.quote]

  const params = baselineConfig({
    quoteDecimals: quoteAsset.decimals,
    migrationQuoteThreshold: inputs.migrationQuoteThreshold,
    totalTokenSupply: inputs.totalTokenSupply,
    startingFeeBps: inputs.startingFeeBps,
  })

  const validation = validateLaunchConfig(params, quoteAsset)
  const derived = deriveLaunchMetrics(params, quoteAsset)

  const config = engineConfigFromParams(params)
  const unit = 10n ** BigInt(quoteAsset.decimals)
  const budget = BigInt(Math.max(1, inputs.migrationQuoteThreshold)) * unit

  const trace = runScenario({
    seed: inputs.seed,
    config,
    initialPool: openingPool(config),
    maxSteps: 600,
    participants: [
      ...Array.from({ length: inputs.snipers }, (_, i) => ({
        agent: sniper(`sniper-${i}`, { size: budget / 6n, exitMultiple: 1.6 }),
        funding: budget,
      })),
      ...Array.from({ length: inputs.whales }, (_, i) => ({
        agent: whale(`whale-${i}`, {
          size: budget / 4n,
          minGapSeconds: 20,
          maxGapSeconds: 90,
          patience: 0.35,
        }),
        funding: budget * 3n,
      })),
      ...Array.from({ length: inputs.organics }, (_, i) => ({
        agent: organic(`organic-${i}`, {
          minSize: budget / 250n,
          maxSize: budget / 20n,
          sellChance: 0.25,
          activity: 0.4,
        }),
        funding: budget / 2n,
      })),
    ],
  })

  return {
    report: buildReport({ trace, config, baseDecimals: 6, quoteAsset }),
    agents: trace.agents,
    shape: curveShape(config, 6, quoteAsset.decimals),
    findings: validation.findings,
    valid: validation.valid,
    derived,
    quoteAsset,
  }
}
