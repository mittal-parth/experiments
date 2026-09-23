#!/usr/bin/env python3
"""
Original score + sound effects for "Opus 5.5 Discovers Cricket", synthesized
from scratch (sine tones + filtered noise) with pure-Python stdlib — no
external samples, no licensing concerns. Timestamps are hand-synced to the
beats in anim.js.
"""
import wave, struct, math, random

SR = 44100
DURATION = 23.0
N = int(SR * DURATION)
buf = [0.0] * N


def add(fn, start_t, dur, gain=1.0):
    start = int(start_t * SR)
    n = int(dur * SR)
    for i in range(n):
        idx = start + i
        if 0 <= idx < N:
            buf[idx] += fn(i, i / SR) * gain


# ---------------------------------------------------------------------------
# instrument / sfx generators
# ---------------------------------------------------------------------------
def note_fn(freq, decay=3.0, harmonic=0.2, attack=0.01):
    def fn(i, t):
        env = math.exp(-decay * t)
        if t < attack:
            env *= t / attack
        return (math.sin(2 * math.pi * freq * t) + harmonic * math.sin(4 * math.pi * freq * t)) * env
    return fn


def noise_fn(decay=8.0, seed=0, lp=0.9, attack=0.0):
    rng = random.Random(seed)
    prev = [0.0]
    def fn(i, t):
        raw = rng.uniform(-1, 1)
        prev[0] = prev[0] * (1 - lp) + raw * lp
        env = math.exp(-decay * t)
        if attack > 0 and t < attack:
            env *= t / attack
        return prev[0] * env
    return fn


def whoosh_fn(dur, seed=1, lp=0.25, power=1.4):
    rng = random.Random(seed)
    prev = [0.0]
    def fn(i, t):
        raw = rng.uniform(-1, 1)
        prev[0] = prev[0] * (1 - lp) + raw * lp
        p = min(max(t / dur, 0), 1)
        env = math.sin(math.pi * p) ** power
        return prev[0] * env
    return fn


def thump_fn(freq=130.0, decay=14.0):
    def fn(i, t):
        return math.sin(2 * math.pi * freq * t) * math.exp(-decay * t)
    return fn


def wood_knock_fn(freqs, decay=30.0, seed=0, noise_amt=0.32, click=0.006):
    """A short, bright, inharmonic knock — the actual timbre of wood/bail
    contact, as opposed to a generic noise burst."""
    rng = random.Random(seed)
    def fn(i, t):
        tone = sum(math.sin(2 * math.pi * f * t) for f in freqs) / len(freqs)
        val = tone * (1 - noise_amt)
        if t < click:
            val += rng.uniform(-1, 1) * noise_amt * (1 - t / click)
        return val * math.exp(-decay * t)
    return fn


def bat_crack_fn(seed=40):
    """The characteristic cricket-bat 'crack': a hard, very short noise
    transient (the impact) followed by a handful of bright, fast-decaying,
    inharmonic wood/leather partials — not a bassy movie 'thwack'."""
    rng = random.Random(seed)
    partials = [(950, 24, 0.55), (1500, 30, 0.35), (2300, 38, 0.22), (620, 16, 0.32)]
    def fn(i, t):
        val = 0.0
        for freq, decay, amp in partials:
            val += math.sin(2 * math.pi * freq * t) * math.exp(-decay * t) * amp
        if t < 0.007:
            val += rng.uniform(-1, 1) * (1 - t / 0.007)
        return val
    return fn


def chord(freqs, start_t, dur=0.9, decay=2.2, gain=0.35, strum=0.015):
    for k, f in enumerate(freqs):
        add(note_fn(f, decay=decay, harmonic=0.15), start_t + k * strum, dur, gain=gain)


# note names -> Hz (just intonation-ish equal temperament, C major pentatonic)
C3, D3, E3, G3, A3 = 130.81, 146.83, 164.81, 196.00, 220.00
C4, D4, E4, G4, A4 = 261.63, 293.66, 329.63, 392.00, 440.00
C5, D5, E5, G5 = 523.25, 587.33, 659.25, 783.99
C6 = 1046.50

# ---------------------------------------------------------------------------
# background score — a simple looping pentatonic phrase, glockenspiel-ish
# ---------------------------------------------------------------------------
BG_GAIN = 0.16
melody = [C4, E4, G4, A4, G4, E4, D4, C4]
loop_len = 2.8
step = loop_len / len(melody)
t = 0.0
while t < DURATION - 0.9:
    for j, f in enumerate(melody):
        add(note_fn(f, decay=3.2, harmonic=0.18, attack=0.01), t + j * step, step * 1.8, gain=BG_GAIN)
    # a soft low root pulse grounding each loop
    add(note_fn(C3, decay=2.0, harmonic=0.05, attack=0.01), t, loop_len * 0.9, gain=BG_GAIN * 0.55)
    t += loop_len

