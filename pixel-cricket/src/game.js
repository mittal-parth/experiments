import { TEAMS, getTeam, PITCH_LEN } from "./data.js";
import {
  TIMING_DIV,
  aiBall,
  aiShot,
  meterQuality,
  resolveDelivery,
  rollRelease,
  simulateToCrease,
} from "./sim.js";
import {
  applyBall,
  ballsLeft,
  currentBowler,
  currentStriker,
  freshInnings,
  oversText,
} from "./match.js";
import { bowlingSide, layout, pointIn, project, render, unprojectGround } from "./render.js";
import { setMuted, sfx, unlockAudio } from "./audio.js";

const SIM_RATE = 0.42;
const RUNUP_RELEASE_MIN = 0.32;

export const G = {
  screen: "title",
  time: 0,
  paused: false,
  hold: false,
  cam: { nearY: -6, farY: 32, lookX: 0, zoom: 1, panX: 0 },
  shake: 0,
  mouse: { x: 240, y: 135, down: false },
  hover: null,
  keys: new Set(),
  teams: TEAMS,
  userId: "ind",
  cpuId: "aus",
  inn: null,
  poster: null,
  first: null,
  second: false,
  target: null,
  chaseBat: null,
  chaseBowl: null,
  phase: "aim",
  phaseT: 0,
  aimLine: 0.18,
  aimLength: 5.4,
  shotAngle: 28,
  shotLoft: false,
  shotIntent: "attack",
  plan: null,
  preview: null,
  result: null,
  cpuPlan: null,
  ball: null,
  trail: [],
  simT: 0,
  simRate: SIM_RATE,
  bowlerY: -2.4,
  bowlerX: -2.85,
  swing: 0,
  swung: false,
  crowd: 0.15,
  callout: null,
  toast: "",
  commentary: "",
  fx: [],
  confetti: [],
  sixCut: 0,
  overNote: "",
  pending: null,
  applied: false,
  showCard: false,
  cardInn: null,
  toss: null,
  muted: false,
  resultInfo: null,
  userBatting: false,
  skip: false,
  mouseAim: false,
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function poster() {
  const batting = getTeam("ind");
  const bowling = getTeam("aus");
  return {
    batting,
    bowling,
    striker: batting.players[1],
    non: batting.players[0],
    bowler: bowling.players.find((p) => p.id === "lee"),
  };
}

export function boot() {
  G.poster = poster();
  const q = new URLSearchParams(location.search);
  const mode = q.get("boot");
  if (mode === "bowl") quickMatch(true);
  else if (mode === "bat") quickMatch(false);
}

function quickMatch(userBowls) {
  G.userId = "ind";
  G.cpuId = "aus";
  G.second = false;
  G.first = null;
  G.target = null;
  const user = getTeam("ind");
  const cpu = getTeam("aus");
  if (userBowls) beginInnings(cpu, user, null);
  else beginInnings(user, cpu, null);
}

function beginInnings(batting, bowling, target) {
  G.inn = freshInnings(batting, bowling);
  G.target = target;
  G.userBatting = batting.id === G.userId;
  G.screen = "match";
  G.paused = false;
  G.showCard = false;
  beginBall();
}

function beginBall() {
  G.result = null;
  G.preview = null;
  G.plan = null;
  G.cpuPlan = null;
  G.ball = null;
  G.trail = [];
  G.simT = 0;
  G.swing = 0;
  G.swung = false;
  G.applied = false;
  G.pending = null;
  G.toast = "";
  G.callout = null;
  G.overNote = "";
  G.skip = false;
  G.mouseAim = false;
  G.shotIntent = "attack";
  if (G.userBatting) {
    G.cpuPlan = aiBall(currentBowler(G.inn), Math.random);
    G.phase = "runup";
    G.phaseT = 0;
    G.commentary = `${currentBowler(G.inn).short} comes in`;
  } else {
    G.phase = "aim";
    G.phaseT = 0;
    G.commentary = "Set the length, then bowl";
  }
}

function userRelease() {
  if (G.phase !== "runup") return;
  const meter = meterQuality(G.meterPos || 0);
  const bowler = currentBowler(G.inn);
  const rolled = rollRelease({
    line: G.aimLine,
    length: G.aimLength,
    releaseQuality: meter.q,
    noBall: meter.noBall || G.inn.freeHit === false && false,
    bowler,
    rng: Math.random,
  });
  // meter no-ball (overstep) is the one the player earned. Beamers are detected later.
  rolled.noBall = meter.noBall;
  startFlight(rolled, bowler, null);
  sfx("bowl");
  if (meter.label === "PERFECT") G.toast = "PERFECT RELEASE";
  else if (meter.noBall) G.toast = "OVERSTEPPED";
  else if (meter.label === "WAYWARD") G.toast = "WAYWARD";
  else G.toast = "RELEASED";
}

function cpuRelease() {
  if (G.phase !== "runup") return;
  const bowler = currentBowler(G.inn);
  const rolled = rollRelease({
    line: G.cpuPlan.line,
    length: G.cpuPlan.length,
    releaseQuality: G.cpuPlan.releaseQuality,
    noBall: G.cpuPlan.noBall,
    bowler,
    rng: Math.random,
  });
  rolled.noBall = G.cpuPlan.noBall;
  startFlight(rolled, bowler, null);
  sfx("bowl");
}

function startFlight(rolled, bowler, presetShot) {
  G.plan = rolled;
  G.preview = simulateToCrease({
    line: rolled.line,
    length: rolled.length,
    speed: rolled.speed,
    kind: bowler.bowl.type,
  });
  G.phase = "flight";
  G.phaseT = 0;
  G.simT = 0;
  if (!G.userBatting) {
    const batsman = currentStriker(G.inn);
    const shot = presetShot || aiShot(G.preview, batsman, Math.random);
    G.result = resolveDelivery({
      locked: true,
      line: rolled.line,
      length: rolled.length,
      speed: rolled.speed,
      releaseQuality: rolled.q,
      noBall: rolled.noBall,
      freeHit: G.inn.freeHit,
      shot,
      bowler,
      batsman,
    });
  }
}

function playShot(timing) {
  if (G.swung || G.result || !G.preview) return;
  G.swung = true;
  G.swing = 0.02;
  const batsman = currentStriker(G.inn);
  const bowler = currentBowler(G.inn);
  const shot = {
    played: true,
    angle: G.shotAngle,
    loft: G.shotIntent === "defend" ? false : G.shotLoft,
    timing,
    intent: G.shotIntent,
  };
  G.result = resolveDelivery({
    locked: true,
    line: G.plan.line,
    length: G.plan.length,
    speed: G.plan.speed,
    releaseQuality: G.plan.q,
    noBall: G.plan.noBall,
    freeHit: G.inn.freeHit,
    shot,
    bowler,
    batsman,
  });
  G.toast = G.result.timingLabel === "LEAVE" ? "" : G.result.timingLabel;
}

function leaveBall() {
  if (G.result || !G.preview) return;
  const batsman = currentStriker(G.inn);
  const bowler = currentBowler(G.inn);
  G.result = resolveDelivery({
    locked: true,
    line: G.plan.line,
    length: G.plan.length,
    speed: G.plan.speed,
    releaseQuality: G.plan.q,
    noBall: G.plan.noBall,
    freeHit: G.inn.freeHit,
    shot: { played: false, angle: 0, loft: false, timing: 0, intent: "leave" },
    bowler,
    batsman,
  });
}

function sampleAt(samples, t) {
  if (!samples || samples.length === 0) return null;
  if (t <= samples[0].t) return samples[0];
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].t >= t) {
      const a = samples[i - 1];
      const b = samples[i];
      const k = (t - a.t) / (b.t - a.t || 1);
      return {
        t,
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
        z: a.z + (b.z - a.z) * k,
      };
    }
  }
  return samples[samples.length - 1];
}

