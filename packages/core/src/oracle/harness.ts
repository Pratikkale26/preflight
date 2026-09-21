import { Clock, LiteSVM, type TransactionMetadata } from 'litesvm'
import { address, lamports } from '@solana/kit'
import { Keypair, type PublicKey, SystemProgram } from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  type ConfigParameters,
  createDbcProgram,
  deriveDbcPoolAddress,
  DynamicBondingCurveClient,
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import BN from 'bn.js'

import { decodeAnchorEvents, type DecodedEvent, type EventCoder, findEvent } from './events.js'
import { loadProgramManifest, programBytecodePath } from './programs.js'
import { createSvmConnection } from './svm-connection.js'
import { sendInstructions } from './tx.js'

/**
 * Runs the real, deployed Dynamic Bonding Curve program inside an in-process
 * SVM, so the simulation engine can be checked against ground truth rather than
 * against our reading of the documentation.
 *
 * Nothing here reimplements DBC. Configs, pools and swaps are built by
 * Meteora's own SDK and executed by Meteora's own bytecode; the harness only
 * supplies an environment and records what happened.
 */

/** A realistic starting wall-clock, so recorded timestamps are not zero. */
const DEFAULT_UNIX_TIMESTAMP = 1_767_225_600n // 2026-01-01T00:00:00Z
const DEFAULT_SLOT = 300_000_000n
/**
 * Solana produces a slot roughly every 400ms. Expressed as a rational because
 * bigint division truncates: `5n / 2n` is `2n`, not 2.5.
 */
const SLOTS_PER_SECOND_NUMERATOR = 5n
const SLOTS_PER_SECOND_DENOMINATOR = 2n

export interface OracleOptions {
  /** Decimals of the quote mint the harness creates. Defaults to 9, as for SOL. */
  readonly quoteDecimals?: number
  /** Starting wall-clock time, in seconds since the epoch. */
  readonly unixTimestamp?: bigint
  /** Starting slot. */
  readonly slot?: bigint
}

export interface PoolHandle {
  readonly pool: PublicKey
  readonly config: PublicKey
  readonly baseMint: PublicKey
}

export interface SwapObservation {
  /** What the program reported, decoded from `EvtSwap2`. */
  readonly event: unknown
  /** The legacy `EvtSwap`, which older pools emit instead. */
  readonly legacyEvent: unknown
  /** Every event emitted, in order. */
  readonly events: readonly DecodedEvent[]
  /** Pool account state after the swap, decoded by the SDK. */
  readonly poolStateAfter: unknown
  /** Clock at the moment of execution. */
  readonly clock: { readonly slot: bigint; readonly unixTimestamp: bigint }
  readonly meta: TransactionMetadata
}

export class DbcOracle {
  private constructor(
    readonly svm: LiteSVM,
    readonly client: DynamicBondingCurveClient,
    private readonly eventCoder: EventCoder,
    readonly payer: Keypair,
    readonly quoteMint: PublicKey,
    readonly quoteDecimals: number,
  ) {}

  static async create(options: OracleOptions = {}): Promise<DbcOracle> {
    const svm = new LiteSVM()

    // Load the real bytecode. Both programs are required: pool creation CPIs
    // into Metaplex Token Metadata to write the base mint's metadata.
    for (const program of loadProgramManifest().programs) {
      svm.addProgramFromFile(address(program.programId), programBytecodePath(program.file))
    }

    svm.setClock(
      new Clock(
        options.slot ?? DEFAULT_SLOT,
        0n,
        0n,
        0n,
        options.unixTimestamp ?? DEFAULT_UNIX_TIMESTAMP,
      ),
    )

    const payer = Keypair.generate()
    svm.airdrop(address(payer.publicKey.toBase58()), lamports(10_000n * 1_000_000_000n))

    const connection = createSvmConnection(svm)
    const client = new DynamicBondingCurveClient(connection, 'confirmed')
    const eventCoder = createDbcProgram(connection, 'confirmed').program.coder
      .events as unknown as EventCoder

    // Deliberately a plain SPL mint rather than native SOL. The engine has to
    // be quote-asset agnostic, so the oracle should not privilege SOL either.
    const quoteDecimals = options.quoteDecimals ?? 9
    const quoteMint = Keypair.generate()
    const rent = svm.minimumBalanceForRentExemption(BigInt(MINT_SIZE))
    await sendInstructions(
      svm,
      [
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: quoteMint.publicKey,
          lamports: Number(rent),
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(quoteMint.publicKey, quoteDecimals, payer.publicKey, null),
      ],
      payer,
      [quoteMint],
    )

    return new DbcOracle(svm, client, eventCoder, payer, quoteMint.publicKey, quoteDecimals)
  }

