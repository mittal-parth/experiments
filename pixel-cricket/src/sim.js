import {
  CONTACT_Y,
  FIELD_SLOTS,
  PITCH_LEN,
  STUMP_H,
  STUMP_HALF,
  STUMP_Y,
  lengthLabel,
  lineLabel,
} from "./data.js";

const G = 9.81;
/** A compact club ground: perfect lofts clear the rope, mishits land on the fielders. */
export const GROUND = { cx: 0, cy: 10, rx: 56, ry: 60 };
const BOUND_X = GROUND.rx;
const BOUND_Y = GROUND.ry;
const GROUND_CX = GROUND.cx;
const GROUND_CY = GROUND.cy;

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function lengthBand(length) {
  if (length < 0.2) return "fulltoss";
  if (length < 1.7) return "yorker";
  if (length < 3.6) return "full";
  if (length < 6.6) return "good";
  if (length < 9.6) return "short";
  return "bouncer";
}

function vzAfterBounce(length, speed) {
  const band = lengthBand(length);
  const pace = clamp((speed - 27) / 16, 0, 1);
  switch (band) {
    case "fulltoss":
      return 0;
    case "yorker":
      return 0.9 + pace * 0.25;
    case "full":
      return 3.4 + pace * 0.25;
    case "good":
      return 4.35 + pace * 0.25;
    case "short":
      return 6.15 + pace * 0.35;
    case "bouncer":
      return 7.7 + pace * 0.65;
    default: {
      const never = band;
      throw new Error(`Unknown length band ${never}`);
    }
  }
}

function fullTossHeight(length) {
  if (length > 0.75) return 0.1;
  if (length > 0.3) return 0.28;
  if (length > -0.1) return 0.52;
  if (length > -0.4) return 0.82;
  return 1.32;
}

function spinKick(kind) {
  switch (kind) {
    case "offspin":
      return -2.4;
    case "legspin":
      return 2.6;
    case "pace":
    case "swing":
      return 0;
    default: {
      const never = kind;
      throw new Error(`Unknown bowl type ${never}`);
    }
  }
}

/**
 * Ball from release to the popping crease.
 * +x is the striker's off side. +y runs from bowler (0) to batter (20.12).
 */
export function simulateToCrease({ line, length, speed, kind }) {
  const y0 = -0.15;
  const z0 = 2.02;
  const bounceY = PITCH_LEN - length;
  const pitchesBeforeCrease = length >= 1.15 && bounceY < CONTACT_Y - 0.02;
  const samples = [];
  const dt = 0.012;

  let x = 0;
  let y = y0;
  let z = z0;
  let t = 0;
  let bounced = false;
  let pitchedX = line;
  let pitchedY = pitchesBeforeCrease ? bounceY : CONTACT_Y + 1.5;

  const destY = pitchesBeforeCrease ? bounceY : CONTACT_Y;
  const tArrive = Math.max(0.22, (destY - y0) / speed);
  let vz = pitchesBeforeCrease
    ? 0.5 * G * tArrive - z0 / tArrive
    : (fullTossHeight(length) - z0 + 0.5 * G * tArrive * tArrive) / tArrive;
  let vx = 0;
  let vy = speed;
  let axSwing = (2 * line) / (tArrive * tArrive);

  while (t < 3.2 && y < STUMP_Y + 1.5) {
    samples.push({ t, x, y, z, vx, vy, vz });
    if (y >= CONTACT_Y) break;

    vx += axSwing * dt;
    vz -= G * dt;
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    t += dt;

    if (!bounced && z <= 0) {
      bounced = true;
      z = 0;
      pitchedX = x;
      pitchedY = y;
      axSwing = 0;
      vx += spinKick(kind);
      vz = pitchesBeforeCrease ? vzAfterBounce(length, speed) : Math.abs(vz) * 0.2;
      vy *= 0.96;
    }
  }

  const at = samples[samples.length - 1];
  return {
    samples,
    atCrease: at,
    bounced,
    pitchedX,
    pitchedY,
    line,
    length,
    speed,
    kind,
  };
}

export function insideBoundary(x, y) {
  const nx = (x - GROUND_CX) / BOUND_X;
  const ny = (y - GROUND_CY) / BOUND_Y;
  return nx * nx + ny * ny <= 1;
}