function puff(x, y, z, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    G.fx.push({
      x,
      y,
      z,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed * 0.6,
      vz: 1 + Math.random() * speed,
      age: 0,
      life: 0.35 + Math.random() * 0.35,
      color,
    });
  }
}

function onEvent(e) {
  switch (e.type) {
    case "release":
      break;
    case "bounce":
      sfx("bounce");
      puff(e.x, e.y, 0.05, "#e6d2a4", 7, 2.2);
      if (!G.userBatting && G.preview) G.toast = G.result ? G.result.lengthName : G.preview ? lengthNameSafe() : "";
      break;
    case "contact":
      if (G.result && (G.result.timingLabel === "PERFECT" || G.result.timingLabel === "GOOD")) sfx("sweet");
      else sfx("hit");
      G.swing = Math.max(G.swing, 0.2);
      break;
    case "six":
      sfx("six");
      G.crowd = 1;
      G.shake = 7;
      G.sixCut = 1.75;
      G.callout = { text: "SIX", sub: G.result.shotName, age: 0, hold: 1.6, color: "#ffd34a" };
      spawnConfetti();
      break;
    case "four":
      sfx("four");
      G.crowd = 0.65;
      G.shake = 3.5;
      G.callout = { text: "FOUR", sub: G.result.shotName, age: 0, hold: 1.15, color: "#fffaf0" };
      break;
    case "bowled":
      sfx("stump");
      sfx("out");
      G.shake = 6;
      G.callout = { text: "BOWLED", sub: "TIMBER", age: 0, hold: 1.5, color: "#ff5a4a" };
      puff(0, PITCH_LEN, 0.4, "#f4e3b4", 10, 3);
      break;
    case "lbw":
      sfx("out");
      G.shake = 4;
      G.callout = { text: "LBW", sub: "PLUMB", age: 0, hold: 1.5, color: "#ff5a4a" };
      break;
    case "catch":
      sfx("out");
      sfx("cheer");
      G.shake = 4;
      G.callout = { text: "CAUGHT", sub: e.fielder, age: 0, hold: 1.5, color: "#ff5a4a" };
      break;
    case "wide":
      sfx("wide");
      G.callout = { text: "WIDE", sub: "+1", age: 0, hold: 1, color: "#ffd34a" };
      break;
    case "noball":
      sfx("wide");
      G.callout = { text: "NO BALL", sub: "FREE HIT", age: 0, hold: 1.1, color: "#ff9a3c" };
      break;
    case "miss":
      sfx("miss");
      break;
    case "leave":
      break;
    case "pad":
      sfx("miss");
      break;
    case "field":
      if (e.runs > 0) {
        G.callout = { text: e.runs === 1 ? "ONE" : e.runs === 2 ? "TWO" : "THREE", sub: "", age: 0, hold: 0.8, color: "#fffaf0" };
      }
      break;
    default:
      break;
  }
}

