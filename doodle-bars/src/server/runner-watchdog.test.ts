import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_LIMITS, RunnerHealth, startRunnerWatchdog, type HealthReading } from './runner-watchdog'

const OK: HealthReading = { ok: true, detail: '200 ok' }
const STALE: HealthReading = { ok: false, detail: '503 engine_ping_stale' }
const STARTING: HealthReading = { ok: false, detail: '503 starting' }

describe('RunnerHealth', () => {
  it('does not recycle before the first healthy reading', () => {
    const judge = new RunnerHealth(0)
    for (let at = 2_000; at < DEFAULT_LIMITS.bootLimitMs; at += 2_000) {
      expect(judge.reading(STARTING, at)).toBeNull()
    }
  })

  it('recycles when the runner never becomes healthy after boot', () => {
    const judge = new RunnerHealth(0)
    expect(judge.reading(STARTING, DEFAULT_LIMITS.bootLimitMs)).toContain('never became healthy')
  })

  it('recycles after two unhealthy readings in a row', () => {
    const judge = new RunnerHealth(0)
    expect(judge.reading(OK, 2_000)).toBeNull()
    expect(judge.reading(STALE, 4_000)).toBeNull()
    expect(judge.reading(STALE, 6_000)).toContain('engine_ping_stale')
  })

  it('does not recycle on one unhealthy reading followed by a healthy one', () => {
    const judge = new RunnerHealth(0)
    expect(judge.reading(OK, 2_000)).toBeNull()
    expect(judge.reading(STALE, 4_000)).toBeNull()
    expect(judge.reading(OK, 6_000)).toBeNull()
    expect(judge.reading(STALE, 8_000)).toBeNull()
  })

  it('recycles when the event loop falls too far behind', () => {
    const judge = new RunnerHealth(0)
    expect(judge.lag(DEFAULT_LIMITS.loopLagLimitMs - 1)).toBeNull()
    expect(judge.lag(DEFAULT_LIMITS.loopLagLimitMs)).toContain('event loop stalled')
  })
})

describe('startRunnerWatchdog', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('recycles once after the health link goes stale', async () => {
    vi.useFakeTimers()
    const readings = [OK, OK, STALE, STALE, STALE]
    const health = vi.fn(async () => readings.shift() ?? STALE)
    const recycle = vi.fn()
    startRunnerWatchdog({ health, recycle })
    await vi.advanceTimersByTimeAsync(DEFAULT_LIMITS.pollMs * 6)
    expect(recycle).toHaveBeenCalledTimes(1)
    expect(recycle.mock.calls[0]?.[0]).toContain('engine_ping_stale')
    expect(health).toHaveBeenCalledTimes(4)
  })

  it('counts a health read that never answers as unhealthy', async () => {
    vi.useFakeTimers()
    let calls = 0
    const health = vi.fn(() => {
      calls += 1
      return calls === 1 ? Promise.resolve(OK) : new Promise<HealthReading>(() => {})
    })
    const recycle = vi.fn()
    startRunnerWatchdog({ health, recycle })
    await vi.advanceTimersByTimeAsync(DEFAULT_LIMITS.pollMs * 6)
    expect(recycle).toHaveBeenCalledTimes(1)
    expect(recycle.mock.calls[0]?.[0]).toContain('did not answer')
  })

  it('stays quiet while healthy and after stop', async () => {
    vi.useFakeTimers()
    const recycle = vi.fn()
    const watchdog = startRunnerWatchdog({ health: async () => OK, recycle })
    await vi.advanceTimersByTimeAsync(DEFAULT_LIMITS.pollMs * 10)
    watchdog.stop()
    await vi.advanceTimersByTimeAsync(DEFAULT_LIMITS.pollMs * 10)
    expect(recycle).not.toHaveBeenCalled()
  })
})
