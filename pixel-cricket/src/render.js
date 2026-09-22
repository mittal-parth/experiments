import { CONTACT_Y, PITCH_LEN, lengthLabel, lineLabel } from "./data.js";
import { GROUND, fieldPositions, timingWindows } from "./sim.js";
import { currentBowler, currentNon, currentStriker, needText, oversText, runRate } from "./match.js";

const VIEW = {
  cx: 240,
  groundNear: 230,
  groundFar: 58,
  lateral: 50,
  height: 20,
};

// The strip stays in true metres. Past the return crease the outfield eases
// toward the edges so the grass and the close fielders stay on screen.
const PITCH_X = 1.85;
const OUT_EXP = 0.5;
const OUT_GAIN = 0.34;

export function bowlingSide(legalBalls) {
  return Math.floor((legalBalls || 0) / 6) % 2 === 0 ? -1 : 1;
}

function viewX(x) {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  if (a <= PITCH_X) return x;
  return sign * (PITCH_X + Math.pow(a - PITCH_X, OUT_EXP) * OUT_GAIN);
}

function invViewX(v) {
  const sign = v < 0 ? -1 : 1;
  const a = Math.abs(v);
  if (a <= PITCH_X) return v;
  const extra = (a - PITCH_X) / OUT_GAIN;
  return sign * (PITCH_X + Math.pow(Math.max(0, extra), 1 / OUT_EXP));
}

function depthScale(dc, zoom) {
  return Math.max(0.7, (1.08 - dc * 0.42) * zoom);
}