function lengthNameSafe() {
  return G.result ? G.result.lengthName : "";
}

function spawnConfetti() {
  G.confetti = [];
  const colors = ["#ffd34a", "#fff", "#ff5a4a", "#7CDB4A", "#1f4fd0"];
  for (let i = 0; i < 40; i++) {
    G.confetti.push({
      x: Math.random() * 480,
      y: 20 + Math.random() * 40,
      vy: 20 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 30,
      color: colors[i % colors.length],
    });
  }
}

function pollEvents() {
  if (!G.result) return;
  for (const e of G.result.events) {
    if (e.done) continue;
    if (G.simT + 0.0001 >= e.t) {
      e.done = true;
      onEvent(e);
    }
  }
}

function enterCelebrate() {
  G.commentary = (G.result && G.result.commentary) || "";
  if (G.result && G.result.timingLabel && G.result.timingLabel !== "LEAVE") G.toast = G.result.timingLabel;
  G.phase = "celebrate";
  G.phaseT = 0;
}

function closeDelivery() {
  if (!G.applied) {
    G.applied = true;
    const bowler = currentBowler(G.inn);
    G.pending = applyBall(G.inn, G.result, bowler.short, G.target);
  }
  if (G.pending && G.pending.inningsEnd) {
    finishInnings();
    return;
  }
  if (G.pending && G.pending.overEnd) {
    G.phase = "over";
    G.phaseT = 0;
    G.overNote = `OVER ${oversText(G.inn.legalBalls)}`;
    return;
  }
  beginBall();
}

function celebrateDur() {
  if (!G.result) return 0.6;
  if (G.result.boundary === "6") return 2.35;
  if (G.result.wicket) return 1.75;
  if (G.result.boundary === "4") return 1.2;
  if (G.result.extraType) return 1.05;
  return 0.85;
}

function finishInnings() {
  if (!G.second) {
    G.first = G.inn;
    G.first.overs = oversText(G.inn.legalBalls);
    G.second = true;
    G.target = G.inn.runs + 1;
    G.chaseBat = G.inn.bowling;
    G.chaseBowl = G.inn.batting;
    G.screen = "break";
    G.userBatting = G.chaseBat.id === G.userId;
    G.phase = "aim";
    return;
  }
  G.screen = "result";
  G.resultInfo = buildResult();
}

