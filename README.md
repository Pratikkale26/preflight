<p align="center">
  <img src="assets/logo.png" alt="Preflight" width="440">
</p>

<p align="center">
  <strong>Simulate your Meteora Dynamic Bonding Curve configuration before real money hits the curve.</strong>
</p>

<p align="center">
  <a href="#the-correctness-claim">Correctness</a> &middot;
  <a href="#quote-asset-agnostic-by-construction">Quote-asset agnostic</a> &middot;
  <a href="#development">Development</a> &middot;
  <a href="LICENSE">MIT</a>
</p>

---

Preflight is a simulation and mechanism-design tool for [Meteora](https://meteora.ag)
Dynamic Bonding Curves (DBC). It lets a launcher configure a curve, simulate adversarial and
organic market behaviour against it, measure the outcome, validate the simulation against real
on-chain behaviour, and only then deploy.

> **Status: early development.** The repository is public from its first commit so that the work is
> visible as it happens.
>
> **What runs today:** the oracle — Meteora's deployed program executing in-process — and the
> simulation engine, which replays two recorded launches bit-exactly, every field, no tolerances.
> There is also a configuration layer: curve presets, a validator that agrees with the program about
> what it would reject, and the read-outs a launcher acts on. Tests cover SOL-, stablecoin- and
> equity-quoted launches. **What does not exist yet:** the agent simulation, the metrics, and the
> interface.

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
- **Historical replay as validation.** The program emits complete swap results on-chain, so
  replaying a real launch and diffing every recorded field turns published history into a
  correctness test. Launches executed on mainnet by people with no connection to this project
  replay with every field reproduced exactly — see [`docs/VALIDATION.md`](docs/VALIDATION.md).

The source of truth is the [DBC program](https://github.com/MeteoraAg/dynamic-bonding-curve)
itself, not documentation.

- **Live pools, read from the chain.** A running launch can be loaded from mainnet and simulated
  forward from where it stands. One of the pools captured for the tests had already graduated, and
  it came to rest at exactly its migration price with a quote reserve one lamport over the
  threshold — the same rounding the recorded fixture shows, reached independently.
- **The curve you simulate is the curve you launch.** `pnpm deploy:devnet` builds a config,
  validates it, deploys it, reads the accounts back, and checks the deployed curve against what was
  predicted. The most recent run is recorded in
  [`docs/devnet-deployment.json`](docs/devnet-deployment.json).

The first of these already runs. `packages/core/fixtures/oracle/baseline.json` is a recording of a
complete launch made by executing the real bytecode: four buys walking the curve up, then an
oversized buy that partial-fills, halts exactly at the migration price and hands back the remainder.
That last trade is the one a naive simulator gets wrong, and it is now pinned to a number.

## Quote-asset agnostic by construction

`@preflight/core` operates exclusively in raw atomic units and never sees token decimals, ticker
symbols, or fiat prices. Those live in the configuration, metrics, and UI layers.

This is not an abstraction added for its own sake — it reflects how DBC actually works. Any SPL
mint can be the quote asset, and production pools today are quoted in SOL, USDC, and arbitrary
project tokens with differing decimals. Meteora's own StockLaunch pairs launches against
tokenized equities.

This is tested rather than asserted: the same curve is run against SOL at 9 decimals, USDC at 6,
and an equity profile at 6 — each with a realistic migration threshold — on the real program, and
the fee split, price movement and threshold denomination behave identically in every case.

## Running it

Requires Node >= 20 and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Then open <http://localhost:3000>. Pick a quote asset, move the fee or the
graduation threshold, change who turns up, and the launch re-runs as you type —
the engine is plain arithmetic and runs in the browser, so nothing round-trips
to a server.

The same seed always produces the same launch. That is what makes two curves
comparable: any difference you see is the configuration, not the dice.

### Checking it

```bash
pnpm verify      # typecheck, formatting, program-hash check, and the test suite
pnpm coverage    # which lines and branches the tests actually reach
```

`pnpm verify` is the gate: it must pass before any commit. It includes the
differential tests, which boot Meteora's deployed bytecode in an in-process SVM
and compare the engine against it field by field. No network access is needed —
the program binaries are committed for exactly that reason.

```bash
pnpm programs:dump   # refresh the committed bytecode from mainnet (needs .env)
```

Copy `.env.example` to `.env` and add an RPC endpoint if you want to re-dump the
programs. Nothing else needs it.

## Acknowledgements

Preflight builds on Meteora's open-source work, in particular the
[Dynamic Bonding Curve program](https://github.com/MeteoraAg/dynamic-bonding-curve) and the
[TypeScript SDK](https://github.com/MeteoraAg/dynamic-bonding-curve-sdk), whose swap math this
project wraps and verifies against.

## Licence

MIT © Pratik Kale
