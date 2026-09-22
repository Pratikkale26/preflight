import { Nav } from '../components/Nav'

/**
 * The landing page.
 *
 * Written to be specific rather than persuasive: the claims here are ones the
 * repository can be checked against, because the audience is people who will
 * check.
 */
export default function Landing() {
  return (
    <>
      <Nav />

      <header className="hero">
        <div className="wrap">
          <div className="eyebrow">
            <span className="pin">Meteora DBC</span>
            <span>Open source · built for the Crypto World&rsquo;s Fair</span>
          </div>

          <h1 className="display">
            Launch the curve you meant to launch.
            <span className="dim"> Not the one you found out about.</span>
          </h1>

          <p className="lede">
            A Dynamic Bonding Curve is a mechanism-design decision: the shape of the curve and the
            fee that defends it decide whether the first thirty seconds belong to a sniper or to
            your buyers. Today you find out once the money is real. Preflight lets you find out
            first.
          </p>

          <div className="cta-row">
            <a className="btn btn-primary btn-lg" href="/simulate">
              Simulate a launch
            </a>
            <a className="btn btn-ghost btn-lg" href="https://github.com/Pratikkale26/preflight">
              Read the source
            </a>
            <span className="cta-note">No wallet. Nothing to install.</span>
          </div>
        </div>
      </header>

      <section className="section" id="problem">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">The problem</div>
            <h2 className="title">Curve parameters are chosen by guesswork</h2>
            <p>
              A launch partner picks a starting price, a fee schedule and a graduation threshold,
              and then discovers what those choices meant from the holder distribution afterwards.
              There is no undo. Copying someone else&rsquo;s config is the usual answer, which is
              how a mistake propagates across a whole ecosystem.
            </p>
          </div>

          <blockquote className="pull">
            A sniper bot bought half the float five seconds after one mainnet launch and sold it
            back fifteen seconds later — at a loss, because the opening fee was set high enough to
            make being first expensive. That is a curve doing its job. The question Preflight
            answers is whether yours will.
            <cite>Observed on a real DBC launch, September 2026</cite>
          </blockquote>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">How it works</div>
            <h2 className="title">Configure, simulate, then decide</h2>
          </div>

          <div className="grid-3">
            <article className="card">
              <div className="step">01 — Configure</div>
              <h3>Describe the launch</h3>
              <p>
                Curve shape, opening fee, graduation threshold, and what the launch is priced in.
                Any SPL mint can be the quote asset, so a memecoin in SOL and a token priced in a
                tokenized equity are the same arithmetic.
              </p>
            </article>
            <article className="card">
              <div className="step">02 — Simulate</div>
              <h3>Let the wrong people show up</h3>
              <p>
                Snipers buy first and largest. Whales move the price on their own. Organic buyers
                trickle in and some of them sell. Every run is seeded, so the same inputs always
                give the same launch and any difference you see is the curve.
              </p>
            </article>
            <article className="card">
              <div className="step">03 — Read the outcome</div>
              <h3>See who ends up holding it</h3>
              <p>
                Whether it graduated and how long it took, what trading cost, and how the supply was
                distributed at the end. That last number is the one that is hard to look at after a
                launch and easy to change before one.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="proof">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Why trust the numbers</div>
            <h2 className="title">The engine is checked against the real program</h2>
            <p>
              A simulator is only worth as much as its agreement with the thing it simulates. So
              Preflight does not model Meteora&rsquo;s bonding curve from the documentation. It runs
              Meteora&rsquo;s deployed mainnet bytecode inside an in-process SVM, records what the
              program actually did, and replays those recordings through the engine — comparing
              every field of every swap exactly, with no tolerances.
            </p>
            <p style={{ marginTop: 14 }}>
              Meteora&rsquo;s SDK supplies the per-swap arithmetic and Preflight calls it rather
              than writing a second copy. What Preflight adds — and what these numbers are about —
              is the part that exists nowhere else: carrying state forward across a whole launch,
              through reserves, six fee buckets, the volatility tracker and graduation.
            </p>
          </div>

          <div className="proof">
            <div>
              <div className="n">941</div>
              <div className="l">real mainnet swaps replayed end to end</div>
            </div>
            <div>
              <div className="n">13</div>
              <div className="l">of 21 fields per swap are Preflight&rsquo;s own state</div>
            </div>
            <div>
              <div className="n">178</div>
              <div className="l">tests, run before every commit</div>
            </div>
            <div>
              <div className="n">0</div>
              <div className="l">divergences from the deployed program</div>
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: 18 }}>
            <article className="card">
              <h3>Recordings, not assumptions</h3>
              <p>
                Three launches are recorded from the real program and committed: a plain curve, one
                with the volatility-driven dynamic fee, and one collecting fees in the token being
                bought. Each is replayed on every test run. If Meteora upgrades the program, the
                recordings are marked stale rather than quietly wrong.
              </p>
            </article>
            <article className="card">
              <h3>Tested by breaking it</h3>
              <p>
                The differential suite is checked by deliberately introducing errors into the engine
                and confirming each is caught — an off-by-one lamport, a fee taken on the wrong side
                of a trade, a volatility timestamp advanced when it should not be. Two of those
                initially slipped through, and the fix was a better recording rather than a weaker
                test.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ textAlign: 'center' }}>
          <h2 className="title" style={{ maxWidth: '20ch', margin: '0 auto' }}>
            Find out before it matters
          </h2>
          <div className="cta-row" style={{ justifyContent: 'center', marginTop: 26 }}>
            <a className="btn btn-primary btn-lg" href="/simulate">
              Simulate a launch
            </a>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          Preflight is open source under the MIT licence and builds on Meteora&rsquo;s{' '}
          <a href="https://github.com/MeteoraAg/dynamic-bonding-curve">Dynamic Bonding Curve</a>{' '}
          program and SDK. Not affiliated with Meteora.
        </div>
      </footer>
    </>
  )
}
