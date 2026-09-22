/**
 * @preflight/chain — live pools, read from Solana.
 *
 * Lets the engine be pointed at a launch that is already running: load what the
 * program currently holds, and simulate forward from there. The same decoding
 * serves historical replay, where the accounts come from a recording rather
 * than from an endpoint.
 */

export { decodeLivePool, decodePoolConfig, decodeVirtualPool } from './decode.js'
export type { LivePool } from './decode.js'
export {
  configAddressOf,
  DBC_PROGRAM_ID,
  fetchLivePool,
  NotADbcPoolError,
  PoolNotFoundError,
} from './fetch.js'