function shotName(angle, loft, band) {
  const a = angle;
  if (Math.abs(a) < 18 && !loft) {
    if (band === "bouncer" || band === "short") return "SWAT";
    return a === 0 ? "DEFEND" : "DRIVE";
  }
  if (Math.abs(a) < 18 && loft) return "LOFT STRAIGHT";
  if (a >= 18 && a < 70 && !loft) return "COVER DRIVE";
  if (a >= 18 && a < 70 && loft) return "LOFT COVER";
  if (a >= 70 && a < 125 && !loft) return "CUT";
  if (a >= 70 && a < 125 && loft) return "SLASH";
  if (a >= 125) return "LATE CUT";
  if (a <= -18 && a > -70 && !loft) return "FLICK";
  if (a <= -18 && a > -70 && loft) return "LOFT MIDWICKET";
  if (a <= -70 && a > -120 && !loft) return "PULL";
  if (a <= -70 && a > -120 && loft) return band === "bouncer" ? "HOOK" : "PULL";
  if (a <= -120) return "GLANCE";
  return loft ? "LOFT" : "SHOT";
}

function idealAngle(line, band) {
  if (band === "bouncer" || (band === "short" && line < 0.35)) return -95;
  if (band === "yorker" || band === "fulltoss") return 0;
  if (line > 0.45) return 78;
  if (line > 0.18) return 42;
  if (line < -0.28) return -48;
  return 0;
}

function timingLabel(timing, played) {
  if (!played) return "LEAVE";
  const a = Math.abs(timing);
  if (a < 0.2) return "PERFECT";
  if (a < 0.46) return "GOOD";
  if (timing < 0) return "EARLY";
  return "LATE";
}

function judgeContact(ball, shot, batsman) {
  if (!shot.played) {
    return { type: "leave", score: 0, power: 0 };
  }
  const band = lengthBand(ball.length);
  const timing = clamp(shot.timing, -1, 1);
  const absT = Math.abs(timing);
  const skill = batsman.batSkill / 100;
  const forgive = 0.9 + skill * 0.45;
  const timed = absT / forgive;

  const ideal = idealAngle(ball.atCrease.x, band);
  let diff = Math.abs(shot.angle - ideal);
  if (diff > 180) diff = 360 - diff;
  // Straight shots still meet a ball on the stumps; cross-bat shots meet width.
  const angleScore = clamp(1 - diff / 115, 0, 1);

  let timeScore = 0;
  if (timed < 0.22) timeScore = 1;
  else if (timed < 0.48) timeScore = 0.8;
  else if (timed < 0.86) timeScore = 0.42;
  else timeScore = 0;

  let heightScore = 1;
  const h = ball.atCrease.z;
  if ((band === "yorker" || band === "fulltoss") && shot.loft && h < 0.7) heightScore = 0.22;
  if ((band === "bouncer" || h > 1.45) && shot.angle > -15 && !shot.loft) heightScore = 0.28;
  if ((band === "bouncer" || h > 1.4) && shot.angle < -40) heightScore = 1;
  if (band === "good" && Math.abs(shot.angle) < 50) heightScore = 1;
  if (h < 0.35 && shot.angle < -70) heightScore = 0.35;

  const score = timeScore * (0.4 + 0.6 * angleScore) * heightScore * (0.7 + 0.3 * skill);
  if (timeScore === 0 || score < 0.16) return { type: "miss", score, power: 0, timing };
  if (score < 0.38 || timed > 0.52) {
    return { type: "edge", score, power: 0.35, timing, outside: timing >= 0 };
  }
  return { type: "middle", score, power: clamp(score, 0.45, 1), timing };
}

export function fieldPositions() {
  const slots = FIELD_SLOTS.map((slot) => {
    const r = (slot.angle * Math.PI) / 180;
    return {
      ...slot,
      x: Math.sin(r) * slot.dist,
      y: CONTACT_Y - Math.cos(r) * slot.dist,
    };
  });
  slots.push({
    id: "keeper",
    label: "Keeper",
    angle: 180,
    dist: 2.2,
    speed: 6.4,
    hands: 2.15,
    x: 0,
    y: STUMP_Y + 1.35,
  });
  slots.push({
    id: "bowler",
    label: "Bowler",
    angle: 0,
    dist: 16,
    speed: 7.4,
    hands: 1.7,
    x: 0.3,
    y: 3.2,
  });
  return slots;
}