function buildResult() {
  const first = G.first;
  const secondInn = G.inn;
  const chased = secondInn.runs >= G.target;
  const tied = !chased && secondInn.runs === first.runs;
  let title = "MATCH TIED";
  let line = "HONOURS EVEN";
  if (chased) {
    const left = 10 - secondInn.wickets;
    title = `${secondInn.batting.short} WIN`;
    line = `BY ${left} WICKET${left === 1 ? "" : "S"}`;
  } else if (!tied) {
    const margin = first.runs - secondInn.runs;
    title = `${first.batting.short} WIN`;
    line = `BY ${margin} RUN${margin === 1 ? "" : "S"}`;
  }
  return {
    title,
    line,
    scores: `${first.batting.short} ${first.runs}/${first.wickets}    ${secondInn.batting.short} ${secondInn.runs}/${secondInn.wickets}`,
    motm: pickMotm(first, secondInn),
    card: secondInn.runs >= first.runs ? secondInn : first,
  };
}

function pickMotm(a, b) {
  let name = a.batter[0].name;
  let best = -1;
  for (const inn of [a, b]) {
    for (const bat of inn.batter) {
      if (bat.runs > best) {
        best = bat.runs;
        name = bat.name;
      }
    }
    for (const bowl of inn.bowler) {
      const impact = bowl.wickets * 24 - bowl.runs * 0.2;
      if (bowl.wickets >= 2 && impact > best) {
        best = impact;
        name = bowl.name;
      }
    }
  }
  return name;
}

function desiredCam() {
  const idle = { nearY: -6, farY: 32, lookX: 0, zoom: 1, panX: 0 };
  if (G.screen !== "match") return idle;
  if (G.phase === "aim" || G.phase === "over") return idle;
  if (G.phase === "runup") {
    const k = Math.min(1, Math.max(0, (G.phaseT - 0.7) / 0.7));
    return {
      nearY: -6 + k * 1.4,
      farY: 32 - k * 1.2,
      lookX: (G.bowlerX || 0) * 0.03,
      zoom: 1 + k * 0.05,
      panX: 0,
    };
  }
  const ball = G.ball;
  if (!ball) return idle;
  const contact = G.preview ? G.preview.atCrease.t : 9;
  if (G.result && G.result.boundary === "6" && G.simT > contact && G.sixCut <= 0) {
    return { nearY: ball.y - 16, farY: ball.y + 20, lookX: clamp(ball.x * 0.35, -8, 8), zoom: 0.92, panX: 0 };
  }
  if (G.simT < contact + 0.04) {
    return { nearY: -4.5, farY: 30, lookX: clamp(ball.x * 0.1, -1.4, 1.4), zoom: 1.04, panX: 0 };
  }
  return {
    nearY: clamp(ball.y - 14, -8, 6),
    farY: clamp(ball.y - 14, -8, 6) + 36,
    lookX: clamp(ball.x * 0.22, -5, 5),
    zoom: 1.02,
    panX: 0,
  };
}

function lerpCam(dt) {
  const d = desiredCam();
  const k = 1 - Math.exp(-dt * 3.2);
  G.cam.nearY += (d.nearY - G.cam.nearY) * k;
  G.cam.farY += (d.farY - G.cam.farY) * k;
  G.cam.lookX += (d.lookX - G.cam.lookX) * k;
  G.cam.zoom += (d.zoom - G.cam.zoom) * k;
  G.cam.panX += (d.panX - G.cam.panX) * k;
}

function updateAim(dt) {
  const speed = dt * 1.35;
  if (G.keys.has("ArrowLeft") || G.keys.has("KeyA")) G.aimLine += speed;
  if (G.keys.has("ArrowRight") || G.keys.has("KeyD")) G.aimLine -= speed;
  if (G.keys.has("ArrowUp") || G.keys.has("KeyW")) G.aimLength -= speed * 2.4;
  if (G.keys.has("ArrowDown") || G.keys.has("KeyS")) G.aimLength += speed * 2.4;
  G.aimLine = clamp(G.aimLine, -1.5, 1.5);
  G.aimLength = clamp(G.aimLength, -0.65, 13.3);
  if (G.mouse.down) aimFromMouse();
}