  /** Create a DBC config account from `buildCurve`-style parameters. */
  async createConfig(params: ConfigParameters): Promise<PublicKey> {
    const config = Keypair.generate()
    const tx = await this.client.partner.createConfig({
      config: config.publicKey,
      feeClaimer: this.payer.publicKey,
      leftoverReceiver: this.payer.publicKey,
      quoteMint: this.quoteMint,
      payer: this.payer.publicKey,
      ...params,
    })
    await sendInstructions(this.svm, tx.instructions, this.payer, [config])
    return config.publicKey
  }

  /** Create a virtual pool against an existing config. */
  async createPool(
    config: PublicKey,
    metadata: { name: string; symbol: string; uri: string },
  ): Promise<PoolHandle> {
    const baseMint = Keypair.generate()
    const tx = await this.client.creator.createPool({
      ...metadata,
      payer: this.payer.publicKey,
      poolCreator: this.payer.publicKey,
      config,
      baseMint: baseMint.publicKey,
    })
    await sendInstructions(this.svm, tx.instructions, this.payer, [baseMint])

    // Derive the address rather than scanning by config: the pool is a PDA, so
    // this is exact, and it avoids needing getProgramAccounts, which an
    // in-memory SVM has no efficient answer for.
    const pool = deriveDbcPoolAddress(this.quoteMint, baseMint.publicKey, config)
    const account = this.svm.getAccount(address(pool.toBase58()))
    if (!account?.exists) throw new Error(`pool account ${pool.toBase58()} was not created`)
    return { pool, config, baseMint: baseMint.publicKey }
  }

  /** Mint quote tokens to a trader and ensure their associated account exists. */
  async fundQuote(owner: PublicKey, amount: BN | bigint): Promise<PublicKey> {
    const ata = getAssociatedTokenAddressSync(this.quoteMint, owner, true)
    await sendInstructions(
      this.svm,
      [
        createAssociatedTokenAccountIdempotentInstruction(
          this.payer.publicKey,
          ata,
          owner,
          this.quoteMint,
        ),
        createMintToInstruction(
          this.quoteMint,
          ata,
          this.payer.publicKey,
          BigInt(amount.toString()),
        ),
      ],
      this.payer,
    )
    return ata
  }

  /**
   * Execute an exact-in swap and record everything the program reported.
   *
   * `swapBaseForQuote: false` buys the base token with quote, which is the
   * direction that walks the curve upward toward migration.
   */
  async swap(
    handle: PoolHandle,
    params: { amountIn: BN | bigint; swapBaseForQuote: boolean; owner?: Keypair },
  ): Promise<SwapObservation> {
    const owner = params.owner ?? this.payer
    const clock = this.clock()
    const tx = await this.client.pool.swap({
      owner: owner.publicKey,
      pool: handle.pool,
      amountIn: new BN(params.amountIn.toString()),
      minimumAmountOut: new BN(0),
      swapBaseForQuote: params.swapBaseForQuote,
      referralTokenAccount: null,
    })
    const meta = await sendInstructions(this.svm, tx.instructions, owner)
    const events = decodeAnchorEvents(meta, this.eventCoder)

    return {
      event: findEvent(events, 'evtSwap2')?.data ?? null,
      legacyEvent: findEvent(events, 'evtSwap')?.data ?? null,
      events,
      poolStateAfter: await this.client.state.getPool(handle.pool),
      clock,
      meta,
    }
  }

  /** Decoded config account, as the program stores it. */
  async configState(config: PublicKey): Promise<unknown> {
    return this.client.state.getPoolConfig(config)
  }

  /** Decoded pool account, as the program stores it. */
  async poolState(pool: PublicKey): Promise<unknown> {
    return this.client.state.getPool(pool)
  }

  /** Current SVM clock. */
  clock(): { slot: bigint; unixTimestamp: bigint } {
    const clock = this.svm.getClock()
    return { slot: clock.slot, unixTimestamp: clock.unixTimestamp }
  }

  /**
   * Advance the clock. The fee scheduler advances on slots or timestamps
   * depending on the config's activation type, and volatility decay always runs
   * on wall-clock seconds, so both must move together.
   */
  advanceSeconds(seconds: bigint): void {
    const current = this.svm.getClock()
    this.svm.setClock(
      new Clock(
        current.slot + (seconds * SLOTS_PER_SECOND_NUMERATOR) / SLOTS_PER_SECOND_DENOMINATOR,
        current.epochStartTimestamp,
        current.epoch,
        current.leaderScheduleEpoch,
        current.unixTimestamp + seconds,
      ),
    )
  }
}
