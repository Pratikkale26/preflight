import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { decodeConfig, decodePoolState, decodeSwapResult } from '../../src/engine/decode.js'
import { VirtualPool } from '../../src/engine/pool.js'
import type { OracleFixture } from '../../src/oracle/fixtures.js'

/**
 * The engine, replayed against what the real program actually did.
 *
 * This is the test the whole project rests on. The fixture was produced by
 * executing Meteora's deployed bytecode, so every expectation here is a
 * recording rather than a guess, and every field is compared exactly — no
 * tolerances, no rounding, no "close enough". A simulator that is approximately
 * right about fees and prices is not useful for deciding how to launch a token.
 */

const fixture = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/oracle/baseline.json'),
    'utf8',
  ),
) as OracleFixture

/** The field-by-field comparison, named so failures say which number is wrong. */
const SWAP_RESULT_FIELDS = [
  'includedFeeInputAmount',
  'excludedFeeInputAmount',
  'amountLeft',
  'outputAmount',
  'nextSqrtPrice',
  'tradingFee',
  'protocolFee',
  'referralFee',
] as const

const POOL_FIELDS = [
  'sqrtPrice',
  'baseReserve',
  'quoteReserve',
  'protocolBaseFee',
  'protocolQuoteFee',
  'partnerBaseFee',
  'partnerQuoteFee',
  'creatorBaseFee',
  'creatorQuoteFee',
] as const

describe('engine vs deployed program', () => {
  it('replays every recorded swap bit-exactly', () => {
    const config = decodeConfig(fixture.configAccount)
    const pool = new VirtualPool(config, decodePoolState(fixture.initialPoolState))

    expect(fixture.swaps.length).toBeGreaterThan(0)

    for (const swap of fixture.swaps) {
      const expected = decodeSwapResult((swap.event as { swapResult: unknown }).swapResult)
      const expectedState = decodePoolState(swap.poolStateAfter)

      const { result, stateAfter } = pool.swap(BigInt(swap.amountIn), 1, {
        currentPoint: BigInt(swap.clock.unixTimestamp),
        currentTimestamp: BigInt(swap.clock.unixTimestamp),
        partialFill: swap.kind === 'partialFill',
      })

      for (const field of SWAP_RESULT_FIELDS) {
        expect(result[field], `swap ${swap.step} (${swap.kind}): ${field}`).toBe(expected[field])
      }
      for (const field of POOL_FIELDS) {
        expect(stateAfter[field], `swap ${swap.step} (${swap.kind}): pool.${field}`).toBe(
          expectedState[field],
        )
      }
    }
  })

  it('agrees with the program about when the curve has completed', () => {
    const config = decodeConfig(fixture.configAccount)
    const pool = new VirtualPool(config, decodePoolState(fixture.initialPoolState))

    for (const swap of fixture.swaps) {
      expect(pool.isCurveComplete, `before swap ${swap.step}`).toBe(false)
      pool.swap(BigInt(swap.amountIn), 1, {
        currentPoint: BigInt(swap.clock.unixTimestamp),
        currentTimestamp: BigInt(swap.clock.unixTimestamp),
        partialFill: swap.kind === 'partialFill',
      })
    }

    // The recording ends with a partial fill that takes the pool over the line.
    expect(pool.isCurveComplete).toBe(true)
    expect(pool.state.quoteReserve).toBeGreaterThanOrEqual(config.migrationQuoteThreshold)
  })
})
