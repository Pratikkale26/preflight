/**
 * @preflight/core — the Meteora DBC simulation engine.
 *
 * Architectural invariant: the engine operates exclusively in **raw atomic
 * units**. It must never depend on token decimals, ticker symbols, or fiat
 * prices. Those belong to the configuration, metrics, and UI layers.
 *
 * That invariant is what makes the engine quote-asset agnostic by
 * construction: a curve quoted in SOL, USDC, or a tokenized equity is the same
 * arithmetic, and no code path branches on which asset is being used.
 *
 * The engine is validated by replaying recordings made from Meteora's deployed
 * program: `test/engine/differential.test.ts` compares every field of every
 * swap exactly, with no tolerances.
 */

export { VirtualPool } from './engine/pool.js'
export type { SwapOptions, SwapOutcome } from './engine/pool.js'
export { decodeConfig, decodePoolState, decodeSwapResult } from './engine/decode.js'
export {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  getFeeMode,
  TradeDirection,
} from './engine/types.js'
export type {
  CurvePoint,
  EngineConfig,
  FeeMode,
  PoolState,
  SwapResult,
  VolatilityTracker,
} from './engine/types.js'

export { DbcOracle } from './oracle/harness.js'
export type { OracleOptions, PoolHandle, SwapObservation } from './oracle/harness.js'
export { baselineConfig } from './oracle/scenarios.js'
export { buildBaselineFixture } from './oracle/fixtures.js'
export type { OracleFixture, SwapRecord } from './oracle/fixtures.js'
export { decodeAnchorEvents, findEvent } from './oracle/events.js'
export type { DecodedEvent, EventCoder } from './oracle/events.js'
export {
  DBC_PROGRAM_ID,
  loadProgramManifest,
  MPL_TOKEN_METADATA_PROGRAM_ID,
  programBytecodePath,
} from './oracle/programs.js'
export type { ProgramFixture } from './oracle/programs.js'
export { createSvmConnection } from './oracle/svm-connection.js'
export { sendInstructions, toKitInstruction, TransactionFailedError } from './oracle/tx.js'
export { toJson } from './oracle/serialize.js'
export type { Json } from './oracle/serialize.js'

/** Identifier for this package, used by the toolchain smoke test. */
export const PACKAGE_NAME = '@preflight/core'
