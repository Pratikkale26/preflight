/**
 * @preflight/config — turning intent into a configuration the program accepts.
 *
 * This is the layer that knows about decimals, ticker symbols and fiat prices,
 * precisely so that `@preflight/core` does not have to. The engine works in raw
 * atomic units and cannot tell a memecoin from a tokenized share; everything
 * that makes those feel different is described here.
 */

export { oneWholeUnit, quoteMintEligibility, SOL, TokenProgram, USDC } from './quote-asset.js'
export type { QuoteAsset, QuoteEligibility } from './quote-asset.js'
export { baselineConfig, QUOTE_ASSET_PROFILES } from './presets.js'
export type { BaselineOptions } from './presets.js'
export { deriveLaunchMetrics } from './derive.js'
export type { LaunchMetrics } from './derive.js'
export { engineConfigFromParams } from './to-engine.js'
export { validateLaunchConfig } from './validate.js'
export type { Finding, Severity, ValidationResult } from './validate.js'
