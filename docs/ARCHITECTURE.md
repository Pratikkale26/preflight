# Architecture

> This document describes the intended structure and the reasoning behind it. Packages are
> introduced phase by phase; only `@preflight/core` exists so far, and it is currently an empty
> public surface.

## Package layout

```
packages/
  core      simulation engine — raw atomic units only
  config    curve construction, validation, quote-asset descriptor, presets
  agents    seeded agent-based market simulation
  metrics   traces to metrics, including fiat-denominated views
  replay    on-chain ingestion and differential replay
  cli       headless runner
apps/
  web       user interface
```

## The central invariant

`core` never sees decimals, symbols, or fiat prices.

Everything inside the DBC program — reserves, liquidity, thresholds, fees — is denominated in raw
atomic units. Decimals enter the system in exactly one place, when a square-root price is rendered
as a human price:

```
price = (sqrt_price^2 / 2^128) * 10^(base_decimals - quote_decimals)
```

Keeping that conversion out of the engine is what makes the engine quote-asset agnostic. A
`QuoteAsset { mint, decimals, symbol, fiatReference? }` descriptor lives in `config`, `metrics`
and `web`. Support for tokenized equities is therefore a descriptor and a preset, not a fork of
the engine — and the test that proves it is that no engine code path branches on asset identity.

## Engine strategy: wrap, then verify

Meteora's TypeScript SDK already contains a faithful port of the _per-swap_ math. What does not
exist anywhere is the **stateful layer**: applying a swap to pool state, evolving the volatility
tracker, advancing the fee scheduler, and handling migration — which is what a simulator actually
needs.

So Preflight wraps the SDK's math behind its own interface and builds the state machine itself.
Differential tests against the deployed program are the ground truth either way; if the SDK is
ever found to diverge from deployed bytecode, the interface confines the replacement to one layer.

Compiling the program's Rust math to WebAssembly was considered and rejected: extracting it from
Anchor's `Result` and `#[zero_copy]` machinery is disproportionate work, and it provides no
assurance that differential testing does not already provide.

## Two clocks

DBC advances on two independent clocks, and conflating them is the most common modelling error:

- The **fee scheduler** advances on `current_point`, which is a **slot** or a **unix timestamp**
  depending on the config's `activation_type`.
- The **volatility tracker** always decays on **wall-clock timestamps**.

The engine is parameterised by both. Agent simulations generate both; historical replay supplies
real slots and real block times.

## Verification

- **Unit and property tests** for arithmetic and invariants.
- **Differential tests** against the deployed DBC program executed in LiteSVM.
- **Replay tests** against recorded mainnet swap events.

`pnpm verify` runs typecheck, format check, and tests, and must pass before every commit. There is
no CI; verification is local and deliberate.
