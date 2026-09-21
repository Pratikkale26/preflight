import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { DbcOracle } from './harness.js'
import { loadProgramManifest, programBytecodePath } from './programs.js'
import { baselineConfig } from './scenarios.js'
import { type Json, toJson } from './serialize.js'

/**
 * Fixtures are recordings of what the real program did.
 *
 * Every number the engine will later be asserted against comes from here, so
 * the recording is deliberately complete: the config it was produced from, the
 * pool state before and after each swap, the full decoded event, and the clock
 * at the moment of execution.
 *
 * `programSha256` pins the recording to the exact bytecode that produced it. If
 * Meteora upgrades the program, the hash changes and the fixture is known to be
 * stale rather than quietly wrong.
 */

export interface SwapRecord {
  readonly step: number
  readonly kind: 'exactIn' | 'partialFill'
  readonly swapBaseForQuote: boolean
  readonly amountIn: string
  readonly clock: { readonly slot: string; readonly unixTimestamp: string }
  readonly event: Json
  readonly legacyEvent: Json
  readonly poolStateAfter: Json
}

export interface OracleFixture {
  readonly name: string
  readonly description: string
  readonly programId: string
  readonly programSha256: string
  readonly seed: string
  readonly quoteDecimals: number
  readonly configParams: Json
  readonly configAccount: Json
  readonly initialPoolState: Json
  readonly swaps: readonly SwapRecord[]
}

function dbcProgramSha256(): string {
  const manifest = loadProgramManifest()
  const dbc = manifest.programs.find((p) => p.name === 'dynamic-bonding-curve')
  if (!dbc) throw new Error('dynamic-bonding-curve missing from the program manifest')
  return createHash('sha256')
    .update(readFileSync(programBytecodePath(dbc.file)))
    .digest('hex')
}

/**
 * A full launch on the baseline config: four buys that walk the curve up,
 * then an oversized partial-fill buy that completes it.
 *
 * The last swap is the interesting one. It is deliberately larger than the
 * remaining room on the curve, so the program has to stop at the migration
 * price and hand back the unconsumed input.
 */
export async function buildBaselineFixture(): Promise<OracleFixture> {
  const seed = 'preflight/baseline'
  const oracle = await DbcOracle.create({ seed })
  const configParams = baselineConfig()

  const config = await oracle.createConfig(configParams)
  const handle = await oracle.createPool(config, {
    name: 'Preflight Baseline',
    symbol: 'PFB',
    uri: 'https://example.invalid/pfb.json',
  })
  await oracle.fundQuote(oracle.payer.publicKey, 1_000n * 1_000_000_000n)

  const initialPoolState = toJson(await oracle.poolState(handle.pool))
  const swaps: SwapRecord[] = []

  const buys = [1n, 5n, 12n, 20n].map((n) => n * 1_000_000_000n)
  for (const [index, amountIn] of buys.entries()) {
    // Advance between trades so the fee scheduler and volatility tracker see
    // time pass rather than every swap landing in the same instant.
    if (index > 0) oracle.advanceSeconds(30n)
    const observation = await oracle.swap(handle, { amountIn, swapBaseForQuote: false })
    swaps.push({
      step: swaps.length,
      kind: 'exactIn',
      swapBaseForQuote: false,
      amountIn: amountIn.toString(),
      clock: {
        slot: observation.clock.slot.toString(),
        unixTimestamp: observation.clock.unixTimestamp.toString(),
      },
      event: toJson(observation.event),
      legacyEvent: toJson(observation.legacyEvent),
      poolStateAfter: toJson(observation.poolStateAfter),
    })
  }

  // Far more than the curve can absorb: this must partial-fill and complete.
  oracle.advanceSeconds(30n)
  const finalAmount = 40n * 1_000_000_000n
  const completion = await oracle.swapPartialFill(handle, {
    amountIn: finalAmount,
    swapBaseForQuote: false,
  })
  swaps.push({
    step: swaps.length,
    kind: 'partialFill',
    swapBaseForQuote: false,
    amountIn: finalAmount.toString(),
    clock: {
      slot: completion.clock.slot.toString(),
      unixTimestamp: completion.clock.unixTimestamp.toString(),
    },
    event: toJson(completion.event),
    legacyEvent: toJson(completion.legacyEvent),
    poolStateAfter: toJson(completion.poolStateAfter),
  })

  return {
    name: 'baseline',
    description:
      'Two-segment curve, flat 100 bps fee, no dynamic fee, quote-token fees, ' +
      'timestamp activation. Four exact-in buys followed by an oversized ' +
      'partial-fill buy that completes the curve.',
    programId: oracle.programId,
    programSha256: dbcProgramSha256(),
    seed,
    quoteDecimals: oracle.quoteDecimals,
    configParams: toJson(configParams),
    configAccount: toJson(await oracle.configState(config)),
    initialPoolState,
    swaps,
  }
}