function launchFromShot(contact, ball, shot, judge) {
  const band = lengthBand(ball.length);
  const label = timingLabel(shot.timing, true);
  let angle = shot.angle;
  let loft = shot.loft;
  let speed = 0;
  let elev = 8;

  if (judge.type === "edge") {
    angle = judge.outside ? 150 + (shot.timing || 0) * 10 : -145;
    loft = false;
    elev = judge.outside ? 16 : 8;
    speed = 16 + judge.score * 10;
  } else {
    const perfect = label === "PERFECT";
    const good = label === "GOOD";
    const power = judge.power * (0.82 + (contact.batSkill || 70) / 400);
    if (!loft && Math.abs(angle) < 16 && (band === "yorker" || band === "good" || band === "full")) {
      // Defend unless they really swung through a drive.
      if (shot.intent === "defend") {
        speed = 11 + power * 4;
        elev = 3;
      } else {
        speed = (perfect ? 31 : good ? 26 : 18) * (0.75 + power * 0.35);
        elev = perfect ? 5 : 7;
      }
    } else if (loft) {
      speed = (perfect ? 31.5 : good ? 26.5 : 20) * (0.82 + power * 0.22);
      elev = perfect ? 34 : good ? 40 : 55;
      if (!perfect && !good) speed *= 0.82;
    } else {
      speed = (perfect ? 30 : good ? 25 : 18) * (0.78 + power * 0.28);
      elev = perfect ? 6 : 9;
    }
    // Timing shoves the ball off the intended line.
    angle += (shot.timing || 0) * (label === "PERFECT" ? 4 : 16);
  }

  const elevR = (elev * Math.PI) / 180;
  const angR = (angle * Math.PI) / 180;
  const horiz = speed * Math.cos(elevR);
  return {
    x: ball.atCrease.x * 0.3,
    y: CONTACT_Y,
    z: clamp(ball.atCrease.z, 0.15, 1.6),
    vx: Math.sin(angR) * horiz,
    vy: -Math.cos(angR) * horiz,
    vz: speed * Math.sin(elevR),
    angle,
    name: judge.type === "edge" ? (judge.outside ? "OUTSIDE EDGE" : "INSIDE EDGE") : shotName(shot.angle, loft && shot.intent !== "defend", band),
  };
}

function simulateAfterBat(launch) {
  const samples = [];
  const dt = 0.016;
  let { x, y, z, vx, vy, vz } = launch;
  let t = 0;
  let bounced = false;
  let boundary = null;
  while (t < 6.5) {
    const sample = { t, x, y, z, vx, vy, vz, bounced };
    if (!insideBoundary(x, y)) {
      boundary = !bounced && z > 0.35 ? "6" : "4";
      sample.boundary = boundary;
      samples.push(sample);
      break;
    }
    samples.push(sample);
    const horiz = Math.hypot(vx, vy);
    if (bounced && horiz < 0.35 && z <= 0.02) break;

    vz -= G * dt;
    const drag = Math.max(0, 1 - 0.07 * dt);
    vx *= drag;
    vy *= drag;
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    t += dt;

    if (z <= 0) {
      z = 0;
      if (vz < 0) vz = -vz * 0.42;
      bounced = true;
      const h = Math.hypot(vx, vy);
      const drop = 8.2 * dt;
      if (h > 0) {
        const nh = Math.max(0, h - drop);
        vx = (vx / h) * nh;
        vy = (vy / h) * nh;
      }
    }
  }
  return { samples, boundary };
}

function intercept(fielder, samples, mode) {
  for (const s of samples) {
    const handsHigh = fielder.id === "keeper" || fielder.id === "slip" ? 2.15 : 2.45;
    const catchable = !s.bounced && s.z >= 0.25 && s.z <= handsHigh;
    const ground = s.bounced && s.z < 0.55;
    if (mode === "catch" && !catchable) continue;
    if (mode === "ground" && !ground) continue;
    const d = Math.hypot(s.x - fielder.x, s.y - fielder.y);
    const need = 0.22 + Math.max(0, d - fielder.hands) / fielder.speed;
    if (need <= s.t + 0.04) {
      return { t: s.t, x: s.x, y: s.y, z: s.z, fielder, d };
    }
  }
  return null;
}