function aimFromMouse() {
  const w = unprojectGround(G.mouse.x, G.mouse.y, G.cam);
  if (w.y < 3 || w.y > PITCH_LEN + 0.4 || Math.abs(w.x) > 2.1) return;
  G.aimLine = clamp(w.x, -1.5, 1.5);
  G.aimLength = clamp(PITCH_LEN - w.y, -0.65, 13.3);
}

function updateRunup(dt) {
  const k = Math.min(1, G.phaseT / 1.28);
  const side = bowlingSide(G.inn ? G.inn.legalBalls : 0);
  G.bowlerY = -2.8 + k * 2.2;
  G.bowlerX = side * (3.05 - k * 1.55);
  const period = 1.12;
  const u = (G.phaseT % period) / period;
  G.meterPos = u < 0.5 ? u * 2 : 2 - u * 2;
  if (G.userBatting && G.phaseT >= 1.42) cpuRelease();
  if (!G.userBatting && G.phaseT >= 2.15) userRelease();
  if (G.userBatting) steerShot(dt);
}

function steerShot(dt) {
  if (G.keys.has("ArrowLeft") || G.keys.has("KeyA")) {
    G.shotAngle += 80 * dt;
    G.mouseAim = false;
  }
  if (G.keys.has("ArrowRight") || G.keys.has("KeyD")) {
    G.shotAngle -= 80 * dt;
    G.mouseAim = false;
  }
  G.shotAngle = clamp(G.shotAngle, -165, 165);
  if (G.keys.has("KeyS")) {
    G.shotIntent = "defend";
    G.shotLoft = false;
    G.shotAngle *= 1 - Math.min(1, dt * 6);
  } else G.shotIntent = "attack";
  if (G.mouseAim) aimShotFromMouse();
}

function aimShotFromMouse() {
  const bat = project(0.2, 18.9, 0, G.cam);
  const dx = G.mouse.x - bat.sx;
  const dy = G.mouse.y - bat.sy;
  if (dx * dx + dy * dy < 36) return;
  const angle = (Math.atan2(-dx, dy) * 180) / Math.PI;
  G.shotAngle = clamp(angle, -165, 165);
}

function updateFlight(dt) {
  const side = bowlingSide(G.inn ? G.inn.legalBalls : 0);
  G.bowlerY = -1.15;
  G.bowlerX = side * 1.55;
  G.simT = G.phaseT * SIM_RATE;
  if (G.userBatting) steerShot(dt);
  if (G.userBatting && !G.result && G.preview && G.simT > G.preview.atCrease.t + 0.015) leaveBall();
  const samples = G.result ? G.result.samples : G.preview.samples;
  G.ball = sampleAt(samples, G.simT);
  if (G.ball) {
    G.trail.push({ x: G.ball.x, y: G.ball.y, z: G.ball.z });
    if (G.trail.length > 14) G.trail.shift();
  }
  pollEvents();
  const contact = G.preview ? G.preview.atCrease.t : 0;
  const playing =
    G.swung ||
    (G.result && G.result.shotName && G.result.shotName !== "LEAVE" && G.simT > contact - 0.06);
  if (playing) G.swing = Math.min(1, G.swing + dt * 5.5);
  const end = samples[samples.length - 1].t;
  if (G.simT > end + 0.02) enterCelebrate();
}

function updateCelebrate(dt) {
  if (G.ball && G.result) {
    const end = G.result.samples[G.result.samples.length - 1];
    G.ball = end;
  }
  if (G.phaseT > celebrateDur() || (G.skip && G.phaseT > 0.35)) {
    G.skip = false;
    closeDelivery();
  }
}

