/**
 * @preflight/core — the Meteora DBC simulation engine.
 *
 * Architectural invariant: this package operates exclusively in **raw atomic
 * units**. It must never depend on token decimals, ticker symbols, or fiat
 * prices. Those belong to the configuration, metrics, and UI layers.
 *
 * That invariant is what makes the engine quote-asset agnostic by
 * construction: a curve quoted in SOL, USDC, or a tokenized equity is the same
 * arithmetic, and no code path branches on which asset is being used.
 *
 * The engine itself lands in a later phase; this module is currently the
 * package's empty public surface.
 */

/** Identifier for this package, used by the toolchain smoke test. */
export const PACKAGE_NAME = '@preflight/core'