# ---------------------------------------------------------------------------
# sound effects, synced to anim.js beat timings (BEAT.discover=2.4,
# BEAT.ground=4.6, BEAT.pickup=7.0, BEAT.miss=10.0, BEAT.six=14.5) — all
# retimed to match the tightened, snappier pacing in anim.js.
# ---------------------------------------------------------------------------
# 1. ball bonks Opus's leg — almost immediately (t≈0.78)
add(note_fn(G4, decay=12, harmonic=0.4, attack=0.002), 0.78, 0.25, gain=0.5)
add(noise_fn(decay=22, seed=10, lp=0.6), 0.78, 0.08, gain=0.25)

# 2. Opus grabs the bat (t≈4.6, right as the reach begins)
add(whoosh_fn(0.16, seed=11, lp=0.5, power=1.0), 4.6, 0.16, gain=0.2)

# 3. the bat flips right-side up — a little confirming "flip" tick (t≈5.5)
add(note_fn(A4, decay=10, harmonic=0.3, attack=0.002), 5.5, 0.3, gain=0.35)

# 4. proud hop — a cheerful mini ta-da (t≈5.75)
add(note_fn(C4, decay=9, harmonic=0.25), 5.75, 0.25, gain=0.3)
add(note_fn(E4, decay=9, harmonic=0.25), 5.86, 0.25, gain=0.3)
add(note_fn(G4, decay=6, harmonic=0.25), 5.97, 0.45, gain=0.32)

# 5. bowled — ball whooshes in (t≈7.2-8.0)
add(whoosh_fn(0.8, seed=20, lp=0.3, power=1.3), 7.2, 0.8, gain=0.3)

# 6. swing and miss — a quick bat swish (t≈7.85)
add(whoosh_fn(0.28, seed=21, lp=0.55, power=1.0), 7.85, 0.28, gain=0.28)

# 7. bails fly — real wood-on-wood knocks (bail off the stump, then off the
#    ground) rather than a generic noise burst, plus a descending "oh no" (t≈8.1)
add(wood_knock_fn([540, 810, 1180], decay=30, seed=22), 8.1, 0.22, gain=0.42)
add(wood_knock_fn([470, 740, 1040], decay=26, seed=23), 8.19, 0.24, gain=0.34)
add(wood_knock_fn([610, 890, 1300], decay=34, seed=24), 8.3, 0.18, gain=0.26)
add(note_fn(A3, decay=9, harmonic=0.2), 8.42, 0.3, gain=0.3)
add(note_fn(G3 * 0.943, decay=7, harmonic=0.2), 8.62, 0.4, gain=0.3)  # slight downward bend, comic effect

# 8. second delivery whooshes in for the six (t≈10.2-10.9 — bowled almost
#    immediately, no dead wait before the delivery)
add(whoosh_fn(0.7, seed=30, lp=0.3, power=1.3), 10.2, 0.7, gain=0.3)

# 9. contact! the actual crack of bat on ball (t≈10.95) — a hard, bright,
#    very short transient, not a bassy punch-thwack
add(bat_crack_fn(seed=31), 10.95, 0.3, gain=0.6)
add(thump_fn(95, decay=20), 10.95, 0.15, gain=0.16)  # a whisper of body, kept short so it stays "crack" not "thud"

# 10. the ball soars over the boundary — long rising whoosh (t≈10.95-14.4)
add(whoosh_fn(3.5, seed=32, lp=0.18, power=0.8), 10.95, 3.5, gain=0.32)

# 11. it lands — triumphant chord stab, timed to when it visually looks to
#     land (t≈13.2), not the tail of the easing curve
chord([C4, E4, G4, C5], 13.2, dur=1.3, decay=2.0, gain=0.32)

# 12. "SIX!" speech bubble pop (t≈14.7)
add(note_fn(C6, decay=9, harmonic=0.3, attack=0.002), 14.7, 0.3, gain=0.32)

# 13. closing sign-off chime, timed with the signature drawing on (t≈19.6, 20.1)
add(note_fn(G4, decay=4.5, harmonic=0.2, attack=0.01), 19.6, 0.9, gain=0.28)
add(note_fn(C5, decay=3.5, harmonic=0.2, attack=0.01), 20.1, 1.1, gain=0.3)

# ---------------------------------------------------------------------------
# master fade-out (matches the visual fade in anim.js: DURATION-0.5 .. -0.05)
# ---------------------------------------------------------------------------
fade_start, fade_end = 21.8, 22.95
for i in range(N):
    t = i / SR
    if t > fade_start:
        buf[i] *= max(0.0, 1 - (t - fade_start) / (fade_end - fade_start))

# ---------------------------------------------------------------------------
# normalize + write 16-bit PCM stereo WAV
# ---------------------------------------------------------------------------
peak = max(1e-6, max(abs(x) for x in buf))
scale = (0.92 / peak) if peak > 0.92 else 1.0

out = wave.open('audio.wav', 'w')
out.setnchannels(2)
out.setsampwidth(2)
out.setframerate(SR)
frames = bytearray()
for x in buf:
    v = int(max(-1.0, min(1.0, x * scale)) * 32767)
    packed = struct.pack('<hh', v, v)
    frames += packed
out.writeframes(bytes(frames))
out.close()
print('wrote audio.wav:', N, 'samples,', DURATION, 's, peak', peak, 'scale', scale)