export function frame(dt) {
  const step = Math.min(0.033, dt);
  G.time += step;
  if (G.toss && G.toss.phase === "spin") {
    G.toss.t += step;
    if (G.toss.t > 1.15) {
      G.toss.phase = G.toss.winner === "user" ? "choose" : "cpu";
      if (G.toss.winner === "cpu") {
        const cpu = getTeam(G.cpuId);
        const bat = Math.random() < 0.55;
        G.toss.cpuBat = bat;
        G.toss.blurb = `${cpu.short} WON THE TOSS AND WILL ${bat ? "BAT" : "BOWL"}`;
      }
    }
  }
  if (!G.paused && !G.hold && G.screen === "match") {
    G.phaseT += step;
    if (G.phase === "aim" && !G.userBatting) updateAim(step);
    else if (G.phase === "runup") updateRunup(step);
    else if (G.phase === "flight") updateFlight(step);
    else if (G.phase === "celebrate") updateCelebrate(step);
    else if (G.phase === "over") {
      if (G.phaseT > 1.25) {
        G.inn.thisOver = [];
        G.overNote = "";
        beginBall();
      }
    } else if (G.phase === "aim" && G.userBatting) {
      // waiting, should not stick
    } else if (G.phase !== "aim") {
      throw new Error(`Bad phase ${G.phase}`);
    }
  }
  if (G.callout) {
    G.callout.age += step;
    if (G.callout.age > G.callout.hold) G.callout = null;
  }
  G.shake *= Math.exp(-step * 3.5);
  if (G.shake < 0.05) G.shake = 0;
  if (G.screen === "match" && G.phase !== "flight") G.crowd = Math.max(0.08, G.crowd - step * 0.12);
  if (G.sixCut > 0) G.sixCut = Math.max(0, G.sixCut - step);
  for (const p of G.fx) {
    p.age += step;
    p.vz -= 8 * step;
    p.x += p.vx * step;
    p.y += p.vy * step;
    p.z = Math.max(0, p.z + p.vz * step);
  }
  G.fx = G.fx.filter((p) => p.age < p.life);
  for (const c of G.confetti) {
    c.y += c.vy * step;
    c.x += c.vx * step;
    c.vy += 20 * step;
  }
  lerpCam(step);
}

export function draw(ctx) {
  render(ctx, G);
}

function screenPos(e, canvas) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * 480,
    y: ((e.clientY - r.top) / r.height) * 270,
  };
}

function hoverAt(x, y) {
  const spots = layout(G);
  let id = null;
  for (const s of spots) if (pointIn(s, x, y)) id = s.id;
  G.hover = id;
}

export function pointerMove(e, canvas) {
  const p = screenPos(e, canvas);
  G.mouse.x = p.x;
  G.mouse.y = p.y;
  hoverAt(p.x, p.y);
  if (G.screen === "match" && G.userBatting && (G.phase === "runup" || G.phase === "flight")) {
    G.mouseAim = true;
  }
  if (G.screen === "match" && !G.userBatting && G.phase === "aim" && G.mouse.down) aimFromMouse();
}

export function pointerDown(e, canvas) {
  unlockAudio();
  const p = screenPos(e, canvas);
  G.mouse.x = p.x;
  G.mouse.y = p.y;
  G.mouse.down = true;
  hoverAt(p.x, p.y);
  if (G.screen === "match") {
    if (!G.userBatting && G.phase === "aim") aimFromMouse();
    if (G.userBatting && G.phase === "flight") swingNow();
    if (G.phase === "celebrate") G.skip = true;
    return;
  }
  const spot = layout(G).find((s) => pointIn(s, p.x, p.y));
  if (spot) activate(spot.id);
}

export function pointerUp() {
  G.mouse.down = false;
}

function activate(id) {
  sfx("blip");
  switch (id) {
    case "play":
      if (G.screen === "title" || G.screen === "how") G.screen = "pick";
      break;
    case "how":
      G.screen = "how";
      break;
    case "back":
      if (G.screen === "how" || G.screen === "pick") G.screen = "title";
      else if (G.screen === "opponent") G.screen = "pick";
      break;
    case "ind":
    case "aus":
    case "eng":
      chooseTeam(id);
      break;
    case "next":
      if (G.screen === "pick" && G.userId) G.screen = "opponent";
      else if (G.screen === "opponent" && G.cpuId && G.cpuId !== G.userId) {
        G.toss = { phase: "pick", t: 0 };
        G.screen = "toss";
      }
      break;
    case "heads":
    case "tails":
      callToss(id);
      break;
    case "bat":
      startFromToss(true);
      break;
    case "bowl":
      startFromToss(false);
      break;
    case "start":
      startFromToss(!G.toss.cpuBat);
      break;
    case "chase":
      beginInnings(G.chaseBat, G.chaseBowl, G.target);
      break;
    case "again":
      G.screen = "pick";
      G.second = false;
      G.inn = null;
      G.first = null;
      G.resultInfo = null;
      break;
    default:
      break;
  }
}