function runsFromField(fieldTime) {
  if (fieldTime > 7.3) return 3;
  if (fieldTime > 4.85) return 2;
  if (fieldTime > 2.35) return 1;
  return 0;
}

function projectHitsStumps(x, y, z, vx, vy, vz) {
  if (vy <= 0.1) return false;
  let cx = x;
  let cy = y;
  let cz = z;
  let cvx = vx;
  let cvy = vy;
  let cvz = vz;
  const dt = 0.008;
  for (let i = 0; i < 80; i++) {
    cvz -= G * dt;
    cx += cvx * dt;
    cy += cvy * dt;
    cz += cvz * dt;
    if (cz < 0) {
      cz = 0;
      cvz = Math.abs(cvz) * 0.25;
    }
    if (cy >= STUMP_Y) {
      return Math.abs(cx) < STUMP_HALF && cz > 0.02 && cz < STUMP_H + 0.04;
    }
  }
  return false;
}

function isWide(ball, played) {
  const x = ball.atCrease.x;
  const z = ball.atCrease.z;
  if (ball.bounced && z > 1.92) return { wide: true, reason: "over the head" };
  if (!played && x > 0.95) return { wide: true, reason: "outside off" };
  if (!played && x < -0.58) return { wide: true, reason: "down the leg side" };
  if (played && x > 1.45) return { wide: true, reason: "miles outside off" };
  return { wide: false, reason: "" };
}

function isBeamer(ball) {
  return !ball.bounced && ball.atCrease.z > 1.02;
}

function padHit(ball, played) {
  const x = ball.atCrease.x;
  const z = ball.atCrease.z;
  if (z < 0.05 || z > 0.78) return false;
  const reach = played ? 0.26 : 0.3;
  return Math.abs(x) < reach;
}

/**
 * Resolve one delivery.
 * shot: { played, angle (deg, + off), loft, timing (-1 early .. 1 late), intent }
 * releaseQuality: 0..1, noBall if the bowler overstepped.
 */
/** Turn an aim point plus release quality into the ball that actually comes out. */
export function rollRelease(opts) {
  const rng = opts.rng || Math.random;
  const q = clamp(opts.releaseQuality ?? 0.75, 0, 1);
  const spread = 1 - q;
  const line = clamp(opts.line + (rng() - 0.5) * spread * 0.95, -1.8, 1.8);
  const length = clamp(opts.length + (rng() - 0.5) * spread * 2.8, -0.8, 13.5);
  const speed = opts.bowler.bowl.speed * (0.88 + 0.12 * q);
  return { line, length, speed, q, noBall: Boolean(opts.noBall) };
}

