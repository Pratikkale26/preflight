import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { buildBaselineFixture, type OracleFixture } from './fixtures.js'

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/oracle/baseline.json',
)

/**
 * The recorded fixture is regenerated on every run and compared against the
 * committed copy. That makes this test do double duty: it proves the oracle is
 * deterministic, and it makes any change in the program's behaviour show up as
 * a diff rather than as a silently updated expectation.
 *
 * Set UPDATE_FIXTURES=1 to accept a change deliberately.
 */
describe('baseline oracle fixture', () => {
  it('is deterministic and matches the committed recording', async () => {
    const generated = await buildBaselineFixture()

    if (!existsSync(fixturePath) || process.env['UPDATE_FIXTURES'] === '1') {
      mkdirSync(dirname(fixturePath), { recursive: true })
      writeFileSync(fixturePath, `${JSON.stringify(generated, null, 2)}\n`)
    }

    const committed = JSON.parse(readFileSync(fixturePath, 'utf8')) as OracleFixture
    expect(generated).toEqual(committed)
  })

  it('records a launch that walks the curve up and completes it', async () => {
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as OracleFixture

    expect(fixture.swaps).toHaveLength(5)
    const prices = fixture.swaps.map((s) =>
      BigInt((s.event as { swapResult: { nextSqrtPrice: string } }).swapResult.nextSqrtPrice),
    )
    // Every buy must move the price strictly upward.
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]!).toBeGreaterThan(prices[i - 1]!)
    }

    const last = fixture.swaps.at(-1)!
    expect(last.kind).toBe('partialFill')
    const result = last.event as {
      swapResult: { amountLeft: string; excludedFeeInputAmount: string }
      quoteReserveAmount: string
      migrationThreshold: string
    }

    // The final swap was larger than the curve could absorb, so the program
    // must have stopped at the migration price and returned the remainder.
    expect(BigInt(result.swapResult.amountLeft)).toBeGreaterThan(0n)
    // And the quote reserve must have reached the migration threshold.
    expect(BigInt(result.quoteReserveAmount)).toBeGreaterThanOrEqual(
      BigInt(result.migrationThreshold),
    )
  })
})