function chooseTeam(id) {
  if (G.screen === "pick") G.userId = id;
  else if (G.screen === "opponent" && id !== G.userId) G.cpuId = id;
}

function callToss(call) {
  const result = Math.random() < 0.5 ? "heads" : "tails";
  G.toss = {
    phase: "spin",
    call,
    result,
    winner: result === call ? "user" : "cpu",
    t: 0,
    blurb: "",
  };
}

function startFromToss(userBats) {
  G.second = false;
  G.first = null;
  const user = getTeam(G.userId);
  const cpu = getTeam(G.cpuId);
  if (userBats) beginInnings(user, cpu, null);
  else beginInnings(cpu, user, null);
}

function swingNow() {
  if (!G.userBatting || G.phase !== "flight" || G.swung || !G.preview) return;
  const contact = G.preview.atCrease.t / SIM_RATE;
  const delta = G.phaseT - contact;
  const timing = clamp(delta / TIMING_DIV, -1, 1);
  playShot(timing);
}

export function keyDown(code) {
  unlockAudio();
  G.keys.add(code);
  if (code === "KeyM") {
    G.muted = !G.muted;
    setMuted(G.muted);
    return;
  }
  if (code === "Escape" && G.screen === "match") {
    G.paused = !G.paused;
    return;
  }
  if (code === "KeyQ" && G.screen === "match" && G.paused) {
    G.paused = false;
    G.screen = "title";
    G.inn = null;
    G.second = false;
    G.first = null;
    G.phase = "aim";
    return;
  }
  if (code === "KeyC" && G.screen === "match") {
    G.showCard = !G.showCard;
    return;
  }
  if (G.paused) return;
  if (G.screen === "title" && (code === "Enter" || code === "Space")) {
    activate("play");
    return;
  }
  if (G.screen !== "match") {
    if (code === "Enter") {
      const spot = layout(G).find((s) => s.id === "next" || s.id === "start" || s.id === "chase" || s.id === "play" || s.id === "again");
      if (spot && (spot.id !== "next" || layout(G).some((s) => s.id === "next"))) activate(spot.id);
    }
    return;
  }
  if (code === "Space" || code === "Enter") {
    if (!G.userBatting && G.phase === "aim") {
      G.phase = "runup";
      G.phaseT = 0;
      sfx("blip");
    } else if (!G.userBatting && G.phase === "runup" && G.phaseT > RUNUP_RELEASE_MIN) {
      userRelease();
    } else if (G.userBatting && G.phase === "flight") {
      swingNow();
    } else if (G.phase === "celebrate") {
      G.skip = true;
    }
  }
  if (code === "KeyW" && G.userBatting) G.shotLoft = !G.shotLoft;
  if (code === "KeyS" && G.userBatting) {
    G.shotIntent = "defend";
    G.shotLoft = false;
  }
}

export function keyUp(code) {
  G.keys.delete(code);
}

export function debugState() {
  const contact = G.preview ? G.preview.atCrease.t / SIM_RATE : null;
  return {
    screen: G.screen,
    phase: G.phase,
    phaseT: Number(G.phaseT.toFixed(3)),
    userBatting: G.userBatting,
    aimLine: Number(G.aimLine.toFixed(2)),
    aimLength: Number(G.aimLength.toFixed(2)),
    shotAngle: Number((G.shotAngle || 0).toFixed(1)),
    shotLoft: G.shotLoft,
    meter: G.meterPos != null ? Number(G.meterPos.toFixed(3)) : null,
    contact,
    simT: Number(G.simT.toFixed(3)),
    swung: G.swung,
    score: G.inn ? `${G.inn.batting.short} ${G.inn.runs}/${G.inn.wickets} ${oversText(G.inn.legalBalls)}` : "",
    ballsLeft: G.inn ? ballsLeft(G.inn) : null,
    callout: G.callout ? G.callout.text : "",
    commentary: G.commentary,
    result: G.result
      ? {
          wicket: G.result.wicket && G.result.wicket.type,
          boundary: G.result.boundary,
          runs: G.result.runsOffBat,
          extra: G.result.extraType,
          shot: G.result.shotName,
          timing: G.result.timingLabel,
          text: G.result.commentary,
        }
      : null,
    sixCut: Number(G.sixCut.toFixed(2)),
    lengthName: G.result && G.result.lengthName,
  };
}