export function resolveDelivery(opts) {
  const rolled = opts.locked
    ? {
        line: opts.line,
        length: opts.length,
        speed: opts.speed,
        q: clamp(opts.releaseQuality ?? 0.75, 0, 1),
        noBall: Boolean(opts.noBall),
      }
    : rollRelease(opts);
  const { line, length, speed, q } = rolled;
  const bowler = opts.bowler;
  const kind = bowler.bowl.type;

  const ball = simulateToCrease({ line, length, speed, kind });
  const shot = opts.shot || { played: false, angle: 0, loft: false, timing: 0, intent: "leave" };
  const batsman = opts.batsman;
  const judge = judgeContact(ball, shot, batsman);
  const tLabel = timingLabel(shot.timing, shot.played);
  const band = lengthBand(ball.length);
  const lName = lengthLabel(ball.length);
  const nName = lineLabel(ball.atCrease.x);

  const events = [{ t: 0, type: "release" }];
  const bounceSample = ball.samples.find((s, i) => i > 2 && s.z <= 0.02 && ball.samples[i - 1].z > 0.05);
  if (ball.bounced && bounceSample) events.push({ t: bounceSample.t, type: "bounce", x: ball.pitchedX, y: ball.pitchedY });

  const base = {
    ball,
    lengthName: lName,
    lineName: nName,
    band,
    timingLabel: tLabel,
    shotName: shot.played ? shotName(shot.angle, shot.loft, band) : "LEAVE",
    q,
  };

  // No-ball: overstep, or a beamer above the waist.
  const beamer = isBeamer(ball);
  const noBall = Boolean(opts.noBall) || beamer;
  const noBallReason = opts.noBall ? "overstep" : beamer ? "beamer" : null;

  const wide = !noBall ? isWide(ball, shot.played && judge.type !== "miss" && judge.type !== "leave") : { wide: false };

  // A genuine shot that meets the ball cancels the wide.
  const playedTheBall = judge.type === "middle" || judge.type === "edge";

  if ((wide.wide && !playedTheBall) || (noBall && !playedTheBall && judge.type !== "middle")) {
    // Wides and beamers/oversteps with no contact. A no-ball can still be hit — handled below if played.
    if (!playedTheBall && (wide.wide || (noBall && judge.type !== "middle" && judge.type !== "edge"))) {
      const kindExtra = noBall ? "noball" : "wide";
      const contactT = ball.atCrease.t;
      events.push({ t: contactT, type: kindExtra });
      const samples = ball.samples.map((s) => ({ ...s }));
      // Let the ball run through to the keeper.
      let x = ball.atCrease.x;
      let y = ball.atCrease.y;
      let z = ball.atCrease.z;
      let vx = ball.atCrease.vx;
      let vy = Math.max(8, ball.atCrease.vy);
      let vz = ball.atCrease.vz;
      let t = contactT;
      const dt = 0.016;
      for (let i = 0; i < 40; i++) {
        t += dt;
        vz -= G * dt;
        x += vx * dt;
        y += vy * dt;
        z += vz * dt;
        if (z < 0) {
          z = 0;
          vz *= -0.2;
        }
        samples.push({ t, x, y, z, vx, vy, vz, bounced: ball.bounced });
        if (y > STUMP_Y + 1.2) break;
      }
      const commentary = noBall
        ? noBallReason === "beamer"
          ? "Beamer! That's a no-ball, and a free hit is coming."
          : "Overstepped. No-ball — free hit next ball."
        : wide.reason === "over the head"
          ? "Too high. Wide."
          : wide.reason === "down the leg side"
            ? "Down the leg side. Wide."
            : "Too wide outside off.";
      return {
        ...base,
        samples,
        events,
        runsOffBat: 0,
        extras: 1,
        extraType: kindExtra,
        legal: false,
        wicket: null,
        boundary: null,
        runsTaken: 0,
        commentary,
        noBallReason,
        freeHitNext: noBall,
        fielder: null,
      };
    }
  }

  // A no-ball that is hit still has to be called. The boundary callout can replace it later.
  if (noBall && playedTheBall) events.push({ t: 0.08, type: "noball" });

  // Miss or leave: stumps, pad, keeper.
  if (!playedTheBall) {
    const contactT = ball.atCrease.t;
    const hitsPad = padHit(ball, shot.played);
    const hits = projectHitsStumps(
      ball.atCrease.x,
      ball.atCrease.y,
      ball.atCrease.z,
      ball.atCrease.vx,
      ball.atCrease.vy,
      ball.atCrease.vz
    );

    if (hitsPad && ball.atCrease.z > 0.3) {
      const pitchedOutsideLeg = ball.pitchedX < -STUMP_HALF;
      const impactOutsideLeg = ball.atCrease.x < -STUMP_HALF;
      const impactOutsideOff = ball.atCrease.x > STUMP_HALF;
      const offered = shot.played;
      let lbw = hits && !pitchedOutsideLeg && !impactOutsideLeg;
      if (lbw && impactOutsideOff && offered) lbw = false;
      events.push({ t: contactT, type: lbw ? "lbw" : "pad", x: ball.atCrease.x, y: CONTACT_Y });
      if (lbw && !noBall && !opts.freeHit) {
        return finishWicket({
          ...base,
          samples: ball.samples,
          events,
          wicket: { type: "lbw", fielder: null, bowlerCredit: true },
          commentary: "Struck in front of middle. That's plumb.",
          noBall,
          freeHitNext: noBall,
        });
      }
      const saved = lbw && (noBall || opts.freeHit);
      return {
        ...base,
        samples: ball.samples,
        events,
        runsOffBat: 0,
        extras: noBall ? 1 : 0,
        extraType: noBall ? "noball" : null,
        legal: !noBall,
        wicket: null,
        boundary: null,
        runsTaken: 0,
        commentary: saved
          ? "Would have been LBW — but it's a free hit, so he survives."
          : shot.played
            ? "On the pad, and they survive."
            : "Left on the pad.",
        noBallReason,
        freeHitNext: noBall,
        fielder: null,
      };
    }

    if (hits) {
      events.push({ t: contactT + 0.08, type: "bowled" });
      const samples = continueToStumps(ball);
      if (!noBall && !opts.freeHit) {
        return finishWicket({
          ...base,
          samples,
          events,
          wicket: { type: "bowled", fielder: null, bowlerCredit: true },
          commentary: band === "yorker" ? "Yorker. Timber!" : "Bowled him. The stumps are everywhere.",
          noBall,
          freeHitNext: noBall,
        });
      }
      return {
        ...base,
        samples,
        events,
        runsOffBat: 0,
        extras: noBall ? 1 : 0,
        extraType: noBall ? "noball" : null,
        legal: !noBall,
        wicket: null,
        boundary: null,
        runsTaken: 0,
        commentary: "Off the stumps — but the bowler overstepped. Not out.",
        noBallReason,
        freeHitNext: noBall,
        fielder: null,
      };
    }

    events.push({ t: contactT, type: shot.played ? "miss" : "leave" });
    const samples = continueToStumps(ball);
    return {
      ...base,
      samples,
      events,
      runsOffBat: 0,
      extras: noBall ? 1 : 0,
      extraType: noBall ? "noball" : null,
      legal: !noBall,
      wicket: null,
      boundary: null,
      runsTaken: 0,
      commentary: shot.played ? "Beaten. Play and a miss." : "Left alone. Sensible.",
      noBallReason,
      freeHitNext: noBall,
      fielder: null,
    };
  }

  // Contact.
  const launch = launchFromShot(ball.atCrease, ball, shot, judge);
  launch.batSkill = batsman.batSkill;
  const after = simulateAfterBat(launch);
  const contactT = ball.atCrease.t;
  events.push({ t: contactT, type: "contact", shot: launch.name });

  const field = fieldPositions();
  const flight = after.samples;
  let catchAt = null;
  for (const f of field) {
    const hit = intercept(f, flight, "catch");
    if (!hit) continue;
    if (!catchAt || hit.t < catchAt.t) catchAt = hit;
  }

  const boundaryTime = after.boundary ? flight[flight.length - 1].t : Infinity;
  if (catchAt && catchAt.t <= boundaryTime) {
    events.push({ t: contactT + catchAt.t, type: "catch", fielder: catchAt.fielder.label, x: catchAt.x, y: catchAt.y });
    const samples = stitch(ball.samples, flight, contactT);
    if (!noBall && !opts.freeHit) {
      const keeper = catchAt.fielder.id === "keeper";
      return finishWicket({
        ...base,
        samples,
        events,
        shotName: launch.name,
        wicket: { type: "caught", fielder: catchAt.fielder.label, bowlerCredit: true },
        commentary: keeper ? "Edged, and the keeper makes no mistake." : `Caught ${catchAt.fielder.label}!`,
        noBall,
        freeHitNext: noBall,
        fielder: catchAt.fielder.label,
      });
    }
    return {
      ...base,
      samples,
      events,
      shotName: launch.name,
      runsOffBat: 0,
      extras: noBall ? 1 : 0,
      extraType: noBall ? "noball" : null,
      legal: !noBall,
      wicket: null,
      boundary: null,
      runsTaken: 0,
      commentary: "Taken — but it's a no-ball, so the batter stays.",
      noBallReason,
      freeHitNext: noBall,
      fielder: catchAt.fielder.label,
    };
  }

  if (after.boundary === "6") {
    events.push({ t: contactT + boundaryTime, type: "six" });
    const samples = stitch(ball.samples, flight, contactT);
    const runs = 6;
    return {
      ...base,
      samples,
      events,
      shotName: launch.name,
      runsOffBat: runs,
      extras: noBall ? 1 : 0,
      extraType: noBall ? "noball" : null,
      legal: !noBall,
      wicket: null,
      boundary: "6",
      runsTaken: runs,
      commentary: noBall ? "No-ball six. Free hit next ball." : "That's enormous. Into the crowd!",
      noBallReason,
      freeHitNext: noBall,
      fielder: null,
    };
  }

  if (after.boundary === "4") {
    events.push({ t: contactT + boundaryTime, type: "four" });
    const samples = stitch(ball.samples, flight, contactT);
    return {
      ...base,
      samples,
      events,
      shotName: launch.name,
      runsOffBat: 4,
      extras: noBall ? 1 : 0,
      extraType: noBall ? "noball" : null,
      legal: !noBall,
      wicket: null,
      boundary: "4",
      runsTaken: 4,
      commentary: noBall ? "No-ball four. Free hit next ball." : "Along the carpet and away to the rope.",
      noBallReason,
      freeHitNext: noBall,
      fielder: null,
    };
  }

  // Fielded.
  let stop = null;
  for (const f of field) {
    const hit = intercept(f, flight, "ground");
    if (!hit) continue;
    if (!stop || hit.t < stop.t) stop = hit;
  }
  const endT = stop ? stop.t : flight[flight.length - 1].t;
  const end = stop || flight[flight.length - 1];
  const throwToStriker = Math.hypot(end.x, end.y - STUMP_Y);
  const throwToBowler = Math.hypot(end.x, end.y);
  const throwDist = Math.min(throwToStriker, throwToBowler);
  const fieldTime = (stop ? stop.t : endT + 0.4) + 0.28 + throwDist / 30;
  const runs = runsFromField(fieldTime);
  events.push({
    t: contactT + endT,
    type: "field",
    fielder: stop ? stop.fielder.label : "nobody",
    runs,
  });
  const samples = stitch(ball.samples, flight.slice(0, Math.max(1, flight.findIndex((s) => s.t >= endT) + 1 || flight.length)), contactT);
  let commentary = "Pushed into the covers. No run.";
  if (runs === 1) commentary = "They scamper through for a single.";
  if (runs === 2) commentary = "Good running. Two.";
  if (runs === 3) commentary = "They come back for three. Brilliant hustle.";
  if (judge.type === "edge" && runs === 0) commentary = "Thick edge, but it doesn't go to hand.";
  if (noBall) commentary = runs > 0 ? `No-ball. ${commentary}` : "No-ball. Free hit next ball.";
  return {
    ...base,
    samples,
    events,
    shotName: launch.name,
    runsOffBat: runs,
    extras: noBall ? 1 : 0,
    extraType: noBall ? "noball" : null,
    legal: !noBall,
    wicket: null,
    boundary: null,
    runsTaken: runs,
    commentary,
    noBallReason,
    freeHitNext: noBall,
    fielder: stop ? stop.fielder.label : null,
  };
}

