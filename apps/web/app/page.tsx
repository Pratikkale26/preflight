'use client'

import { useMemo, useState } from 'react'

import { HolderChart } from '../components/HolderChart'
import { PriceChart } from '../components/PriceChart'
import { DEFAULT_INPUTS, type LaunchInputs, type QuoteKey, simulate } from '../lib/simulate'

export default function Page() {
  const [inputs, setInputs] = useState<LaunchInputs>(DEFAULT_INPUTS)

  // The engine is fast enough that a launch re-runs as the form changes; there
  // is no button because there is no wait worth announcing.
  const outcome = useMemo(() => {
    try {
      return { ok: true as const, value: simulate(inputs) }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
    }
  }, [inputs])

  const set = <K extends keyof LaunchInputs>(key: K, value: LaunchInputs[K]) =>
    setInputs((current) => ({ ...current, [key]: value }))

  return (
    <div className="shell">
      <header className="masthead">
        <img src="/logo.png" alt="Preflight" />
        <span className="tag">Simulate a Meteora bonding curve before real money hits it</span>
      </header>

      <div className="layout">
        <div>
          <section className="panel">
            <h2>Curve</h2>
            <Field label="Quote asset">
              <select
                value={inputs.quote}
                onChange={(e) => set('quote', e.target.value as QuoteKey)}
              >
                <option value="SOL">SOL — the usual case</option>
                <option value="USDC">USDC — stable denominator</option>
                <option value="AAPLx">AAPLx — tokenized equity</option>
              </select>
            </Field>
            <NumberField
              label="Starting fee (bps)"
              value={inputs.startingFeeBps}
              min={25}
              max={9900}
              onChange={(v) => set('startingFeeBps', v)}
            />
            <NumberField
              label={`Graduates at (${outcome.ok ? outcome.value.quoteAsset.symbol : 'quote'})`}
              value={inputs.migrationQuoteThreshold}
              min={1}
              onChange={(v) => set('migrationQuoteThreshold', v)}
            />
            <NumberField
              label="Total token supply"
              value={inputs.totalTokenSupply}
              min={1_000}
              step={1_000_000}
              onChange={(v) => set('totalTokenSupply', v)}
            />
          </section>

          <section className="panel">
            <h2>Who shows up</h2>
            <NumberField
              label="Snipers"
              value={inputs.snipers}
              min={0}
              max={10}
              onChange={(v) => set('snipers', v)}
            />
            <NumberField
              label="Whales"
              value={inputs.whales}
              min={0}
              max={10}
              onChange={(v) => set('whales', v)}
            />
            <NumberField
              label="Organic buyers"
              value={inputs.organics}
              min={0}
              max={40}
              onChange={(v) => set('organics', v)}
            />
            <Field label="Seed">
              <input value={inputs.seed} onChange={(e) => set('seed', e.target.value)} />
            </Field>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              The same seed always produces the same launch, so two curves can be compared without
              the dice getting in the way.
            </p>
          </section>
        </div>

        <div>
          {!outcome.ok ? (
            <section className="panel">
              <h2>This curve could not be simulated</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, margin: 0 }}>
                {outcome.error}
              </p>
            </section>
          ) : (
            <Results outcome={outcome.value} />
          )}
        </div>
      </div>
    </div>
  )
}

function Results({ outcome }: { outcome: ReturnType<typeof simulate> }) {
  const { report, derived, findings, quoteAsset } = outcome
  const held = report.concentration

  return (
    <>
      <div className="tiles">
        <Tile
          k="Graduated"
          v={report.graduated ? 'Yes' : 'No'}
          s={
            report.graduated && report.timeToGraduationSeconds !== null
              ? `after ${formatDuration(report.timeToGraduationSeconds)}`
              : `raised ${short(report.quoteRaised, quoteAsset.decimals)} of ${derived.migrationQuoteThreshold}`
          }
        />
        <Tile
          k="Price multiple"
          v={`${report.priceMultiple.toFixed(2)}×`}
          s={`${report.trades} trades`}
        />
        <Tile
          k="Largest holder"
          v={`${(held.topHolderShare * 100).toFixed(1)}%`}
          s={`${held.holders} holders · Gini ${held.gini.toFixed(2)}`}
        />
        <Tile
          k="Snipers hold"
          v={`${(held.sniperShare * 100).toFixed(1)}%`}
          s="of the supply sold"
        />
        <Tile
          k="Fees collected"
          v={short(report.feesTotal, quoteAsset.decimals)}
          s={`${quoteAsset.symbol} · ${report.buys} buys, ${report.sells} sells`}
        />
        <Tile
          k="Avg slippage"
          v={`${(report.averageSlippage * 100).toFixed(2)}%`}
          s={`worst ${(report.worstSlippage * 100).toFixed(1)}%`}
        />
      </div>

      <section className="panel">
        <h2>Price</h2>
        <PriceChart
          candles={report.candles}
          quoteSymbol={quoteAsset.symbol}
          migrationPrice={derived.migrationPrice}
        />
      </section>

      <section className="panel">
        <h2>Who ended up holding it</h2>
        <HolderChart agents={outcome.agents} baseDecimals={6} />
      </section>

      {findings.length > 0 && (
        <section className="panel">
          <h2>Before you launch this</h2>
          <ul className="findings">
            {findings.map((finding) => (
              <li key={finding.code}>
                <span
                  className="dot"
                  style={{
                    background: finding.severity === 'error' ? 'var(--bad)' : 'var(--warn)',
                  }}
                />
                <span>{finding.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function Tile({ k, v, s }: { k: string; v: string; s?: string }) {
  return (
    <div className="tile">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => {
          const parsed = Number(e.target.value)
          if (Number.isFinite(parsed)) onChange(parsed)
        }}
      />
    </Field>
  )
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