const FONT = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b10010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  0: [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  1: [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  2: [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  3: [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  4: [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  5: [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  6: [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  7: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  8: [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  9: [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  ".": [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b00100],
  ",": [0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b00100, 0b01000],
  "!": [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
  "?": [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b00000, 0b00100],
  "'": [0b00100, 0b00100, 0b01000, 0b00000, 0b00000, 0b00000, 0b00000],
  "-": [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  "+": [0b00000, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0b00000],
  "(": [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ")": [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  "/": [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  ":": [0b00000, 0b00100, 0b00100, 0b00000, 0b00100, 0b00100, 0b00000],
  " ": [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
};

const CROWD_COLORS = ["#e23b3b", "#f0c410", "#1f4fd0", "#f4f6fb", "#ff8a1e", "#138808", "#7a4b2a", "#5b6b8a", "#d01c2e", "#222"];
const CROWD = [];
for (let r = 0; r < 16; r++) {
  for (let c = 0; c < 96; c++) {
    CROWD.push({
      c,
      r,
      color: CROWD_COLORS[(c * 3 + r * 5) % CROWD_COLORS.length],
      phase: ((c * 17 + r * 9) % 16) / 16,
      skin: ["#f3c7a4", "#e0a56a", "#c68642", "#a86b45", "#f6d2b4"][(c + r) % 5],
    });
  }
}

export function project(x, y, z, cam) {
  const span = cam.farY - cam.nearY || 1;
  const depth = (y - cam.nearY) / span;
  const dc = Math.max(0, Math.min(1, depth));
  const scale = depthScale(dc, cam.zoom);
  const gy = VIEW.groundNear + (VIEW.groundFar - VIEW.groundNear) * depth;
  const sx = VIEW.cx - (viewX(x) - viewX(cam.lookX)) * scale * VIEW.lateral + cam.panX;
  const sy = gy - z * scale * VIEW.height;
  return { sx, sy, scale, depth, gy };
}

export function unprojectGround(sx, sy, cam) {
  const depth = (sy - VIEW.groundNear) / (VIEW.groundFar - VIEW.groundNear);
  const y = cam.nearY + depth * (cam.farY - cam.nearY);
  const dc = Math.max(0, Math.min(1, depth));
  const scale = depthScale(dc, cam.zoom);
  const v = viewX(cam.lookX) + (VIEW.cx + cam.panX - sx) / (scale * VIEW.lateral);
  return { x: invViewX(v), y };
}

function box(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

export function measure(text, scale) {
  const s = String(text).toUpperCase();
  const gap = scale;
  let w = 0;
  for (let i = 0; i < s.length; i++) w += (s[i] === " " ? 3 : 5) * scale + gap;
  return Math.max(0, w - gap);
}

export function drawText(ctx, text, x, y, opt = {}) {
  const scale = opt.scale || 1;
  const color = opt.color || "#fffaf0";
  const s = String(text).toUpperCase();
  const w = measure(s, scale);
  let cx = x;
  if (opt.align === "center") cx = x - w / 2;
  else if (opt.align === "right") cx = x - w;
  const paint = (ox, oy, col) => {
    let px = cx + ox;
    const gap = scale;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i] === "·" ? "." : s[i];
      const glyph = FONT[ch];
      const gw = (ch === " " ? 3 : 5) * scale;
      if (glyph) {
        for (let r = 0; r < 7; r++) {
          const bits = glyph[r];
          for (let c = 0; c < 5; c++) {
            if (bits & (1 << (4 - c))) box(ctx, px + c * scale, y + oy + r * scale, scale, scale, col);
          }
        }
      }
      px += gw + gap;
    }
  };
  if (opt.shadow !== false) paint(scale, scale, "rgba(6,14,28,0.9)");
  paint(0, 0, color);
  return w;
}

function groundHalf(worldY) {
  const ny = (worldY - GROUND.cy) / GROUND.ry;
  if (ny * ny >= 1) return 0;
  return GROUND.rx * Math.sqrt(1 - ny * ny);
}

function drawSky(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.groundFar + 8);
  g.addColorStop(0, "#5eb8ea");
  g.addColorStop(1, "#d7f3ff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, VIEW.groundFar + 10);
  // sun
  box(ctx, 400, 18, 22, 22, "#ffe27a");
  box(ctx, 404, 14, 14, 4, "#ffe27a");
  box(ctx, 404, 40, 14, 4, "#ffe27a");
  box(ctx, 396, 22, 4, 14, "#ffe27a");
  box(ctx, 422, 22, 4, 14, "#ffe27a");
  const clouds = [
    [40, 22],
    [120, 16],
    [210, 26],
    [300, 14],
  ];
  clouds.forEach(([x, y], i) => {
    const dx = ((time * 6 + i * 40) % 520) - 40;
    const cx = x + dx * 0.15;
    box(ctx, cx, y, 28, 8, "#ffffff");
    box(ctx, cx + 6, y - 6, 16, 8, "#ffffff");
    box(ctx, cx + 16, y - 2, 18, 8, "#f4fbff");
  });
}

function drawCrowdBand(ctx, top, rows, energy, time, jumpScale) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 96; c++) {
      const p = CROWD[r * 96 + c];
      if (!p) continue;
      const jump = energy > 0.05 ? Math.max(0, Math.sin(time * 14 + p.phase * 6)) * (1 + energy * 3.2) * jumpScale : 0;
      const x = 4 + c * 5;
      const y = top + r * 5 - jump;
      box(ctx, x, y + 2, 3, 3, p.color);
      box(ctx, x, y, 3, 2, p.skin);
    }
  }
}

function drawStands(ctx, G) {
  box(ctx, 0, 16, 480, VIEW.groundFar - 10, "#6d7c8a");
  box(ctx, 0, 16, 480, 6, "#d7dde4");
  // hoardings
  const boards = [
    ["#1f4fd0", "CUP"],
    ["#f0c410", "SIXES"],
    ["#d01c2e", "TEA"],
    ["#138808", "PITCH"],
    ["#1f4fd0", "SUMMER"],
    ["#f0c410", "WILLOW"],
  ];
  boards.forEach((b, i) => {
    const x = i * 80;
    box(ctx, x, VIEW.groundFar - 16, 80, 12, b[0]);
    drawText(ctx, b[1], x + 40, VIEW.groundFar - 14, { scale: 1, align: "center", color: "#fffaf0", shadow: false });
  });
  drawCrowdBand(ctx, 24, 8, G.crowd || 0, G.time, 1);
}

function drawGround(ctx, cam) {
  for (let sy = Math.floor(VIEW.groundFar); sy <= VIEW.groundNear; sy++) {
    const depth = (sy - VIEW.groundNear) / (VIEW.groundFar - VIEW.groundNear);
    const worldY = cam.nearY + depth * (cam.farY - cam.nearY);
    const half = groundHalf(worldY);
    if (half <= 0.2) {
      box(ctx, 0, sy, 480, 1, sy % 6 < 3 ? "#8d9aaa" : "#7d8b9a");
      continue;
    }
    const left = project(half, worldY, 0, cam).sx;
    const right = project(-half, worldY, 0, cam).sx;
    const mow = Math.floor(worldY * 1.35) & 1;
    const stripe = Math.floor(worldY * 0.35) & 1;
    box(ctx, 0, sy, 480, 1, "#214f22");
    box(ctx, left, sy, right - left, 1, mow ? (stripe ? "#46a83a" : "#3d9a34") : stripe ? "#358c2e" : "#2f7e29");
    // rope
    box(ctx, left - 1, sy, 2, 1, "#f4f0dc");
    box(ctx, right - 1, sy, 2, 1, "#f4f0dc");
  }
  box(ctx, 0, VIEW.groundNear, 480, 270 - VIEW.groundNear, "#2f7e29");
}

function poly(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0].sx, pts[0].sy);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
  ctx.closePath();
  ctx.fill();
}

function drawPitch(ctx, cam) {
  const w = 1.52;
  poly(
    ctx,
    [
      project(-w, -0.2, 0, cam),
      project(w, -0.2, 0, cam),
      project(w, PITCH_LEN + 0.2, 0, cam),
      project(-w, PITCH_LEN + 0.2, 0, cam),
    ],
    "#e4c892"
  );
  poly(
    ctx,
    [
      project(-0.55, 2, 0, cam),
      project(0.55, 2, 0, cam),
      project(0.55, PITCH_LEN - 2, 0, cam),
      project(-0.55, PITCH_LEN - 2, 0, cam),
    ],
    "#d2b178"
  );
  // creases
  for (const y of [1.22, PITCH_LEN - 1.22]) {
    const a = project(-1.52, y, 0, cam);
    const b = project(1.52, y, 0, cam);
    crease(ctx, a, b, Math.max(2, a.scale * 1.6));
  }
  for (const y of [0, PITCH_LEN]) {
    const a = project(-1.32, y, 0.01, cam);
    const b = project(1.32, y, 0.01, cam);
    crease(ctx, a, b, Math.max(1, a.scale * 1.3));
  }
}

function crease(ctx, a, b, h) {
  const x = Math.min(a.sx, b.sx);
  const w = Math.abs(b.sx - a.sx);
  box(ctx, x, a.sy, w, h, "#f7f3e8");
}

function drawStumps(ctx, y, cam, fly) {
  for (const x of [-0.1, 0, 0.1]) {
    const foot = project(x, y, 0, cam);
    const top = project(x, y, 0.71, cam);
    const lean = fly ? (x === 0 ? 0 : x > 0 ? 4 : -4) : 0;
    const w = Math.max(1, foot.scale * 2);
    box(ctx, top.sx - w / 2 + lean, top.sy, w, Math.max(2, foot.sy - top.sy), "#f4e3b4");
    box(ctx, top.sx - w / 2 + lean, top.sy, w, Math.max(1, w * 0.4), "#d7c08a");
  }
  if (!fly) {
    const a = project(-0.12, y, 0.74, cam);
    const b = project(0.12, y, 0.74, cam);
    box(ctx, a.sx, a.sy, Math.max(2, b.sx - a.sx), Math.max(1, a.scale * 1.1), "#1a120c");
  }
}

function drawFace(ctx, sx, hy, u, face, helmet, team) {
  const skin = face.skin;
  box(ctx, sx - 4 * u, hy + 4 * u, 8 * u, 7 * u, skin);
  if (face.patka && !helmet) {
    box(ctx, sx - 5 * u, hy, 10 * u, 5 * u, "#f2a007");
    box(ctx, sx - 5 * u, hy, 10 * u, 1.4 * u, "#163a8a");
    box(ctx, sx - 1.5 * u, hy - 2 * u, 3 * u, 3 * u, "#f2a007");
  } else if (helmet) {
    box(ctx, sx - 5 * u, hy, 10 * u, 5 * u, team.jerseyDark);
    box(ctx, sx - 5 * u, hy, 10 * u, u, team.accent);
    box(ctx, sx - 6 * u, hy + 4 * u, 12 * u, 1.3 * u, team.jersey);
    if (face.hairStyle === "long") box(ctx, sx + 4 * u, hy + 3 * u, 2.4 * u, 7 * u, face.hair);
    if (face.hairStyle === "spiky") box(ctx, sx - 1 * u, hy - 2 * u, 2 * u, 2 * u, face.hair);
  } else {
    drawHair(ctx, sx, hy, u, face);
    box(ctx, sx - 5 * u, hy + 1.2 * u, 10 * u, 2 * u, team.jersey);
    box(ctx, sx - 6 * u, hy + 2.6 * u, 3.5 * u, u, team.jerseyDark);
  }
  const ey = hy + 6 * u;
  if (face.sunglasses) {
    box(ctx, sx - 3.4 * u, ey, 7 * u, 1.6 * u, "#1a1c22");
  } else if (face.glasses) {
    box(ctx, sx - 3.4 * u, ey, 2.8 * u, 2.2 * u, "#e7f3f8");
    box(ctx, sx + 0.8 * u, ey, 2.8 * u, 2.2 * u, "#e7f3f8");
    box(ctx, sx - 0.5 * u, ey + 0.7 * u, u, u * 0.6, "#243040");
    box(ctx, sx - 2.4 * u, ey + 0.6 * u, u, u, "#1a120c");
    box(ctx, sx + 1.6 * u, ey + 0.6 * u, u, u, "#1a120c");
  } else {
    box(ctx, sx - 3 * u, ey, 2 * u, 2 * u, "#fffaf0");
    box(ctx, sx + u, ey, 2 * u, 2 * u, "#fffaf0");
    box(ctx, sx - 2.1 * u, ey + 0.7 * u, u, u, "#1a120c");
    box(ctx, sx + 1.7 * u, ey + 0.7 * u, u, u, "#1a120c");
  }
  box(ctx, sx - u, hy + 9 * u, 2 * u, Math.max(1, u * 0.7), "#c46a58");
  if (face.beard === "beard" || face.beard === "stubble") {
    box(ctx, sx - 3 * u, hy + 8.6 * u, 6 * u, 2 * u, face.beard === "beard" ? "#2a2118" : "#7a5a40");
  }
  if (face.beard === "mustache") box(ctx, sx - 2 * u, hy + 8 * u, 4 * u, u, "#3a2a1c");
}

function drawHair(ctx, sx, hy, u, face) {
  const h = face.hair;
  switch (face.hairStyle) {
    case "bald":
      break;
    case "spiky":
      box(ctx, sx - 4 * u, hy + u, 8 * u, 2 * u, h);
      box(ctx, sx - 3 * u, hy - u, 2 * u, 2 * u, h);
      box(ctx, sx, hy - 2 * u, 2 * u, 3 * u, h);
      box(ctx, sx + 3 * u, hy - u, 2 * u, 2 * u, h);
      break;
    case "curly":
      box(ctx, sx - 5 * u, hy, 10 * u, 4 * u, h);
      box(ctx, sx - 5 * u, hy + 3 * u, 2 * u, 3 * u, h);
      box(ctx, sx + 3 * u, hy + 3 * u, 2 * u, 3 * u, h);
      break;
    case "long":
      box(ctx, sx - 5 * u, hy, 10 * u, 3 * u, h);
      box(ctx, sx + 3 * u, hy + 2 * u, 3 * u, 7 * u, h);
      break;
    case "parted":
      box(ctx, sx - 5 * u, hy, 10 * u, 3 * u, h);
      box(ctx, sx - 5 * u, hy + 2 * u, 3 * u, 2 * u, h);
      break;
    case "short":
      box(ctx, sx - 4 * u, hy, 8 * u, 3 * u, h);
      break;
    default: {
      const never = face.hairStyle;
      throw new Error(`Unknown hair ${never}`);
    }
  }
}

function spriteUnit(scale, hero) {
  if (scale < 0.62) return 1;
  return 2;
}

function drawCricketer(ctx, sx, sy, scale, opts) {
  const u = spriteUnit(scale, Boolean(opts.hero));
  const bob = Math.sin(opts.time * 5 + sx * 0.05) * u * 0.3;
  const y0 = sy + bob;
  const wide = opts.face.build === "broad" ? 1 : 0;
  const run = opts.pose === "run" || opts.pose === "bowlrun";
  const leg = Math.sin(opts.time * (run ? 18 : 3) + sy) * u * (run ? 1.4 : 0.2);
  box(ctx, sx - (6 + wide) * u, y0 - u * 0.2, (12 + wide * 2) * u, u * 1.4, "rgba(0,0,0,0.28)");

  const pants = opts.keeper ? "#f7f4ea" : opts.team.pants;
  box(ctx, sx - (3.2 + wide) * u, y0 - 8 * u, 2.4 * u, 8 * u + Math.max(0, leg), pants);
  box(ctx, sx + 0.6 * u, y0 - 8 * u, 2.4 * u, 8 * u + Math.max(0, -leg), pants);
  if (opts.pads) {
    box(ctx, sx - (3.6 + wide) * u, y0 - 8 * u, 3 * u, 7 * u, "#f3ecda");
    box(ctx, sx + 0.3 * u, y0 - 8 * u, 3 * u, 7 * u, "#f3ecda");
    box(ctx, sx - (3.2 + wide) * u, y0 - 5 * u, 2.2 * u, u, "#d9d0bc");
  }
  box(ctx, sx - (3.5 + wide) * u, y0 - 2 * u + Math.min(leg, 0), 3 * u, 1.6 * u, "#f4f4f4");
  box(ctx, sx + 0.4 * u, y0 - 2 * u, 3 * u, 1.6 * u, "#2a2a2a");

  box(ctx, sx - (4 + wide) * u, y0 - 16 * u, (8 + wide * 2) * u, 9 * u, opts.team.jersey);
  box(ctx, sx - (4 + wide) * u, y0 - 16 * u, (8 + wide * 2) * u, u, opts.team.accent);
  box(ctx, sx - u, y0 - 15 * u, 2 * u, 7 * u, opts.team.trim);

  const skin = opts.face.skin;
  // arms
  if (opts.pose === "appeal") {
    box(ctx, sx - 7 * u, y0 - 22 * u, 2 * u, 8 * u, skin);
    box(ctx, sx + 5 * u, y0 - 22 * u, 2 * u, 8 * u, skin);
  } else if (opts.pose === "bowl") {
    box(ctx, sx - 6 * u, y0 - 14 * u, 2 * u, 6 * u, skin);
    ctx.save();
    ctx.translate(sx + 4 * u, y0 - 15 * u);
    ctx.rotate(-0.4 - (opts.arm || 0) * 2.6);
    box(ctx, -u, -8 * u, 2 * u, 8 * u, opts.team.jersey);
    box(ctx, -u, -9 * u, 2 * u, 2 * u, skin);
    ctx.restore();
  } else {
    box(ctx, sx - (6 + wide) * u, y0 - 15 * u, 2 * u, 6 * u, skin);
    box(ctx, sx + (4 + wide) * u, y0 - 15 * u, 2 * u, 6 * u, skin);
  }

  drawFace(ctx, sx, y0 - 26 * u, u, opts.face, opts.helmet, opts.team);

  if (opts.bat) {
    ctx.save();
    ctx.translate(sx + (opts.hand === "L" ? 3 : -3) * u, y0 - 14 * u);
    const side = opts.hand === "L" ? -1 : 1;
    const base = side * 0.6;
    const through = (opts.swing || 0) * side * (opts.shotSide || 1) * 1.5;
    ctx.rotate(base - through);
    box(ctx, -u * 0.7, -2 * u, 1.4 * u, 6 * u, "#f6e2b8");
    box(ctx, -1.5 * u, -14 * u, 3 * u, 12 * u, "#f3d7a0");
    box(ctx, -1.7 * u, -14 * u, 3.4 * u, 2 * u, "#e7c88a");
    ctx.restore();
  }
}

function lengthColor(length) {
  if (length < 1.7) return "#ff5a4a";
  if (length < 3.6) return "#ff9a3c";
  if (length < 6.6) return "#7CDB4A";
  if (length < 9.6) return "#ffe14a";
  return "#c084fc";
}

function drawMarker(ctx, cam, line, length) {
  const y = PITCH_LEN - length;
  const p = project(line, y, 0, cam);
  const s = Math.max(3, p.scale * 10);
  const col = lengthColor(length);
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.strokeRect(p.sx - s, p.sy - s * 0.45, s * 2, s * 0.9);
  box(ctx, p.sx - 1, p.sy - 1, 3, 3, "#fff");
  // stump guides
  for (const x of [-0.12, 0.12]) {
    const a = project(x, y - 0.6, 0, cam);
    const b = project(x, y + 0.6, 0, cam);
    box(ctx, a.sx, Math.min(a.sy, b.sy), 1, Math.abs(b.sy - a.sy) || 1, "rgba(255,255,255,0.7)");
  }
}

function drawShotArrow(ctx, cam, angle, loft, time) {
  const rad = (angle * Math.PI) / 180;
  const dist = loft ? 11 : 7.5;
  const x2 = Math.sin(rad) * dist;
  const y2 = CONTACT_Y - Math.cos(rad) * dist;
  const a = project(0, CONTACT_Y, 0, cam);
  const b = project(x2, y2, loft ? 1.2 : 0, cam);
  ctx.strokeStyle = loft ? "#ffd34a" : "#fffaf0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  const lift = loft ? -18 : 0;
  ctx.quadraticCurveTo((a.sx + b.sx) / 2, (a.sy + b.sy) / 2 + lift, b.sx, b.sy + lift * 0.2);
  ctx.stroke();
  const pulse = 3 + Math.sin(time * 8) * 1;
  box(ctx, b.sx - pulse, b.sy - pulse, pulse * 2, pulse * 2, loft ? "#ffd34a" : "#fff");
}

function drawBallSprite(ctx, x, y, r) {
  box(ctx, x - r, y - r, r * 2, r * 2, "#e23a32");
  box(ctx, x - 1, y - r, 2, r * 2, "#f6f1e4");
  box(ctx, x - r, y - 1, r * 2, 2, "#b4231c");
}

function drawBall(ctx, sample, cam) {
  const shadow = project(sample.x, sample.y, 0, cam);
  const p = project(sample.x, sample.y, sample.z, cam);
  const r = Math.max(2, p.scale * 3.4);
  box(ctx, shadow.sx - r, shadow.sy, r * 2, Math.max(1, r * 0.4), "rgba(0,0,0,0.28)");
  drawBallSprite(ctx, p.sx, p.sy, r);
}

function drawRadar(ctx, G, camBall) {
  const cx = 430;
  const cy = 48;
  ctx.fillStyle = "rgba(8,20,16,0.72)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, 42, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d7ffe0";
  ctx.lineWidth = 1;
  ctx.stroke();
  // pitch
  box(ctx, cx - 2, cy - 16, 4, 32, "#e4c892");
  const slots = fieldPositions();
  for (const f of slots) {
    const x = cx + (f.x / GROUND.rx) * 40;
    const y = cy - ((f.y - 10) / GROUND.ry) * 26;
    box(ctx, x, y, 2, 2, f.id === "keeper" ? "#9ad" : "#ffe14a");
  }
  if (camBall) {
    const x = cx + (camBall.x / GROUND.rx) * 40;
    const y = cy - ((camBall.y - 10) / GROUND.ry) * 26;
    box(ctx, x - 1, y - 1, 3, 3, "#fff");
  }
  if (G.phase === "aim" || G.phase === "runup" || G.phase === "flight") {
    const ang = ((G.shotAngle || 0) * Math.PI) / 180;
    if (G.userBatting && G.phase !== "aim") {
      ctx.strokeStyle = G.shotLoft ? "#ffd34a" : "#fff";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + Math.sin(ang) * 18, cy - 10 + Math.cos(ang) * 16);
      ctx.stroke();
    }
  }
}

function drawMeter(ctx, pos) {
  const x = 14;
  const y = 78;
  const h = 110;
  box(ctx, x, y, 14, h, "#0c1c38");
  const bands = [
    [0, 0.12, "#e23b3b"],
    [0.12, 0.42, "#f09a3a"],
    [0.42, 0.64, "#ffe14a"],
    [0.64, 0.86, "#7CDB4A"],
    [0.86, 1, "#ffe14a"],
  ];
  for (const [a, b, c] of bands) {
    const y0 = y + h - b * h;
    const y1 = y + h - a * h;
    box(ctx, x + 2, y0, 10, y1 - y0, c);
  }
  const ny = y + h - pos * h;
  box(ctx, x - 3, ny - 2, 20, 4, "#fffaf0");
  drawText(ctx, "RELEASE", x + 7, y + h + 4, { scale: 1, align: "center", color: "#fffaf0" });
}

function drawTimingBar(ctx, G) {
  if (!G.preview || !G.userBatting) return;
  if (G.phase !== "flight") return;
  const contact = G.preview.atCrease.t / G.simRate;
  const windows = timingWindows(currentStriker(G.inn).batSkill);
  const span = 0.95;
  const x = 90;
  const y = 222;
  const w = 300;
  const h = 8;
  box(ctx, x, y, w, h, "#0c1c38");
  const toX = (delta) => x + ((delta + span * 0.65) / span) * w;
  const p0 = toX(-windows.good);
  const p1 = toX(windows.good);
  const a0 = toX(-windows.perfect);
  const a1 = toX(windows.perfect);
  box(ctx, p0, y, p1 - p0, h, "#f0c410");
  box(ctx, a0, y, a1 - a0, h, "#7CDB4A");
  const delta = G.phaseT - contact;
  const mx = toX(Math.max(-span * 0.65, Math.min(span * 0.35, delta)));
  box(ctx, mx - 1, y - 3, 3, h + 6, "#fff");
  drawText(ctx, "SWING", x + w + 8, y - 1, { scale: 1, color: "#fffaf0" });
}

function drawSixCut(ctx, G) {
  const t = 1.75 - G.sixCut;
  drawSky(ctx, G.time);
  box(ctx, 0, 36, 480, 200, "#607080");
  drawCrowdBand(ctx, 48, 16, 1, G.time, 1.4);
  drawCrowdBand(ctx, 130, 14, 1, G.time + 0.2, 1.1);
  const fall = Math.min(1, t / 0.55);
  const nest = Math.max(0, t - 0.55);
  const bx = 230 + Math.sin(t * 2) * 30;
  const by = 28 + fall * 130 + Math.sin(nest * 18) * Math.max(0, 8 - nest * 10);
  drawBallSprite(ctx, bx, by, 6);
  const pop = 1 + Math.max(0, 0.25 - t) * 6;
  ctx.save();
  ctx.translate(240, 120);
  ctx.scale(pop, pop);
  drawText(ctx, "SIX", 0, -20, { scale: 4, align: "center", color: "#ffd34a" });
  ctx.restore();
  drawText(ctx, "INTO THE CROWD", 240, 168, { scale: 2, align: "center", color: "#fffaf0" });
}

function bodyBox(d) {
  const hero = d.kind === "bat" || d.kind === "bowl" || d.kind === "keep";
  const u = spriteUnit(d.p.scale, hero);
  const w = 13 * u;
  const h = 28 * u;
  const x = d.p.sx;
  return { x, left: x - w / 2, right: x + w / 2, top: d.p.sy - h, bottom: d.p.sy, w };
}

function separateSprites(list) {
  const visible = list.filter(
    (d) => d.p.depth >= -0.2 && d.p.depth <= 1.15 && d.p.sy <= 310 && d.p.sy >= -30
  );
  const pinned = (d) => d.kind === "bat" || d.kind === "bowl" || d.chasing;
  for (const d of visible) d.nudge = 0;
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i];
        const b = visible[j];
        const A = bodyBox(a);
        const B = bodyBox(b);
        const overlapX = Math.min(A.right, B.right) - Math.max(A.left, B.left);
        const overlapY = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
        if (overlapX <= 3 || overlapY <= 4) continue;
        if (pinned(a) && pinned(b)) continue;
        const staged = (d) => d.kind === "bat" || d.kind === "bowl" || d.kind === "keep" || d.kind === "ump" || d.kind === "non";
        if (staged(a) || staged(b)) continue;
        const move = pinned(a) ? b : pinned(b) ? a : a.p.sy >= b.p.sy ? a : b;
        const stay = move === a ? b : a;
        const mx = move.p.sx;
        const sx = stay.p.sx;
        const prefer = move.kind === "ump" ? -1 : 1;
        const dir = mx === sx ? prefer : mx > sx ? 1 : -1;
        const push = Math.min(overlapX + 3, 14);
        const next = (move.nudge || 0) + dir * push;
        const capped = Math.max(-64, Math.min(64, next));
        move.p.sx += capped - (move.nudge || 0);
        move.nudge = capped;
      }
    }
  }
}

function drawActors(ctx, G, cam) {
  const bowlTeam = G.inn ? G.inn.bowling : G.poster.bowling;
  const batTeam = G.inn ? G.inn.batting : G.poster.batting;
  const striker = G.inn ? currentStriker(G.inn) : G.poster.striker;
  const non = G.inn ? currentNon(G.inn) : G.poster.non;
  const bowler = G.inn ? currentBowler(G.inn) : G.poster.bowler;
  const keeper = (G.inn ? G.inn.bowling : G.poster.bowling).players.find((p) => p.role === "wk");
  const fly = Boolean(G.result && G.result.wicket && G.result.wicket.type === "bowled" && G.simT > G.preview.atCrease.t);

  drawStumps(ctx, PITCH_LEN, cam, fly && G.phase !== "aim");
  drawStumps(ctx, 0, cam, false);

  const slots = fieldPositions().filter((f) => f.id !== "bowler" && f.id !== "keeper");
  const fielders = bowlTeam.players.filter((p) => p.id !== bowler.id && p.role !== "wk");
  const drawList = [];

  slots.forEach((slot, i) => {
    const pl = fielders[i % fielders.length];
    let x = slot.x;
    let y = slot.y;
    if (G.ball && G.result && G.result.fielder === slot.label) {
      const k = Math.max(0, Math.min(1, (G.simT - (G.preview ? G.preview.atCrease.t : 0)) / 0.9));
      x += (G.ball.x - x) * k;
      y += (G.ball.y - y) * k;
    }
    const p = project(x, y, 0, cam);
    const chasing = Boolean(G.ball && G.result && G.result.fielder === slot.label);
    drawList.push({ y, p, pl, kind: "field", chasing });
  });

  const side = bowlingSide(G.inn ? G.inn.legalBalls : 0);
  const kp = project(side * 0.85, PITCH_LEN + 1.2, 0, cam);
  drawList.push({ y: PITCH_LEN + 1.2, p: kp, pl: keeper, kind: "keep" });

  const np = project(-side * 1.2, 1.05, 0, cam);
  drawList.push({ y: 1.05, p: np, pl: non, kind: "non" });

  const up = project(0, 0.15, 0, cam);
  drawList.push({ y: 0.15, p: up, pl: null, kind: "ump" });

  const running = G.phase === "runup" || G.phase === "flight" || G.phase === "celebrate";
  const bx = running && G.bowlerX != null ? G.bowlerX : side * 2.85;
  const by = running && G.bowlerY != null ? G.bowlerY : -2.4;
  const bp = project(bx, by, 0, cam);
  drawList.push({ y: by, p: bp, pl: bowler, kind: "bowl" });

  const sp = project(striker.hand === "L" ? -0.25 : 0.25, CONTACT_Y - 0.15, 0, cam);
  drawList.push({ y: CONTACT_Y, p: sp, pl: striker, kind: "bat" });

  drawList.sort((a, b) => a.y - b.y);
  separateSprites(drawList);
  for (const d of drawList) {
    if (d.p.depth < -0.2 || d.p.depth > 1.15 || d.p.sy > 310 || d.p.sy < -30) continue;
    const hero = d.kind === "bat" || d.kind === "bowl" || d.kind === "keep";
    if (d.kind === "ump") {
      drawUmpire(ctx, d.p.sx, d.p.sy, d.p.scale, G.time);
      continue;
    }
    const pose = poseFor(d.kind, G);
    const shotSide = (G.shotAngle || 0) >= 0 ? 1 : -1;
    drawCricketer(ctx, d.p.sx, d.p.sy, d.p.scale, {
      team: d.kind === "bat" || d.kind === "non" ? batTeam : bowlTeam,
      face: d.pl.face,
      pose,
      hand: d.pl.hand,
      helmet: d.kind === "bat" || d.kind === "keep" || d.kind === "non",
      pads: d.kind === "bat" || d.kind === "keep" || d.kind === "non",
      keeper: d.kind === "keep",
      bat: d.kind === "bat" || d.kind === "non",
      time: G.time,
      hero,
      arm: pose === "bowl" ? Math.max(0, (G.phaseT - 1.05) / 0.32) : 0,
      swing: d.kind === "bat" ? G.swing || 0 : 0,
      shotSide,
    });
  }
}

function poseFor(kind, G) {
  if (kind === "bowl") {
    if (G.phase === "runup" && G.phaseT < 1.2) return "bowlrun";
    if (G.phase === "runup" || (G.phase === "flight" && G.phaseT < 0.25)) return "bowl";
    if (G.result && G.result.wicket && G.phase === "celebrate") return "appeal";
    return "idle";
  }
  if (kind === "bat") {
    if ((G.swing || 0) > 0.05) return "bat";
    return "idle";
  }
  if (kind === "keep" && G.result && G.result.wicket) return "appeal";
  return "idle";
}

function drawUmpire(ctx, sx, sy, scale, time) {
  const u = spriteUnit(scale, false);
  const bob = Math.sin(time * 3) * u * 0.2;
  const y0 = sy + bob;
  box(ctx, sx - 5 * u, y0, 10 * u, u, "rgba(0,0,0,0.25)");
  box(ctx, sx - 2 * u, y0 - 8 * u, 2 * u, 8 * u, "#222");
  box(ctx, sx + u, y0 - 8 * u, 2 * u, 8 * u, "#222");
  box(ctx, sx - 4 * u, y0 - 16 * u, 8 * u, 9 * u, "#f7f7f7");
  box(ctx, sx - 4 * u, y0 - 24 * u, 8 * u, 8 * u, "#f3c7a4");
  box(ctx, sx - 5 * u, y0 - 27 * u, 10 * u, 4 * u, "#f7f7f7");
  box(ctx, sx - 2 * u, y0 - 20 * u, u, u, "#1a120c");
  box(ctx, sx + u, y0 - 20 * u, u, u, "#1a120c");
}

function drawTrail(ctx, G, cam) {
  const pts = G.trail || [];
  for (let i = 0; i < pts.length; i++) {
    const p = project(pts[i].x, pts[i].y, pts[i].z, cam);
    const a = (i + 1) / pts.length;
    box(ctx, p.sx, p.sy, Math.max(1, a * 3), Math.max(1, a * 2), `rgba(255,244,220,${a * 0.8})`);
  }
}

function drawFx(ctx, G, cam) {
  for (const p of G.fx) {
    const s = project(p.x, p.y, p.z, cam);
    const life = 1 - p.age / p.life;
    box(ctx, s.sx, s.sy, 2, 2, p.color);
    if (life < 0) continue;
  }
  for (const c of G.confetti) {
    box(ctx, c.x, c.y, 2, 2, c.color);
  }
}

function hudBar(ctx, y, h) {
  box(ctx, 0, y, 480, h, "#071833");
  box(ctx, 0, y, 480, 2, "#ffd34a");
}

function drawMatchHud(ctx, G) {
  const inn = G.inn;
  const bat = currentStriker(inn);
  const bowl = currentBowler(inn);
  const bStat = inn.batter[inn.striker];
  const bowlStat = inn.bowler[inn.bowlerIndex % inn.bowler.length];
  hudBar(ctx, 0, 16);
  const rr = runRate(inn.runs, inn.legalBalls);
  drawText(ctx, `${bat.short}  ${bStat.runs} (${bStat.balls})`, 8, 4, { scale: 1, color: "#fffaf0", shadow: false });
  const figs = `${bowl.short}  ${bowlStat.wickets}/${bowlStat.runs}`;
  drawText(ctx, figs, 472, 4, { scale: 1, align: "right", color: "#fffaf0", shadow: false });

  if (inn.freeHit) {
    drawText(ctx, "FREE HIT", 240, 20, { scale: 1, align: "center", color: "#ffd34a" });
  }

  hudBar(ctx, 246, 24);
  const score = `${inn.batting.short}  ${inn.runs}/${inn.wickets}`;
  drawText(ctx, score, 8, 250, { scale: 1, color: "#fffaf0", shadow: false });
  drawText(ctx, oversText(inn.legalBalls), 118, 250, { scale: 1, color: "#ffd34a", shadow: false });
  drawText(ctx, `RR ${rr.toFixed(1)}`, 160, 250, { scale: 1, color: "#fffaf0", shadow: false });
  const need = needText(inn, G.target);
  if (need) drawText(ctx, need, 472, 250, { scale: 1, align: "right", color: "#ffd34a", shadow: false });
  else drawText(ctx, inn.bowling.short, 472, 250, { scale: 1, align: "right", color: "#9fb4d4", shadow: false });

  // this over
  let ox = 8;
  const oy = 260;
  for (const pip of inn.thisOver.slice(-8)) {
    const col = pip === "W" ? "#ff5a4a" : pip === "6" || pip === "4" ? "#ffd34a" : "#fffaf0";
    drawText(ctx, pip, ox, oy, { scale: 1, color: col, shadow: false });
    ox += measure(pip, 1) + 6;
  }
  if (G.commentary) {
    drawText(ctx, G.commentary.slice(0, 42), 300, 260, { scale: 1, align: "right", color: "#d5e4ff", shadow: false });
  }

  if (G.phase === "aim" && !G.userBatting) {
    const label = `${lengthLabel(G.aimLength)}  ·  ${lineLabel(G.aimLine)}`;
    drawText(ctx, label, 240, 22, { scale: 1, align: "center", color: lengthColor(G.aimLength) });
    drawText(ctx, "ARROWS AIM    SPACE BOWLS", 240, 34, { scale: 1, align: "center", color: "#fffaf0" });
  }
  if (G.userBatting && (G.phase === "runup" || G.phase === "flight")) {
    const name = shotLabel(G.shotAngle, G.shotLoft, G.shotIntent);
    drawText(ctx, name, 240, 22, { scale: 1, align: "center", color: G.shotLoft ? "#ffd34a" : "#fffaf0" });
    if (G.phase === "runup") {
      drawText(ctx, "A D AIM    W LOFT    SPACE SWING", 240, 34, { scale: 1, align: "center", color: "#fffaf0" });
    }
  }
  if (G.toast) drawText(ctx, G.toast, 240, 36, { scale: 1, align: "center", color: "#fffaf0" });

  if (G.callout) {
    const age = G.callout.age;
    const pop = 1 + Math.max(0, 0.18 - age) * 5;
    ctx.save();
    ctx.translate(240, 120);
    ctx.scale(pop, pop);
    drawText(ctx, G.callout.text, 0, 0, { scale: 3, align: "center", color: G.callout.color });
    if (G.callout.sub) drawText(ctx, G.callout.sub, 0, 28, { scale: 1, align: "center", color: "#fffaf0" });
    ctx.restore();
  }

  if (G.phase === "runup" && !G.userBatting === false && !G.userBatting) {
    // user bowling meter
  }
  if (G.phase === "runup" && !G.userBatting) drawMeter(ctx, G.meterPos || 0);
  if (G.userBatting) drawTimingBar(ctx, G);
  if (G.overNote) drawText(ctx, G.overNote, 240, 100, { scale: 2, align: "center", color: "#ffd34a" });
  if (G.showCard) drawScorecard(ctx, G);
  if (G.paused) {
    box(ctx, 0, 0, 480, 270, "rgba(4,10,20,0.45)");
    drawText(ctx, "PAUSED", 240, 108, { scale: 3, align: "center", color: "#fffaf0" });
    drawText(ctx, "Q  QUIT TO MENU", 240, 140, { scale: 1, align: "center", color: "#ffd34a" });
  }
}

function shotLabel(angle, loft, intent) {
  if (intent === "defend" && !loft) return "DEFEND";
  const a = angle;
  if (Math.abs(a) < 18 && loft) return "LOFT STRAIGHT";
  if (Math.abs(a) < 18) return "STRAIGHT DRIVE";
  if (a >= 18 && a < 70 && loft) return "LOFT COVER";
  if (a >= 18 && a < 70) return "COVER DRIVE";
  if (a >= 70 && a < 120) return loft ? "SLASH" : "CUT";
  if (a >= 120) return "LATE CUT";
  if (a <= -18 && a > -70 && loft) return "LOFT MIDWICKET";
  if (a <= -18 && a > -70) return "FLICK";
  if (a <= -70 && a > -120) return loft ? "HOOK" : "PULL";
  return loft ? "RAMP" : "GLANCE";
}

function drawScorecard(ctx, G) {
  box(ctx, 36, 28, 408, 200, "rgba(7,24,51,0.94)");
  box(ctx, 36, 28, 408, 2, "#ffd34a");
  const inn = G.cardInn || G.inn;
  drawText(ctx, `${inn.batting.name}  ${inn.runs}/${inn.wickets}`, 48, 36, { scale: 1, color: "#ffd34a" });
  inn.batter.forEach((b, i) => {
    if (i > 7 && !b.out && b.balls === 0 && b.runs === 0) return;
    const y = 50 + i * 10;
    if (y > 200) return;
    const mark = b.out ? b.how : b.balls || b.runs ? "not out" : "";
    drawText(ctx, b.name, 48, y, { scale: 1, color: "#fffaf0", shadow: false });
    drawText(ctx, mark, 200, y, { scale: 1, color: "#9fb4d4", shadow: false });
    drawText(ctx, String(b.runs), 400, y, { scale: 1, align: "right", color: "#fffaf0", shadow: false });
    drawText(ctx, `(${b.balls})`, 430, y, { scale: 1, align: "right", color: "#9fb4d4", shadow: false });
  });
  drawText(ctx, "C CLOSE", 240, 214, { scale: 1, align: "center", color: "#ffd34a", shadow: false });
}

function drawButton(ctx, rect, label, opts) {
  box(ctx, rect.x, rect.y, rect.w, rect.h, opts.fill);
  box(ctx, rect.x, rect.y, rect.w, 2, opts.edge || "#ffd34a");
  box(ctx, rect.x, rect.y + rect.h - 2, rect.w, 2, "rgba(0,0,0,0.35)");
  if (opts.hot) {
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
  }
  drawText(ctx, label, rect.x + rect.w / 2, rect.y + Math.floor((rect.h - 7 * (opts.scale || 1)) / 2), {
    scale: opts.scale || 1,
    align: "center",
    color: opts.color || "#fffaf0",
    shadow: false,
  });
}

export function layout(G) {
  switch (G.screen) {
    case "title":
      return [
        { id: "play", x: 150, y: 214, w: 180, h: 22 },
        { id: "how", x: 170, y: 240, w: 140, h: 16 },
      ];
    case "how":
      return [
        { id: "back", x: 16, y: 228, w: 80, h: 18 },
        { id: "play", x: 250, y: 226, w: 200, h: 22 },
      ];
    case "pick":
    case "opponent":
      return [
        { id: "ind", x: 16, y: 46, w: 146, h: 170 },
        { id: "aus", x: 167, y: 46, w: 146, h: 170 },
        { id: "eng", x: 318, y: 46, w: 146, h: 170 },
        { id: "back", x: 16, y: 228, w: 70, h: 18 },
        { id: "next", x: 330, y: 226, w: 134, h: 22 },
      ];
    case "toss":
      if (!G.toss || G.toss.phase === "pick") {
        return [
          { id: "heads", x: 78, y: 176, w: 140, h: 28 },
          { id: "tails", x: 262, y: 176, w: 140, h: 28 },
        ];
      }
      if (G.toss.phase === "choose") {
        return [
          { id: "bat", x: 70, y: 180, w: 150, h: 32 },
          { id: "bowl", x: 260, y: 180, w: 150, h: 32 },
        ];
      }
      if (G.toss.phase === "cpu") return [{ id: "start", x: 150, y: 196, w: 180, h: 26 }];
      return [];
    case "break":
      return [{ id: "chase", x: 130, y: 200, w: 220, h: 28 }];
    case "result":
      return [{ id: "again", x: 150, y: 220, w: 180, h: 24 }];
    default:
      return [];
  }
}

function teamCard(ctx, team, rect, selected, disabled) {
  box(ctx, rect.x, rect.y, rect.w, rect.h, disabled ? "#1c2636" : "#10243f");
  box(ctx, rect.x, rect.y, rect.w, 28, team.jersey);
  box(ctx, rect.x, rect.y + 28, rect.w, 3, team.accent);
  if (selected) {
    ctx.strokeStyle = "#ffd34a";
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  }
  drawText(ctx, team.short, rect.x + rect.w / 2, rect.y + 8, {
    scale: 2,
    align: "center",
    color: team.id === "aus" ? "#1a1208" : "#fffaf0",
    shadow: false,
  });
  drawText(ctx, team.name, rect.x + 8, rect.y + 36, { scale: 1, color: "#fffaf0", shadow: false });
  team.players.slice(0, 6).forEach((p, i) => {
    drawText(ctx, p.short, rect.x + 8, rect.y + 52 + i * 12, { scale: 1, color: "#d5e4ff", shadow: false });
  });
  const star = team.players[team.id === "ind" ? 1 : team.id === "aus" ? 2 : 3];
  drawCricketer(ctx, rect.x + 108, rect.y + 158, 1.35, {
    team,
    face: star.face,
    pose: "idle",
    hand: star.hand,
    helmet: true,
    pads: true,
    bat: true,
    time: 0,
    swing: 0,
    shotSide: 1,
  });
}

export function render(ctx, G) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 480, 270);
  const shakeX = G.shake ? (Math.random() - 0.5) * G.shake : 0;
  const shakeY = G.shake ? (Math.random() - 0.5) * G.shake : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  if (G.sixCut > 0 && G.screen === "match") {
    drawSixCut(ctx, G);
    drawMatchHud(ctx, G);
    ctx.restore();
    return;
  }

  const cam = G.cam;
  drawSky(ctx, G.time);
  drawStands(ctx, G);
  drawGround(ctx, cam);
  drawPitch(ctx, cam);

  if (G.screen === "match" && G.phase === "aim" && !G.userBatting) drawMarker(ctx, cam, G.aimLine, G.aimLength);
  if (G.screen === "match" && G.userBatting && (G.phase === "runup" || G.phase === "flight") && !G.result) {
    drawShotArrow(ctx, cam, G.shotAngle, G.shotLoft, G.time);
  }

  if (G.screen === "match" || G.screen === "title" || G.screen === "toss" || G.screen === "break" || G.screen === "result") {
    if (G.inn || G.poster) drawActors(ctx, G, cam);
  }
  drawTrail(ctx, G, cam);
  if (G.ball && G.phase !== "aim") drawBall(ctx, G.ball, cam);
  else if (G.screen !== "match") {
    // ball in bowler's hand-ish, skip
  }
  drawFx(ctx, G, cam);

  if (G.crowd > 0.45 && G.result && G.result.boundary === "6") {
    // near stand hint while the ball is still in frame
  }

  ctx.restore();

  if (G.screen === "match") {
    drawRadar(ctx, G, G.ball);
    drawMatchHud(ctx, G);
    return;
  }

  // dimmer for menus so text reads
  if (G.screen !== "title") {
    box(ctx, 0, 0, 480, 270, "rgba(6,16,32,0.55)");
  }

  const spots = layout(G);
  const hot = G.hover;
  if (G.screen === "title") {
    drawText(ctx, "CRICKET 07", 240, 10, { scale: 3, align: "center", color: "#fffaf0" });
    drawText(ctx, "FIVE-OVER CUP", 240, 40, { scale: 1, align: "center", color: "#ffd34a" });
    drawButton(ctx, spots[0], "PLAY", { fill: "#1f4fd0", hot: hot === "play", scale: 2 });
    drawButton(ctx, spots[1], "HOW TO PLAY", { fill: "#16325c", hot: hot === "how" });
  } else if (G.screen === "how") {
    drawText(ctx, "HOW TO PLAY", 240, 16, { scale: 2, align: "center", color: "#ffd34a" });
    const lines = [
      "BOWLING",
      "ARROWS MOVE THE PITCH MARKER",
      "UP IS FULLER, DOWN IS SHORTER",
      "LEFT IS OFF, RIGHT IS LEG",
      "SPACE STARTS THE RUN UP",
      "RELEASE IN THE GREEN",
      "RED AT THE BOTTOM IS A NO BALL",
      "",
      "BATTING",
      "POINT WITH THE MOUSE OR A AND D",
      "W TOGGLES A LOFTED SHOT",
      "S IS A DEFENSIVE BLOCK",
      "SPACE WHEN THE MARKER HITS GREEN",
      "LEAVE A WIDE ONE ALONE",
      "",
      "YORKERS, BOUNCERS, EDGES, CATCHES",
      "LBW AND THE CROWD ARE ALL LIVE",
    ];
    lines.forEach((ln, i) => {
      const color = ln === "BOWLING" || ln === "BATTING" ? "#ffd34a" : "#fffaf0";
      drawText(ctx, ln, 36, 40 + i * 10, { scale: 1, color, shadow: false });
    });
    drawButton(ctx, spots[0], "BACK", { fill: "#16325c", hot: hot === "back" });
    drawButton(ctx, spots[1], "PICK A SIDE", { fill: "#1f4fd0", hot: hot === "play", scale: 1 });
  } else if (G.screen === "pick" || G.screen === "opponent") {
    drawText(ctx, G.screen === "pick" ? "PICK YOUR SIDE" : "PICK THE OPPONENT", 240, 16, {
      scale: 2,
      align: "center",
      color: "#ffd34a",
    });
    for (const id of ["ind", "aus", "eng"]) {
      const rect = spots.find((s) => s.id === id);
      const team = G.teams.find((t) => t.id === id);
      const disabled = G.screen === "opponent" && id === G.userId;
      const selected = (G.screen === "pick" ? G.userId : G.cpuId) === id && !disabled;
      teamCard(ctx, team, rect, selected, disabled);
    }
    drawButton(ctx, spots.find((s) => s.id === "back"), "BACK", { fill: "#16325c", hot: hot === "back" });
    const next = spots.find((s) => s.id === "next");
    const ready = G.screen === "pick" ? G.userId : G.cpuId && G.cpuId !== G.userId;
    if (ready) drawButton(ctx, next, G.screen === "pick" ? "OPPONENT" : "TOSS", { fill: "#1f4fd0", hot: hot === "next" });
  } else if (G.screen === "toss") {
    drawText(ctx, "THE TOSS", 240, 24, { scale: 2, align: "center", color: "#ffd34a" });
    const user = G.teams.find((t) => t.id === G.userId);
    const cpu = G.teams.find((t) => t.id === G.cpuId);
    drawText(ctx, `${user.short} VS ${cpu.short}`, 240, 48, { scale: 2, align: "center", color: "#fffaf0" });
    drawCoin(ctx, G);
    if (!G.toss || G.toss.phase === "pick") {
      drawText(ctx, "CALL IT", 240, 156, { scale: 1, align: "center", color: "#d5e4ff" });
      drawButton(ctx, spots[0], "HEADS", { fill: user.jersey, color: user.id === "aus" ? "#1a1208" : "#fff", hot: hot === "heads", scale: 2 });
      drawButton(ctx, spots[1], "TAILS", { fill: cpu.jersey, color: cpu.id === "aus" ? "#1a1208" : "#fff", hot: hot === "tails", scale: 2 });
    } else if (G.toss.phase === "choose") {
      drawText(ctx, "YOU WON THE TOSS", 240, 150, { scale: 1, align: "center", color: "#ffd34a" });
      drawButton(ctx, spots[0], "BAT", { fill: "#1f4fd0", hot: hot === "bat", scale: 2 });
      drawButton(ctx, spots[1], "BOWL", { fill: "#0e6b32", hot: hot === "bowl", scale: 2 });
    } else if (G.toss.phase === "cpu") {
      drawText(ctx, G.toss.blurb, 240, 156, { scale: 1, align: "center", color: "#fffaf0" });
      drawButton(ctx, spots[0], "PLAY", { fill: "#1f4fd0", hot: hot === "start", scale: 2 });
    } else if (G.toss.phase === "spin") {
      drawText(ctx, "FLIPPING", 240, 168, { scale: 1, align: "center", color: "#fffaf0" });
    }
  } else if (G.screen === "break") {
    const first = G.first;
    drawText(ctx, "INNINGS BREAK", 240, 48, { scale: 2, align: "center", color: "#ffd34a" });
    drawText(ctx, `${first.batting.short}  ${first.runs}/${first.wickets}`, 240, 84, { scale: 3, align: "center", color: "#fffaf0" });
    drawText(ctx, `${first.overs} OVERS`, 240, 114, { scale: 1, align: "center", color: "#d5e4ff" });
    drawText(ctx, `${G.inn.batting.name} NEED ${G.target}`, 240, 146, { scale: 1, align: "center", color: "#ffd34a" });
    drawButton(ctx, spots[0], G.userBatting ? "START THE CHASE" : "BOWL AT THEM", {
      fill: "#1f4fd0",
      hot: hot === "chase",
      scale: 1,
    });
  } else if (G.screen === "result") {
    drawText(ctx, G.resultInfo.title, 240, 36, { scale: 2, align: "center", color: "#ffd34a" });
    drawText(ctx, G.resultInfo.line, 240, 64, { scale: 1, align: "center", color: "#fffaf0" });
    drawText(ctx, G.resultInfo.scores, 240, 84, { scale: 1, align: "center", color: "#d5e4ff" });
    drawText(ctx, `PLAYER  ${G.resultInfo.motm}`, 240, 110, { scale: 1, align: "center", color: "#ffd34a" });
    // mini card of the chase or the bigger innings
    const show = G.resultInfo.card;
    show.batter.slice(0, 6).forEach((b, i) => {
      const y = 128 + i * 12;
      drawText(ctx, `${b.name}  ${b.out ? b.how : b.balls ? "not out" : ""}`, 70, y, { scale: 1, color: "#fffaf0", shadow: false });
      drawText(ctx, String(b.runs), 400, y, { scale: 1, align: "right", color: "#ffd34a", shadow: false });
    });
    drawButton(ctx, spots[0], "PLAY AGAIN", { fill: "#1f4fd0", hot: hot === "again", scale: 1 });
  }
}

function drawCoin(ctx, G) {
  const spin = G.toss && G.toss.phase === "spin" ? G.toss.t : 0;
  const squash = G.toss && G.toss.phase === "spin" ? Math.abs(Math.cos(spin * 18)) : 1;
  const showHeads = G.toss && G.toss.phase !== "spin" && G.toss.phase !== "pick" ? G.toss.result === "heads" : Math.cos(spin * 18) >= 0;
  ctx.save();
  ctx.translate(240, 112);
  ctx.scale(squash, 1);
  box(ctx, -18, -18, 36, 36, "#f0c410");
  box(ctx, -14, -14, 28, 28, showHeads ? "#fff4c2" : "#e0b000");
  ctx.restore();
  drawText(ctx, showHeads ? "H" : "T", 240, 104, { scale: 2, align: "center", color: "#1a1208", shadow: false });
}

export function pointIn(rect, x, y) {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h;
}
