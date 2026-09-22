'use client'

import { useMemo, useState } from 'react'

import { CurveChart } from '../components/CurveChart'
import { HolderChart } from '../components/HolderChart'
import { PriceChart } from '../components/PriceChart'
import { DEFAULT_INPUTS, type LaunchInputs, type QuoteKey, simulate } from '../lib/simulate'

export default function Page() {
  const [inputs, setInputs] = useState<LaunchInputs>(DEFAULT_INPUTS)

  // Fast enough to re-run as the form changes: there is no button because
  // there is no wait worth announcing.
  const outcome = useMemo(() => {
    try {
      return { ok: true as const, value: simulate(inputs) }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
    }
  }, [inputs])

  const set = <K extends keyof LaunchInputs>(key: K, value: LaunchInputs[K]) =>
    setInputs((current) => ({ ...current, [key]: value }))

  const symbol = outcome.ok ? outcome.value.quoteAsset.symbol : 'quote'

  return (
    <div className="shell">
      <header className="masthead">
        <img src="/logo.png" alt="Preflight" />
        <span className="rule" />
        <p>Simulate a Meteora bonding curve before real money hits it</p>
        <span className="spacer" />
        <span className="ghost">engine verified against deployed bytecode</span>
      </header>

      <div className="layout">
        <aside className="rail">
          <section className="panel">
            <header>
              <h2>The curve</h2>
            </header>

            <div className="field">
              <div className="label">
                <span>Priced in</span>
              </div>
              <div className="seg">
                {(['SOL', 'USDC', 'AAPLx'] as QuoteKey[]).map((key) => (
                  <button
                    key={key}
                    aria-pressed={inputs.quote === key}
                    onClick={() => set('quote', key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <div className="hint">
                {inputs.quote === 'AAPLx'
                  ? 'A tokenized equity. Any SPL mint can price a launch — but this one is Token-2022, which the program treats differently.'
                  : 'The curve does not care which asset it is priced in; only the decimals change.'}
              </div>
            </div>

            <Slider
              label="Opening fee"
              value={inputs.startingFeeBps}
              min={25}
              max={1000}
              step={25}
              format={(v) => `${(v / 100).toFixed(2)}%`}
              onChange={(v) => set('startingFeeBps', v)}
              hint="The lever against snipers. A high opening fee makes being first expensive."
            />
            <Slider
              label={`Graduates at`}
              value={inputs.migrationQuoteThreshold}
              min={5}
              max={500}
              step={5}
              format={(v) => `${v} ${symbol}`}
              onChange={(v) => set('migrationQuoteThreshold', v)}
              hint="Quote raised before liquidity moves to a DAMM pool."
            />
          </section>

          <section className="panel">
            <header>
              <h2>Who turns up</h2>
            </header>
            <Slider
              label="Snipers"
              value={inputs.snipers}
              min={0}
              max={6}
              onChange={(v) => set('snipers', v)}
              format={(v) => String(v)}
            />
            <Slider
              label="Whales"
              value={inputs.whales}
              min={0}
              max={6}
              onChange={(v) => set('whales', v)}
              format={(v) => String(v)}
            />
            <Slider
              label="Organic buyers"
              value={inputs.organics}
              min={0}
              max={30}
              onChange={(v) => set('organics', v)}
              format={(v) => String(v)}
            />
            <label className="field">
              <div className="label">
                <span>Seed</span>
              </div>
              <input
                type="text"
                value={inputs.seed}
                onChange={(event) => set('seed', event.target.value)}
              />
              <div className="hint">
                The same seed always gives the same launch, so a difference you see between two
                curves is the curve and not the dice.
              </div>
            </label>
          </section>
        </aside>

        <main className="stack">
          {!outcome.ok ? (
            <section className="panel">
              <header>
                <h2>This curve cannot be simulated</h2>
              </header>
              <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 13.5 }}>{outcome.error}</p>
            </section>
          ) : (
            <Results outcome={outcome.value} />
          )}
        </main>
      </div>
    </div>
  )
}

function Results({ outcome }: { outcome: ReturnType<typeof simulate> }) {
  const { report, derived, findings, quoteAsset, shape, agents } = outcome
  const held = report.concentration
  const errors = findings.filter((f) => f.severity === 'error')

  return (
    <>
      <div className={`verdict${report.graduated ? '' : ' no'}`}>
        <div className="mark">{report.graduated ? '✓' : '—'}</div>
        <div>
          <div className="headline">
            {report.graduated
              ? `Graduated in ${formatDuration(report.timeToGraduationSeconds ?? 0n)}`
              : 'Never reached graduation'}
          </div>
          <div className="sub">
            {report.graduated
              ? `${report.trades} trades raised ${short(report.quoteRaised, quoteAsset.decimals)} ${quoteAsset.symbol}. The largest holder ended with ${(held.topHolderShare * 100).toFixed(0)}% of the supply sold.`
              : `${report.trades} trades raised ${short(report.quoteRaised, quoteAsset.decimals)} of ${derived.migrationQuoteThreshold} ${quoteAsset.symbol}. Either the buyers are too small or the threshold is too high.`}
          </div>
        </div>
      </div>

      <div className="tiles">
        <Tile
          k="Opens at"
          v={fmtPrice(derived.initialPrice)}
          s={`${quoteAsset.symbol} per token`}
        />
        <Tile
          k="Graduates at"
          v={fmtPrice(derived.migrationPrice)}
          s={`${derived.priceMultiple.toFixed(1)}× along the curve`}
        />
        <Tile
          k="Largest holder"
          v={`${(held.topHolderShare * 100).toFixed(0)}%`}
          s={`${held.holders} holders · Gini ${held.gini.toFixed(2)}`}
          tone={held.topHolderShare > 0.5 ? 'warn' : undefined}
        />
        <Tile
          k="Snipers kept"
          v={`${(held.sniperShare * 100).toFixed(0)}%`}
          s="of the supply sold"
          tone={held.sniperShare > 0.3 ? 'bad' : undefined}
        />
        <Tile
          k="Fees"
          v={short(report.feesTotal, quoteAsset.decimals)}
          s={`${quoteAsset.symbol} · ${report.buys} buys, ${report.sells} sells`}
        />
        <Tile
          k="Avg slippage"
          v={`${(report.averageSlippage * 100).toFixed(1)}%`}
          s={`worst ${(report.worstSlippage * 100).toFixed(0)}%`}
        />
      </div>

      <section className="panel">
        <header>
          <h2>The curve you configured</h2>
          <span className="note">before fees, before traders</span>
        </header>
        <CurveChart
          shape={shape}
          quoteSymbol={quoteAsset.symbol}
          quoteDecimals={quoteAsset.decimals}
        />
      </section>

      <section className="panel">
        <header>
          <h2>What happened on it</h2>
          <span className="note">seed “{report.seed}”</span>
        </header>
        <PriceChart
          candles={report.candles}
          quoteSymbol={quoteAsset.symbol}
          migrationPrice={derived.migrationPrice}
        />
      </section>

      <section className="panel">
        <header>
          <h2>Who ended up holding it</h2>
          <span className="note">of the supply sold on the curve</span>
        </header>
        <HolderChart agents={agents} baseDecimals={6} />
      </section>

      {findings.length > 0 && (
        <section className="panel">
          <header>
            <h2>Before you launch this</h2>
            <span className="note">
              {errors.length > 0 ? `${errors.length} blocking` : 'nothing blocking'}
            </span>
          </header>
          <ul className="findings">
            {findings.map((finding) => (
              <li key={finding.code}>
                <span
                  className="pip"
                  style={{
                    background: finding.severity === 'error' ? 'var(--bad)' : 'var(--warn)',
                  }}
                />
                <span>
                  <b>{finding.severity === 'error' ? 'Rejected. ' : 'Worth knowing. '}</b>
                  {finding.message}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function Tile({
  k,
  v,
  s,
  tone,
}: {
  k: string
  v: string
  s?: string
  tone?: 'warn' | 'bad' | undefined
}) {
  return (
    <div className="tile">
      <div className="k">{k}</div>
      <div className={`v${tone ? ` ${tone}` : ''}`}>{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format: (value: number) => string
  onChange: (value: number) => void
  hint?: string
}) {
  return (
    <div className="field">
      <div className="label">
        <span>{label}</span>
        <span className="val">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

function fmtPrice(value: number): string {
  if (value === 0) return '0'
  if (value < 1e-6) return value.toExponential(1)
  if (value < 1) return value.toPrecision(3)
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function short(atomic: bigint, decimals: number): string {
  const whole = Number(atomic) / 10 ** decimals
  if (whole >= 1000) return whole.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return whole.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatDuration(seconds: bigint): string {
  const total = Number(seconds)
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) return `${minutes}m ${total % 60}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
