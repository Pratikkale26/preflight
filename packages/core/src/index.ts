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
 * The engine itself lands in a later phase. What exists today is the oracle:
 * a harness that runs Meteora's deployed program in-process, so that the
 * engine has ground truth to be measured against from the start.
 */

export { DbcOracle } from './oracle/harness.js'
export type { OracleOptions, PoolHandle, SwapObservation } from './oracle/harness.js'
export { baselineConfig } from './oracle/scenarios.js'
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
