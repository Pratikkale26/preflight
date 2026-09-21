# Preflight

**Simulate your Meteora Dynamic Bonding Curve configuration before real money hits the curve.**

Preflight is a simulation and mechanism-design tool for [Meteora](https://meteora.ag)
Dynamic Bonding Curves (DBC). It lets a launcher configure a curve, simulate adversarial and
organic market behaviour against it, measure the outcome, validate the simulation against real
on-chain behaviour, and only then deploy.

> **Status: early development.** The repository is public from its first commit so that the work
> is visible as it happens. The simulation engine is not implemented yet — this commit is the
> project skeleton. Claims below describe what is being built and how it will be verified, not
> what already runs.

## Why

Configuring a DBC is a mechanism-design problem. Curve shape, fee schedule, migration threshold
and vesting interact in ways that are difficult to reason about on a whiteboard, and the feedback
loop today is a real launch with real money. A misconfigured curve can hand most of the supply to
the first few snipers, graduate at a valuation nobody intended, or never graduate at all.

Preflight closes that loop before the launch instead of after it.

## The correctness claim

A simulator is only useful if it behaves like the thing it simulates. Preflight's approach is to
make that testable rather than assertable:

- **Differential testing against the real program.** The deployed DBC bytecode
  (`dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`) is executed in-process via
  [LiteSVM](https://github.com/LiteSVM/litesvm), and the engine's output is compared field by
  field against it.
- **Historical replay as validation.** The program emits complete swap results on-chain. Replaying
  a real launch through the engine and diffing every recorded field turns published history into a
  correctness test.

The source of truth is the [DBC program](https://github.com/MeteoraAg/dynamic-bonding-curve)
itself, not documentation.

## Quote-asset agnostic by construction

`@preflight/core` operates exclusively in raw atomic units and never sees token decimals, ticker
symbols, or fiat prices. Those live in the configuration, metrics, and UI layers.

This is not an abstraction added for its own sake — it reflects how DBC actually works. Any SPL
mint can be the quote asset, and production pools today are quoted in SOL, USDC, and arbitrary
project tokens with differing decimals. The same engine therefore covers a memecoin launch quoted
in SOL and a tokenized-equity launch quoted in a stock token, with no code path branching on which
is which.

## Development

Requires Node >= 20 and pnpm.

```bash
pnpm install
pnpm verify      # typecheck + format check + tests
```

`pnpm verify` is the gate: it must pass before any commit.

## Acknowledgements

Preflight builds on Meteora's open-source work, in particular the
[Dynamic Bonding Curve program](https://github.com/MeteoraAg/dynamic-bonding-curve) and the
[TypeScript SDK](https://github.com/MeteoraAg/dynamic-bonding-curve-sdk), whose swap math this
project wraps and verifies against.

## Licence

MIT © Pratik Kale
