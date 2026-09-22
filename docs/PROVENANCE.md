# How this was built

CWF asks about development provenance, and the honest answer is worth stating
plainly rather than leaving to be inferred.

## Written with Claude Code

Preflight was built in a small number of sessions using Claude Code, with the
author directing the work, making the judgement calls and reviewing what went
in. The commit history is the record: every commit is one coherent change with
a message explaining the reasoning, and the sequence shows the project being
built rather than appearing finished.

The parts that took real judgement were not the typing:

- Reading the program's Rust source rather than its documentation, after the
  published formulas turned out to be missing
- Deciding to call Meteora's SDK for the per-swap arithmetic instead of writing
  a second implementation, and being able to say why
- Choosing to validate against deployed bytecode in an in-process SVM rather
  than against expectations written by hand
- Repeatedly finding that code had been written but never actually exercised,
  and fixing the _recording_ rather than loosening the test

## What that process caught

Recorded here because the failures are more informative than the successes.

- A bigint division that truncated, making the simulated clock 20% slow
- Slippage reported in the tens of thousands of percent, from comparing atomic
  amounts against a price per whole token — finite, so every test passed
- Two mainnet trades in one slot sequenced arbitrarily, which mispriced every
  trade after them
- Swaps from other pools counted against the pool being replayed
- An exact-out swap read as exact-in, which prices a trade that never happened
- A fabricated opening base reserve, which broke no test because nothing in the
  pricing depended on it — but made every reserve shown to a reader fiction
- A validation claim that added Meteora's arithmetic and Preflight's state
  machine into one larger number

The last two were found by re-reading the project adversarially near the end,
which is worth doing.

## Dependencies

Preflight builds on Meteora's own open-source work — the
[Dynamic Bonding Curve program](https://github.com/MeteoraAg/dynamic-bonding-curve)
and its [TypeScript SDK](https://github.com/MeteoraAg/dynamic-bonding-curve-sdk)
— and on [LiteSVM](https://github.com/LiteSVM/litesvm) for running the deployed
bytecode in-process. Both tracks permit open-source components where disclosed.
This is that disclosure.

Not affiliated with Meteora.