function finishWicket(partial) {
  return {
    runsOffBat: 0,
    extras: partial.noBall ? 1 : 0,
    extraType: partial.noBall ? "noball" : null,
    legal: !partial.noBall,
    boundary: null,
    runsTaken: 0,
    noBallReason: null,
    freeHitNext: false,
    fielder: partial.wicket.fielder,
    ...partial,
  };
}

function continueToStumps(ball) {
  const samples = ball.samples.map((s) => ({ ...s }));
  let x = ball.atCrease.x;
  let y = ball.atCrease.y;
  let z = ball.atCrease.z;
  let vx = ball.atCrease.vx;
  let vy = Math.max(6, ball.atCrease.vy);
  let vz = ball.atCrease.vz;
  let t = ball.atCrease.t;
  const dt = 0.012;
  for (let i = 0; i < 50; i++) {
    t += dt;
    vz -= G * dt;
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    if (z < 0) {
      z = 0;
      vz = Math.abs(vz) * 0.2;
    }
    samples.push({ t, x, y, z, vx, vy, vz, bounced: true });
    if (y > STUMP_Y + 1.4) break;
  }
  return samples;
}

function stitch(before, after, contactT) {
  const head = before.filter((s) => s.t <= contactT + 0.001);
  const tail = after.map((s) => ({ ...s, t: s.t + contactT }));
  return head.concat(tail);
}

