export type HealthReading = { ok: boolean; detail: string }

export type WatchdogLimits = {
  /** How often health is read. */
  pollMs: number
  /** Consecutive unhealthy readings, after the first healthy one, before recycling. */
  failLimit: number
  /** How long a fresh process may take to report healthy at all. */
  bootLimitMs: number
  /** How far behind the event loop may fall before recycling. */
  loopLagLimitMs: number
}

/**
 * Rivet already waits 20s without an engine ping before `health()` reports `engine_ping_stale`,
 * so a short confirmation window on top of that is enough.
 */
export const DEFAULT_LIMITS: WatchdogLimits = {
  pollMs: 2_000,
  failLimit: 2,
  bootLimitMs: 60_000,
  loopLagLimitMs: 30_000,
}

/** Decides when the runner should be recycled. Returns a reason when it should, otherwise null. */
export class RunnerHealth {
  readonly #limits: WatchdogLimits
  readonly #bootAt: number
  #healthySeen = false
  #failures = 0

  constructor(bootAt: number, limits: WatchdogLimits = DEFAULT_LIMITS) {
    this.#bootAt = bootAt
    this.#limits = limits
  }

  reading(reading: HealthReading, at: number): string | null {
    if (reading.ok) {
      this.#healthySeen = true
      this.#failures = 0
      return null
    }
    if (!this.#healthySeen) {
      const waited = at - this.#bootAt
      if (waited < this.#limits.bootLimitMs) return null
      return `never became healthy after ${waited}ms (${reading.detail})`
    }
    this.#failures += 1
    if (this.#failures < this.#limits.failLimit) return null
    return `unhealthy for ${this.#failures} readings in a row (${reading.detail})`
  }

  lag(lagMs: number): string | null {
    if (lagMs < this.#limits.loopLagLimitMs) return null
    return `event loop stalled for ${lagMs}ms`
  }
}

export type WatchdogOptions = {
  health: () => Promise<HealthReading>
  recycle: (reason: string) => void
  limits?: WatchdogLimits
  now?: () => number
}

/**
 * Polls `health` and calls `recycle` once when the runner should be restarted.
 * A health read that does not settle within one poll counts as unhealthy.
 */
export function startRunnerWatchdog(options: WatchdogOptions): { stop: () => void } {
  const limits = options.limits ?? DEFAULT_LIMITS
  const now = options.now ?? Date.now
  const judge = new RunnerHealth(now(), limits)
  let stopped = false

  const loop = async () => {
    while (!stopped) {
      const before = now()
      await pause(limits.pollMs)
      if (stopped) return
      const lagged = judge.lag(now() - before - limits.pollMs)
      const reason = lagged ?? judge.reading(await readWithin(options.health, limits.pollMs), now())
      if (stopped) return
      if (reason) {
        stopped = true
        options.recycle(reason)
        return
      }
    }
  }
  void loop()

  return {
    stop: () => {
      stopped = true
    },
  }
}

async function readWithin(health: () => Promise<HealthReading>, ms: number): Promise<HealthReading> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<HealthReading>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, detail: `health did not answer within ${ms}ms` }), ms)
    timer.unref?.()
  })
  try {
    return await Promise.race([
      health().catch((error: unknown) => ({
        ok: false,
        detail: error instanceof Error ? error.message : 'health check failed',
      })),
      late,
    ])
  } finally {
    clearTimeout(timer)
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    timer.unref?.()
  })
}