/** CPU picks a plan. */
export function aiBall(bowler, rng) {
  const roll = rng();
  const skill = bowler.bowl.skill / 100;
  let length = 5.4;
  let line = 0.22;
  if (roll < 0.18) {
    length = 0.7;
    line = 0.02;
  } else if (roll < 0.28) {
    length = 11.2;
    line = 0.05;
  } else if (roll < 0.48) {
    length = 4.8 + rng() * 1.4;
    line = 0.15 + rng() * 0.35;
  } else if (roll < 0.7) {
    length = 2.4;
    line = 0.28;
  } else if (roll < 0.85) {
    length = 7.4;
    line = -0.05;
  } else {
    length = 5.8;
    line = 0.55;
  }
  if (bowler.bowl.type === "offspin" || bowler.bowl.type === "legspin") {
    length = 4.2 + rng() * 2.2;
    line = (rng() - 0.25) * 0.5;
  }
  const q = clamp(0.45 + skill * 0.5 + (rng() - 0.5) * 0.25, 0.15, 0.98);
  const noBall = rng() < (1 - skill) * 0.04;
  return { line, length, releaseQuality: q, noBall };
}

/** CPU batting decision once the ball to the crease is known. */
export function aiShot(ball, batsman, rng) {
  const x = ball.atCrease.x;
  const z = ball.atCrease.z;
  const band = lengthBand(ball.length);
  const skill = batsman.batSkill / 100;
  const hard = band === "yorker" ? 1.45 : band === "good" || band === "bouncer" ? 1.05 : 0.62;
  const err = (rng() - 0.5) * 2 * (0.95 - skill * 0.55) * hard;

  if (!ball.bounced && z < 0.95 && skill > 0.5 && rng() < 0.55) {
    return { played: true, angle: x > 0.2 ? 36 : 0, loft: true, timing: err * 0.6, intent: "attack" };
  }
  if ((band === "bouncer" || z > 1.45) && x < 0.7) {
    return { played: true, angle: -100, loft: rng() < 0.45 + skill * 0.3, timing: err, intent: "attack" };
  }
  if (band === "yorker") {
    return { played: true, angle: 0, loft: false, timing: err * 1.15, intent: "defend" };
  }
  if (x > 0.9 && z < 1.5 && rng() < 0.45 + skill * 0.4) {
    return { played: false, angle: 0, loft: false, timing: 0, intent: "leave" };
  }
  if (x < -0.5 && rng() < 0.5) {
    return { played: false, angle: 0, loft: false, timing: 0, intent: "leave" };
  }
  const punish = band === "full" || band === "fulltoss" || band === "short";
  if (punish && rng() < 0.35 + skill * 0.5) {
    const angle = x > 0.15 ? 40 : x < -0.15 ? -42 : 0;
    return { played: true, angle, loft: rng() < 0.55, timing: err * 0.7, intent: "attack" };
  }
  if (Math.abs(x) < 0.45 && (band === "good" || band === "full")) {
    return {
      played: true,
      angle: x > 0 ? 28 : x < -0.1 ? -24 : 0,
      loft: false,
      timing: err,
      intent: rng() < skill ? "attack" : "defend",
    };
  }
  return {
    played: true,
    angle: x >= 0 ? 50 : -40,
    loft: false,
    timing: err,
    intent: "defend",
  };
}

/** Seconds of mistiming that map to a timing value of 1. Shared with the swing bar. */
export const TIMING_DIV = 0.62;

export function timingWindows(batSkill) {
  const forgive = 0.9 + (batSkill / 100) * 0.45;
  return {
    perfect: 0.22 * forgive * TIMING_DIV,
    good: 0.48 * forgive * TIMING_DIV,
  };
}

export function meterQuality(pos) {
  // pos 0 bottom, 1 top. Perfect band sits high, overstep is the bottom red.
  const perfect = 0.74;
  const d = Math.abs(pos - perfect);
  const q = clamp(1 - d / 0.55, 0, 1);
  const noBall = pos < 0.12;
  let label = "GOOD";
  if (noBall) label = "NO BALL";
  else if (d < 0.07) label = "PERFECT";
  else if (d > 0.28) label = "WAYWARD";
  return { q, noBall, label };
}
