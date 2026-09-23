// ============================================================================
// "Opus 5.5 Discovers Cricket" v2 — sketchbook-style animation with a
// scrolling world, a smaller hand-drawn character, and minimal text.
// Pure renderFrame(t) — every frame is a deterministic function of time.
// ============================================================================

const W = 1920, H = 1080;
const GROUND_Y = 800;
const PAPER = '#f1ecdf';      // park / "fairground" paper tone
const PITCH_PAPER = '#dfe8c4'; // the world warms into this soft green once Opus reaches the cricket ground
const CELEBRATION_PAPER = '#efe3a8'; // and glows warm gold once the six lands
const INK = '#3a3230';        // foreground ink (character, props)
const INK_FAR = '#aba497';    // background line-art ink (tent, wheel, crowd)
const OPUS_COLOR = '#DA7756';
const OPUS_SHADE = '#b85f3f'; // hatch-line shade on the character
const DURATION = 23.0;

const FOCUS_X = 680;          // screen-x the camera keeps its subject at
const OPUS_SCALE = 0.85;      // character is ~27% of frame height (was 1.32)
const PROP_SCALE = 0.65;      // ball/bat/stumps scaled down to match

// world-space landmark positions (px)
const WORLD = {
  treeXs: [90, 320, 560, 800, 990],
  benchX: 460,
  lampX: 700,
  ballDiscoverFrom: 1330, ballDiscoverTo: 1010,
  pavilionX: 1400,
  scoreboardX: 1620,
  batLyingX: 1750,
  stumpsX: 1810,
  creaseX: 2070,
  bowlerX: 2500,
  boundaryFlagX: 2750,
  crowdX: 3000,
  ferrisX: 3260,
  sixLandX: 3200,
};

// ---------------------------------------------------------------------------
// deterministic PRNG
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(...vals) {
  let h = 2166136261;
  for (const v of vals) {
    const s = String(v);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// math helpers
// ---------------------------------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const segT = (t, t0, t1) => clamp((t - t0) / (t1 - t0), 0, 1);
const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const smoothstep = t => { const c = clamp(t, 0, 1); return c * c * (3 - 2 * c); };
function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixRgb(a, b, t) { return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))]; }
function rgbStr(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }
function fadeFactor(t, start, end, fade = 0.35) {
  const inF = clamp((t - start) / fade, 0, 1);
  const outF = clamp((end - t) / fade, 0, 1);
  return Math.min(inF, outF, 1);
}

// ---------------------------------------------------------------------------
// point-set helpers
// ---------------------------------------------------------------------------
function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function roundRectPts(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return [
    [x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r],
    [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r],
  ];
}
function circlePts(cx, cy, r, segments = 24) {
  const pts = [];
  for (let i = 0; i < segments; i++) { const a = (i / segments) * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
}
function arcPts(cx, cy, r, a0, a1, segments = 8) {
  const pts = [];
  for (let i = 0; i <= segments; i++) { const a = a0 + (a1 - a0) * (i / segments); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
}
function polylineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}

// ---------------------------------------------------------------------------
// sketchy stroke primitive — jittered, with progressive "draw-on" support
// ---------------------------------------------------------------------------
function sketchPolyline(ctx, points, opts = {}) {
  const { seed = 0, rough = 1.5, passes = 2, color = INK, width = 3, alpha = 1, progress = 1, closed = false } = opts;
  let pts = points;
  if (closed) pts = [...points, points[0]];
  const total = polylineLength(pts);
  const targetLen = total * clamp(progress, 0, 1);
  let acc = 0;
  const trimmed = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const segLen = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + segLen <= targetLen) { trimmed.push(pts[i]); acc += segLen; }
    else {
      const remain = targetLen - acc;
      const tt = segLen > 0 ? remain / segLen : 0;
      trimmed.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * tt, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * tt]);
      break;
    }
  }
  if (trimmed.length < 2) return;
  const rng = mulberry32(seed);
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = alpha;
  for (let p = 0; p < passes; p++) {
    ctx.beginPath();
    for (let i = 0; i < trimmed.length; i++) {
      const [x, y] = trimmed[i];
      const edge = (i === 0 || i === trimmed.length - 1) ? 0.4 : 1;
      const jx = x + (rng() - 0.5) * rough * 2 * edge;
      const jy = y + (rng() - 0.5) * rough * 2 * edge;
      if (i === 0) ctx.moveTo(jx, jy); else ctx.lineTo(jx, jy);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function sketchLineSeg(ctx, x1, y1, x2, y2, opts) { sketchPolyline(ctx, [[x1, y1], [x2, y2]], opts); }

function fillPolyPath(ctx, pts, style, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = style;
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// pencil-hatch fill, clipped to an arbitrary closed polygon (never combined
// with fillText — see sketchText note below for why)
function hatchFill(ctx, pts, opts = {}) {
  const { seed = 0, gap = 8, angle = 0.6, color = INK, alpha = 0.35, width = 2 } = opts;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  pts.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
  ctx.save();
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath();
  ctx.clip();
  const w = maxX - minX, h = maxY - minY;
  const diag = Math.hypot(w, h) + gap;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const rng = mulberry32(seed);
  for (let d = -diag; d < diag; d += gap) {
    const jitter = (rng() - 0.5) * 2;
    const x1 = cx + cos * d - sin * diag + jitter, y1 = cy + sin * d + cos * diag;
    const x2 = cx + cos * d + sin * diag + jitter, y2 = cy + sin * d - cos * diag;
    sketchLineSeg(ctx, x1, y1, x2, y2, { seed: seed + d * 7, rough: 1, passes: 1, color, width, alpha });
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// hand-lettered text with a wobbly left-to-right "draw on" reveal
//
// NB: this renders the full text to an offscreen canvas and reveals it via
// drawImage strip-cropping rather than ctx.clip() + fillText() in the same
// pass — this headless Chromium build mirrors glyphs when fillText runs
// inside a tightly-fitted clip region, so the two operations are kept apart.
// ---------------------------------------------------------------------------
let _textCanvas = null, _textCtx = null;
function getTextLayer() {
  if (!_textCanvas) {
    _textCanvas = document.createElement('canvas');
    _textCanvas.width = W; _textCanvas.height = H;
    _textCtx = _textCanvas.getContext('2d');
  }
  return _textCtx;
}
function sketchText(ctx, text, x, y, opts = {}) {
  const { font = '40px "Chalkboard SE"', color = INK, align = 'left', progress = 1, seed = 0, jitter = 4 } = opts;
  const tctx = getTextLayer();
  tctx.clearRect(0, 0, W, H);
  tctx.font = font; tctx.textBaseline = 'alphabetic';
  const width = tctx.measureText(text).width;
  let startX = x;
  if (align === 'center') startX = x - width / 2;
  if (align === 'right') startX = x - width;
  tctx.fillStyle = color;
  tctx.fillText(text, startX, y);

  const revealW = width * clamp(progress, 0, 1) + 6;
  const rng = mulberry32(seed);
  const top = y - 55, bottom = y + 22, steps = 5;
  for (let i = 0; i < steps; i++) {
    const stripTop = top + ((bottom - top) * i) / steps;
    const stripH = (bottom - top) / steps;
    const w = clamp(revealW + (rng() - 0.5) * jitter * 2, 0, width + 40);
    const sx = startX - 14, sw = Math.max(0, w + 14);
    if (sw <= 0) continue;
    ctx.drawImage(_textCanvas, sx, stripTop, sw, stripH, sx, stripTop, sw, stripH);
  }
  return width;
}
// plain, non-reveal text (used where nothing needs to "draw on", e.g. the
// scoreboard digit) — still no clip involved, so it's immune to the bug above.
function plainText(ctx, text, x, y, opts = {}) {
  const { font = '40px "Chalkboard SE"', color = INK, align = 'left', alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// paper grain — generated once, blitted every frame
// ---------------------------------------------------------------------------
let _grainCanvas = null;
function getGrain() {
  if (_grainCanvas) return _grainCanvas;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const gctx = c.getContext('2d');
  const rng = mulberry32(4242);
  const img = gctx.createImageData(W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const speck = rng();
    const v = speck < 0.5 ? 40 : 250;
    const a = speck < 0.045 ? (14 + rng() * 26) : 0;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = a;
  }
  gctx.putImageData(img, 0, 0);
  _grainCanvas = c;
  return c;
}
// the world shifts palette twice: cream park -> soft cricket-green once Opus
// reaches the ground, then a warm gold once the six lands — two colour beats
// instead of one flat tone for the whole runtime.
const PITCH_ZONE_START = 1000, PITCH_ZONE_END = 1500;
const PARK_RGB = hexToRgb(PAPER), PITCH_RGB = hexToRgb(PITCH_PAPER), CELEB_RGB = hexToRgb(CELEBRATION_PAPER);
const SIX_IMPACT_T = 10.95;
function worldBgColor(fx, t = 0) {
  const zoneT = smoothstep(segT(fx, PITCH_ZONE_START, PITCH_ZONE_END));
  const base = mixRgb(PARK_RGB, PITCH_RGB, zoneT);
  const celebT = smoothstep(segT(t, SIX_IMPACT_T, SIX_IMPACT_T + 1.3));
  return rgbStr(mixRgb(base, CELEB_RGB, celebT));
}
function drawPaperBase(ctx, fx, t) {
  ctx.fillStyle = worldBgColor(fx, t);
  ctx.fillRect(0, 0, W, H);
}
// a quick full-frame flash for punchy impact moments (bat-on-ball, stumps)
function drawFlash(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(alpha, 0, 1); ctx.fillStyle = '#fffdf2'; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function drawGrainOverlay(ctx) {
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.drawImage(getGrain(), 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// camera / world-to-screen
// ---------------------------------------------------------------------------
// Opus stands put for the ball-discovery beat (the ball comes to it — no need
// to burn time walking before anything happens), then the walks are quick.
function opusWorldX(t) {
  if (t < 2.4) return WORLD.ballDiscoverTo - 90;
  if (t < 4.6) return lerp(WORLD.ballDiscoverTo - 90, WORLD.batLyingX, easeInOutCubic(segT(t, 2.4, 4.6)));
  if (t < 7.0) {
    if (t < 6.2) return WORLD.batLyingX;
    return lerp(WORLD.batLyingX, WORLD.creaseX, easeInOutCubic(segT(t, 6.2, 7.0)));
  }
  return WORLD.creaseX;
}
// during the six, the camera chases the ball instead of standing on Opus
function cameraFocusWorldX(t) {
  if (t >= 10.7 && t < 13.4) {
    const p = easeInOutCubic(segT(t, 10.7, 13.4));
    return lerp(WORLD.creaseX, WORLD.ferrisX - 60, p);
  }
  if (t >= 13.4 && t < 14.4) {
    const p = easeInOutCubic(segT(t, 13.4, 14.4));
    return lerp(WORLD.ferrisX - 60, opusWorldX(t), p);
  }
  return opusWorldX(t);
}
function toScreenX(worldX, focusWorldX, factor = 1) {
  return FOCUS_X + (worldX - focusWorldX) * factor;
}
const sixScored = t => t >= SIX_IMPACT_T;

// ---------------------------------------------------------------------------
// ground, shadows, grass
// ---------------------------------------------------------------------------
function drawShadow(ctx, sx, gy, w) {
  ctx.save();
  ctx.fillStyle = 'rgba(50,40,30,0.16)';
  ctx.beginPath(); ctx.ellipse(sx, gy + 6, w * 0.55, w * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawGroundLine(ctx) {
  sketchLineSeg(ctx, -20, GROUND_Y, W + 20, GROUND_Y, { seed: 1, rough: 2.5, passes: 2, color: INK, width: 3, alpha: 0.6 });
}
const GRASS_XS = (() => {
  const xs = []; const rng = mulberry32(777);
  for (let x = -200; x < 3500; x += 38) if (rng() > 0.5) xs.push(x + rng() * 10);
  return xs;
})();
function drawGrassTufts(ctx, fx) {
  for (const wx of GRASS_XS) {
    const sx = toScreenX(wx, fx);
    if (sx < -20 || sx > W + 20) continue;
    const rng = mulberry32(wx | 0);
    const h = 8 + rng() * 9;
    sketchPolyline(ctx, [[sx - 5, GROUND_Y + 3], [sx, GROUND_Y - h], [sx + 5, GROUND_Y + 3]],
      { seed: wx | 0, rough: 1, passes: 1, color: '#5b7a4a', width: 2, alpha: 0.65 });
  }
}

// ---------------------------------------------------------------------------
// far layer — sky, clouds, birds
// ---------------------------------------------------------------------------
function drawCloud(ctx, sx, sy, r, seed) {
  const puffs = [[-r * 0.6, 0], [0, -r * 0.3], [r * 0.6, 0], [r * 0.2, r * 0.15], [-r * 0.2, r * 0.15]];
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.6)';
  puffs.forEach(([ox, oy]) => { ctx.beginPath(); ctx.ellipse(sx + ox, sy + oy, r * 0.5, r * 0.36, 0, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
  sketchPolyline(ctx, circlePts(sx, sy, r * 0.75, 16), { seed, rough: 2, passes: 1, color: 'rgba(160,155,145,0.45)', width: 1.5, closed: true });
}
function drawBird(ctx, sx, sy, phase) {
  const flap = Math.sin(phase) * 7;
  sketchPolyline(ctx, [[sx - 13, sy + flap], [sx, sy - 4], [sx + 13, sy + flap]], { seed: Math.floor(phase * 10), rough: 1, passes: 1, color: INK_FAR, width: 2 });
}
function drawSky(ctx, fx, t) {
  for (let i = 0; i < 5; i++) {
    const worldX = i * 850 + 150;
    const sx = toScreenX(worldX, fx, 0.35) + Math.sin(t * 0.05 + i) * 15;
    const sy = 110 + (i % 3) * 45;
    if (sx < -160 || sx > W + 160) continue;
    drawCloud(ctx, sx, sy, 55 + (i % 2) * 22, 900 + i);
  }
  for (let i = 0; i < 3; i++) {
    const worldX = i * 640 + 300;
    const sx = toScreenX(worldX, fx, 0.35) + Math.sin(t * 2 + i) * 8;
    const sy = 80 + i * 36 + Math.sin(t * 1.3 + i) * 7;
    if (sx < -30 || sx > W + 30) continue;
    drawBird(ctx, sx, sy, t * 6 + i * 2);
  }
}

// ---------------------------------------------------------------------------
// park props
// ---------------------------------------------------------------------------
function drawTree(ctx, sx, gy, seed) {
  if (sx < -150 || sx > W + 150) return;
  const rng = mulberry32(seed);
  const trunkH = 55 + rng() * 18;
  const foliageR = 52 + rng() * 18;
  drawShadow(ctx, sx, gy, foliageR * 1.3);
  sketchLineSeg(ctx, sx, gy, sx, gy - trunkH, { seed, rough: 1.5, passes: 2, color: INK, width: 5 });
  const puffs = [[-foliageR * 0.5, -trunkH - foliageR * 0.35], [foliageR * 0.5, -trunkH - foliageR * 0.4], [0, -trunkH - foliageR * 0.85]];
  puffs.forEach(([ox, oy], i) => fillPolyPath(ctx, circlePts(sx + ox, gy + oy, foliageR * 0.62, 12), '#cfe0b3', 0.9));
  puffs.forEach(([ox, oy], i) => sketchPolyline(ctx, circlePts(sx + ox, gy + oy, foliageR * 0.62, 14), { seed: seed + i, rough: 2, passes: 1, color: INK, width: 2, closed: true }));
}
function drawBench(ctx, sx, gy) {
  if (sx < -80 || sx > W + 80) return;
  const w = 88, h = 34;
  sketchLineSeg(ctx, sx - w / 2, gy, sx - w / 2, gy - h * 0.5, { seed: 1, rough: 1, passes: 1, color: INK, width: 3 });
  sketchLineSeg(ctx, sx + w / 2, gy, sx + w / 2, gy - h * 0.5, { seed: 2, rough: 1, passes: 1, color: INK, width: 3 });
  sketchLineSeg(ctx, sx - w / 2 - 6, gy - h * 0.5, sx + w / 2 + 6, gy - h * 0.5, { seed: 3, rough: 1.5, passes: 2, color: INK, width: 4 });
  sketchLineSeg(ctx, sx - w / 2 - 6, gy - h, sx + w / 2 + 6, gy - h, { seed: 4, rough: 1.5, passes: 1, color: INK, width: 3 });
}
function drawLampPost(ctx, sx, gy) {
  if (sx < -40 || sx > W + 40) return;
  sketchLineSeg(ctx, sx, gy, sx, gy - 140, { seed: 5, rough: 1.2, passes: 2, color: INK, width: 4 });
  fillPolyPath(ctx, circlePts(sx, gy - 155, 13, 10), 'rgba(255,220,140,0.55)');
  sketchPolyline(ctx, circlePts(sx, gy - 155, 16, 12), { seed: 6, rough: 1.5, passes: 1, color: INK, width: 2.5, closed: true });
}

// ---------------------------------------------------------------------------
// cricket-ground props
// ---------------------------------------------------------------------------
function drawPavilion(ctx, sx, gy) {
  if (sx < -300 || sx > W + 300) return;
  const w = 250, h = 165, roofH = 105;
  const bodyPts = rectPts(sx - w / 2, gy - h, w, h);
  fillPolyPath(ctx, bodyPts, 'rgba(255,255,255,0.4)');
  sketchPolyline(ctx, bodyPts, { seed: hashSeed('pav', sx), rough: 1.5, passes: 1, color: INK_FAR, width: 2, closed: true });
  const roofPts = [[sx - w / 2 - 18, gy - h], [sx + w / 2 + 18, gy - h], [sx, gy - h - roofH]];
  fillPolyPath(ctx, roofPts, 'rgba(178,201,222,0.5)');
  sketchPolyline(ctx, roofPts, { seed: hashSeed('roof', sx), rough: 1.5, passes: 1, color: INK_FAR, width: 2, closed: true });
  sketchLineSeg(ctx, sx, gy - h - roofH, sx, gy - h - roofH - 46, { seed: 7, rough: 1, passes: 1, color: INK_FAR, width: 2 });
  fillPolyPath(ctx, [[sx, gy - h - roofH - 46], [sx + 26, gy - h - roofH - 39], [sx, gy - h - roofH - 32]], '#9fb8cc');
  // an arched doorway, echoing the reference tent
  sketchPolyline(ctx, arcPts(sx, gy - 8, 26, Math.PI, 2 * Math.PI, 8), { seed: 8, rough: 1, passes: 1, color: INK_FAR, width: 1.5 });
}
function drawScoreboard(ctx, sx, gy, digit) {
  if (sx < -80 || sx > W + 80) return;
  const w = 90, h = 66;
  sketchLineSeg(ctx, sx, gy, sx, gy - 40, { seed: 10, rough: 1, passes: 1, color: INK, width: 3 });
  const pts = roundRectPts(sx - w / 2, gy - 40 - h, w, h, 6);
  fillPolyPath(ctx, pts, 'rgba(255,255,255,0.85)');
  sketchPolyline(ctx, pts, { seed: 11, rough: 1.4, passes: 1, color: INK, width: 2.5, closed: true });
  plainText(ctx, digit, sx, gy - 40 - h / 2 + 14, { font: 'bold 40px "Chalkboard SE"', color: '#c0392b', align: 'center' });
}
function drawBoundaryFlag(ctx, sx, gy) {
  if (sx < -50 || sx > W + 50) return;
  sketchLineSeg(ctx, sx, gy, sx, gy - 88, { seed: hashSeed('flagpole', sx), rough: 1.2, passes: 1, color: INK_FAR, width: 2 });
  fillPolyPath(ctx, [[sx, gy - 88], [sx + 24, gy - 79], [sx, gy - 70]], '#c0392b', 0.85);
}
function drawCrowdBlobs(ctx, sxCenter, gy, t) {
  for (let i = 0; i < 10; i++) {
    const sx = sxCenter + (i - 4.5) * 34;
    if (sx < -50 || sx > W + 50) continue;
    const excited = t >= 13.0 && t < 17.0;
    const bob = Math.sin(t * (excited ? 7 : 3) + i * 1.3) * (excited ? 10 : 3);
    const w = 26, h = 32;
    const colors = ['#DA7756', '#e8b98f', '#a9c6e0', '#c98f6b'];
    ctx.save(); ctx.fillStyle = colors[i % colors.length]; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.ellipse(sx, gy - h / 2 + bob, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    sketchPolyline(ctx, circlePts(sx, gy - h / 2 + bob, w / 2, 10), { seed: 600 + i, rough: 1, passes: 1, color: INK_FAR, width: 1.5, closed: true });
    ctx.save(); ctx.fillStyle = INK_FAR;
    ctx.beginPath(); ctx.arc(sx - 5, gy - h / 2 + bob - 3, 2, 0, Math.PI * 2); ctx.arc(sx + 5, gy - h / 2 + bob - 3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
function drawFerrisWheel(ctx, sx, gy, t) {
  if (sx < -400 || sx > W + 400) return;
  const r = 220, cy = gy - r - 10;
  sketchPolyline(ctx, circlePts(sx, cy, r, 32), { seed: 9001, rough: 1.5, passes: 1, color: INK_FAR, width: 2, closed: true });
  const spokes = 8, rot = t * 0.15;
  for (let i = 0; i < spokes; i++) {
    const a = rot + (i / spokes) * Math.PI * 2;
    const gx = sx + Math.cos(a) * r, gyy = cy + Math.sin(a) * r;
    sketchLineSeg(ctx, sx, cy, gx, gyy, { seed: 9010 + i, rough: 1, passes: 1, color: INK_FAR, width: 1.5 });
    const colors = ['#a9c6e0', '#e8b98f'];
    fillPolyPath(ctx, rectPts(gx - 13, gyy - 13, 26, 26), colors[i % 2], 0.8);
    sketchPolyline(ctx, rectPts(gx - 13, gyy - 13, 26, 26), { seed: 9020 + i, rough: 1, passes: 1, color: INK_FAR, width: 1.5, closed: true });
  }
}

// ---------------------------------------------------------------------------
// stumps
// ---------------------------------------------------------------------------
function drawStumps(ctx, sx, gy, opts = {}) {
  const { seed = 0, progress = 1, bailsOn = true, knockT = 0 } = opts;
  const stumpH = 110 * PROP_SCALE / 0.65, stumpW = 9, gap = 17;
  for (let i = 0; i < 3; i++) {
    const x = sx + (i - 1) * gap;
    const p = clamp(progress * 3 - i * 0.35, 0, 1);
    ctx.save();
    if (knockT > 0 && i === 1) { ctx.translate(x, gy); ctx.rotate(knockT * 1.1); ctx.translate(-x, -gy); }
    const h = stumpH * p;
    const pts = rectPts(x - stumpW / 2, gy - stumpH, stumpW, stumpH);
    fillPolyPath(ctx, rectPts(x - stumpW / 2, gy - h, stumpW, h), '#e3b877');
    if (p > 0.3) hatchFill(ctx, pts, { seed: seed + i, color: '#8a6a3a', alpha: 0.3, gap: 4, angle: 1.5 });
    sketchPolyline(ctx, pts, { seed: seed + i, rough: 1.3, passes: 2, color: '#5b3a1a', width: 2, progress: p });
    ctx.restore();
  }
  if (bailsOn && progress > 0.9 && knockT < 0.05) {
    sketchLineSeg(ctx, sx - gap - 6, gy - stumpH - 4, sx + gap + 6, gy - stumpH - 4, { seed: seed + 9, rough: 1, passes: 1, color: '#5b3a1a', width: 3 });
  }
  if (knockT > 0.05) {
    for (let i = 0; i < 2; i++) {
      const bx = sx + (i === 0 ? -gap : gap) + (i === 0 ? -22 : 22) * knockT;
      const by = gy - stumpH - 4 - knockT * 100 + knockT * knockT * 50;
      sketchLineSeg(ctx, bx - 11, by, bx + 11, by, { seed: seed + 20 + i, rough: 1.2, passes: 1, color: '#5b3a1a', width: 3, alpha: clamp(1 - knockT * 0.4, 0, 1) });
    }
  }
}

// ---------------------------------------------------------------------------
// bunting — screen-anchored, gently swaying
// ---------------------------------------------------------------------------
function drawBunting(ctx, t) {
  const y0 = 46, sagY = 34, count = 15, colors = ['#4f7fb0', '#e8dfc8'];
  const sway = Math.sin(t * 0.8) * 4;
  const pts = [];
  for (let i = 0; i <= count; i++) pts.push([(i / count) * W, y0 + Math.sin((i / count) * Math.PI) * sagY]);
  sketchPolyline(ctx, pts, { seed: 300, rough: 1, passes: 1, color: INK, width: 2 });
  for (let i = 0; i < count; i++) {
    const t0 = pts[i], t1 = pts[i + 1];
    const mx = (t0[0] + t1[0]) / 2, my = (t0[1] + t1[1]) / 2 + sway * 0.3;
    const flagW = 46, flagH = 56;
    const flagPts = [[mx - flagW / 2, my], [mx + flagW / 2, my], [mx, my + flagH]];
    fillPolyPath(ctx, flagPts, colors[i % 2], 0.9);
    sketchPolyline(ctx, flagPts, { seed: 310 + i, rough: 1, passes: 1, color: INK, width: 1.5, closed: true });
  }
}

// ---------------------------------------------------------------------------
// OPUS — the character (rounded, hatched, with cheeks + a mouth)
// local coordinate space 0..554 (matches the mascot's block proportions)
// ---------------------------------------------------------------------------
function drawEyeV2(ctx, ex, ey, ew, eh, o) {
  const { blink, lookX, lookY, mood, seed } = o;
  if (mood === 'happy' || mood === 'love') {
    sketchPolyline(ctx, [[ex - 3, ey + eh * 0.55], [ex + ew / 2, ey + eh * 0.12], [ex + ew + 3, ey + eh * 0.55]], { seed, rough: 1.5, passes: 2, color: INK, width: 5 });
    return;
  }
  const openH = Math.max(2, eh * (1 - blink * 0.94));
  const cx = ex + ew / 2, cy = ey + eh - openH / 2;
  const rx = ew / 2, ry = openH / 2;
  ctx.save(); ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(cx + lookX * 3, cy + lookY * 3, rx, Math.max(1.5, ry), 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (openH > eh * 0.3) {
    ctx.save(); ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx + lookX * 3 - rx * 0.32, cy + lookY * 3 - ry * 0.35, rx * 0.24, ry * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (mood === 'shocked') sketchLineSeg(ctx, ex - 3, ey - 12, ex + ew + 3, ey - 15, { seed: seed + 5, rough: 1.5, passes: 1, color: INK, width: 3 });
}
function drawBrow(ctx, ex, ey, ew, side, mood) {
  if (mood !== 'determined') return;
  const dx = side === 'L' ? 10 : -10;
  sketchLineSeg(ctx, ex - 4 + dx, ey - 6, ex + ew + 4 - dx, ey - 18, { seed: hashSeed('brow', side), rough: 1.2, passes: 1, color: INK, width: 4 });
}
function drawMouth(ctx, cx, cy, mood, seed) {
  if (mood === 'happy') sketchPolyline(ctx, arcPts(cx, cy - 4, 17, 0.25, Math.PI - 0.25, 8), { seed, rough: 1.5, passes: 2, color: INK, width: 4 });
  else if (mood === 'love') sketchPolyline(ctx, arcPts(cx, cy - 4, 14, 0.3, Math.PI - 0.3, 6), { seed, rough: 1.2, passes: 2, color: INK, width: 3 });
  else if (mood === 'shocked') { ctx.save(); ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(cx, cy, 9, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  else if (mood === 'confused') sketchPolyline(ctx, [[cx - 14, cy], [cx - 6, cy - 6], [cx + 2, cy + 5], [cx + 14, cy - 3]], { seed, rough: 1.2, passes: 1, color: INK, width: 3 });
  else sketchLineSeg(ctx, cx - 13, cy, cx + 13, cy, { seed, rough: 1.4, passes: 1, color: INK, width: 3 });
}
function drawCheek(ctx, cx, cy) {
  ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#e8877a';
  ctx.beginPath(); ctx.ellipse(cx, cy, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// cricket kit — worn once Opus has picked up the bat (see pose.geared)
const PAD_COLOR = '#f4f1e4', PAD_SHADE = '#d8d2bd';
const HELMET_COLOR = '#3d6d9e', HELMET_SHADE = '#274a6e';
function drawPad(ctx, legX, legW, seed) {
  const padX = legX - 5, padW = legW + 10, y0 = 402, y1 = 459;
  const pts = roundRectPts(padX, y0, padW, y1 - y0, 9);
  fillPolyPath(ctx, pts, PAD_COLOR);
  sketchPolyline(ctx, pts, { seed, rough: 1.3, passes: 2, color: INK, width: 2.2, closed: true });
  for (let i = 1; i < 4; i++) {
    const ly = y0 + ((y1 - y0) * i) / 4;
    sketchLineSeg(ctx, padX + 3, ly, padX + padW - 3, ly, { seed: seed + i, rough: 1, passes: 1, color: PAD_SHADE, width: 1.8 });
  }
  fillPolyPath(ctx, [[legX + legW / 2 - 3, y0 + 2], [legX + legW / 2 + 3, y0 + 2], [legX + legW / 2 + 3, y1 - 2], [legX + legW / 2 - 3, y1 - 2]], HELMET_COLOR, 0.75);
}
const GRILLE_COLOR = '#9099a3';
function drawHelmet(ctx, seed) {
  // sits on the crown, well clear of the brow line (~y177-195) so shocked /
  // determined eyebrows still read once Opus is geared up
  const domePts = roundRectPts(96, 68, 362, 88, 38);
  fillPolyPath(ctx, domePts, HELMET_COLOR);
  hatchFill(ctx, domePts, { seed, color: HELMET_SHADE, alpha: 0.3, gap: 7, angle: 0.6 });
  sketchPolyline(ctx, domePts, { seed, rough: 1.7, passes: 2, color: INK, width: 3, closed: true });

  // small mesh air vents near the crown sides
  [[152, 96, -0.3], [356, 96, 0.3]].forEach(([vx, vy, rot], i) => {
    ctx.save(); ctx.translate(vx, vy); ctx.rotate(rot);
    const ventPts = roundRectPts(-15, -7, 30, 14, 6);
    hatchFill(ctx, ventPts, { seed: seed + 10 + i, color: HELMET_SHADE, alpha: 0.6, gap: 4, angle: 0.9 });
    sketchPolyline(ctx, ventPts, { seed: seed + 10 + i, rough: 1, passes: 1, color: INK, width: 1.4, closed: true });
    ctx.restore();
  });

  // peak at the front
  fillPolyPath(ctx, [[150, 164], [340, 164], [356, 146], [134, 146]], HELMET_COLOR);
  sketchPolyline(ctx, [[150, 164], [340, 164], [356, 146], [134, 146]], { seed: seed + 1, rough: 1.4, passes: 1, color: INK, width: 2, closed: true });

  // ear/temple clips (the little fastener studs on the reference helmet)
  [140, 414].forEach((gx, i) => {
    fillPolyPath(ctx, circlePts(gx, 190, 9, 12), '#c9c9c9');
    sketchPolyline(ctx, circlePts(gx, 190, 9, 12), { seed: seed + 20 + i, rough: 1, passes: 1, color: INK, width: 1.6, closed: true });
    fillPolyPath(ctx, circlePts(gx, 190, 2.5, 8), INK);
  });

  // face grille — a curved metal cage hanging from the brim over the lower
  // face (nose/mouth/chin), well clear of the eyes so the expression reads
  const gTop = 262, gBot = 348, gTL = 150, gTR = 404, gBL = 188, gBR = 366;
  const griPts = [[gTL, gTop], [gTR, gTop], [gBR, gBot], [gBL, gBot]];
  sketchPolyline(ctx, griPts, { seed: seed + 30, rough: 1.3, passes: 2, color: INK, width: 2.5, closed: true });
  for (let i = 1; i < 4; i++) {
    const ty = gTop + ((gBot - gTop) * i) / 4;
    sketchLineSeg(ctx, lerp(gTL, gBL, i / 4), ty, lerp(gTR, gBR, i / 4), ty, { seed: seed + 31 + i, rough: 1, passes: 1, color: GRILLE_COLOR, width: 2.2 });
  }
  for (let i = 1; i < 4; i++) {
    sketchLineSeg(ctx, lerp(gTL, gTR, i / 4), gTop, lerp(gBL, gBR, i / 4), gBot, { seed: seed + 40 + i, rough: 1, passes: 1, color: GRILLE_COLOR, width: 2.2 });
  }
}

function drawOpus(ctx, o) {
  const {
    x, y, scale = 1, rotation = 0, squashX = 1, squashY = 1,
    armLAngle = 0, armRAngle = 0, legLift = 0, legPhase = 0, walking = false,
    blink = 0, lookX = 0, lookY = 0, mood = 'neutral', seed = 0, geared = false,
  } = o;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale * squashX, scale * squashY);
  ctx.translate(-277, -462);

  // --- legs ---
  const legDefs = [{ x: 104 }, { x: 173 }, { x: 346 }, { x: 415 }];
  const legW = 35, legY0 = 393, legY1 = 462;
  legDefs.forEach((leg, i) => {
    let lift = 0;
    if (walking) lift = Math.max(0, Math.sin(legPhase * Math.PI * 2 + i * Math.PI * 0.9)) * legLift;
    const h = (legY1 - legY0) - lift;
    const pts = roundRectPts(leg.x, legY0, legW, h, 6);
    fillPolyPath(ctx, pts, OPUS_COLOR);
    hatchFill(ctx, pts, { seed: seed + i * 3, color: OPUS_SHADE, alpha: 0.3, gap: 6, angle: 0.9 });
    sketchPolyline(ctx, pts, { seed: seed + i * 7 + 1, rough: 1.8, passes: 2, color: INK, width: 3, closed: true });
    if (geared) drawPad(ctx, leg.x, legW, seed + i * 3 + 40);
  });

  // --- arm stubs ---
  const armW = 69, armH = 66;
  ctx.save();
  ctx.translate(69, 288); ctx.rotate(armLAngle);
  { const pts = roundRectPts(-armW, -armH / 2, armW, armH, 14);
    fillPolyPath(ctx, pts, OPUS_COLOR);
    hatchFill(ctx, pts, { seed: seed + 11, color: OPUS_SHADE, alpha: 0.3, gap: 7, angle: 0.5 });
    sketchPolyline(ctx, pts, { seed: seed + 11, rough: 1.8, passes: 2, color: INK, width: 3, closed: true }); }
  ctx.restore();

  ctx.save();
  ctx.translate(485, 288); ctx.rotate(armRAngle);
  { const pts = roundRectPts(0, -armH / 2, armW, armH, 14);
    fillPolyPath(ctx, pts, OPUS_COLOR);
    hatchFill(ctx, pts, { seed: seed + 13, color: OPUS_SHADE, alpha: 0.3, gap: 7, angle: 0.5 });
    sketchPolyline(ctx, pts, { seed: seed + 13, rough: 1.8, passes: 2, color: INK, width: 3, closed: true }); }
  ctx.restore();

  // --- body ---
  const bodyPts = roundRectPts(69, 115, 416, 278, 34);
  fillPolyPath(ctx, bodyPts, OPUS_COLOR);
  hatchFill(ctx, bodyPts, { seed: seed + 3, color: OPUS_SHADE, alpha: 0.32, gap: 9, angle: 0.6 });
  sketchPolyline(ctx, bodyPts, { seed: seed + 3, rough: 2.2, passes: 2, color: INK, width: 4, closed: true });

  // --- face ---
  drawCheek(ctx, 118, 300);
  drawCheek(ctx, 436, 300);
  drawEyeV2(ctx, 152, 195, 34, 60, { blink, lookX, lookY, mood, seed: seed + 21 });
  drawEyeV2(ctx, 368, 195, 34, 60, { blink, lookX, lookY, mood, seed: seed + 22 });
  drawBrow(ctx, 152, 195, 34, 'L', mood);
  drawBrow(ctx, 368, 195, 34, 'R', mood);
  drawMouth(ctx, 277, 310, mood, seed + 30);
  if (geared) drawHelmet(ctx, seed + 60);

  ctx.restore();
}

// world-space hand position for the right stub, for attaching a bat
function opusRightHand(o) {
  const { x, y, scale = 1, rotation = 0, squashX = 1, squashY = 1, armRAngle = 0 } = o;
  const pivot = [485, 288], tip = [485 + 69, 288];
  const dx = tip[0] - pivot[0], dy = tip[1] - pivot[1];
  const ca = Math.cos(armRAngle), sa = Math.sin(armRAngle);
  const rx = pivot[0] + dx * ca - dy * sa, ry = pivot[1] + dx * sa + dy * ca;
  const lx = rx - 277, ly = ry - 462;
  const sx = lx * scale * squashX, sy = ly * scale * squashY;
  const cr = Math.cos(rotation), sr = Math.sin(rotation);
  return [x + sx * cr - sy * sr, y + sx * sr + sy * cr];
}

function blinkAmount(t) {
  const period = 3.4, dur = 0.16, phase = t % period;
  if (phase < dur) { const p = phase / dur; return p < 0.5 ? p * 2 : (1 - p) * 2; }
  return 0;
}

// ---------------------------------------------------------------------------
// props: ball, bat, emblems, speech bubble, confetti, impact star
// ---------------------------------------------------------------------------
function drawBall(ctx, cx, cy, r, opts = {}) {
  const { seed = 0, spin = 0, popT = 1 } = opts;
  const rr = r * easeOutBack(clamp(popT, 0, 1));
  if (rr <= 0) return;
  drawShadow(ctx, cx, GROUND_Y, rr * 1.6);
  ctx.save(); ctx.fillStyle = '#c0392b';
  ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  sketchPolyline(ctx, circlePts(cx, cy, rr, 20), { seed, rough: 1.3, passes: 2, color: '#5c1c14', width: 2.2, closed: true });
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin);
  sketchPolyline(ctx, arcPts(0, 0, rr * 0.85, -0.6, 0.6, 6), { seed: seed + 1, rough: 1, passes: 1, color: '#fbf7ee', width: 1.8 });
  sketchPolyline(ctx, arcPts(0, 0, rr * 0.85, Math.PI - 0.6, Math.PI + 0.6, 6), { seed: seed + 2, rough: 1, passes: 1, color: '#fbf7ee', width: 1.8 });
  ctx.restore();
}
function batShapePts(len = 165, bladeW = 44, handleW = 16, handleLen = 56) {
  const bladeLen = len - handleLen;
  return [
    [-handleW / 2, 0], [handleW / 2, 0], [handleW / 2, handleLen], [bladeW / 2, handleLen + bladeLen * 0.18],
    [bladeW / 2, handleLen + bladeLen], [-bladeW / 2, handleLen + bladeLen], [-bladeW / 2, handleLen + bladeLen * 0.18],
    [-handleW / 2, handleLen],
  ];
}
function drawBat(ctx, x, y, angle, opts = {}) {
  const { seed = 0, scale = 1, progress = 1 } = opts;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  const pts = batShapePts();
  if (progress > 0.15) {
    fillPolyPath(ctx, pts, '#e3b877', clamp((progress - 0.15) / 0.3, 0, 1));
    hatchFill(ctx, pts, { seed, color: '#8a6a3a', alpha: 0.28, gap: 5, angle: 1.4 });
  }
  sketchPolyline(ctx, pts, { seed, rough: 1.6, passes: 2, color: '#5b3a1a', width: 2.6, closed: true, progress });
  ctx.restore();
}
function drawEmblem(ctx, glyph, x, y, opts = {}) {
  const { progress = 1, scale = 1, color = INK, bold = true } = opts;
  const s = scale * easeOutBack(clamp(progress, 0, 1));
  if (s <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.font = `${bold ? 'bold ' : ''}44px "Chalkboard SE"`;
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 0, 0);
  ctx.restore();
}
function heartPts(size) {
  const s = size;
  return [[0, s * 0.35], [-s * 0.5, -s * 0.1], [-s * 0.22, -s * 0.55], [0, -s * 0.22], [s * 0.22, -s * 0.55], [s * 0.5, -s * 0.1], [0, s * 0.35]];
}
function drawHeart(ctx, x, y, opts = {}) {
  const { seed = 0, size = 22, progress = 1, color = '#c0392b' } = opts;
  if (progress <= 0) return;
  const s = easeOutBack(clamp(progress, 0, 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const pts = heartPts(size);
  if (progress > 0.3) fillPolyPath(ctx, pts, color);
  sketchPolyline(ctx, pts, { seed, rough: 1, passes: 2, color: '#7a1f14', width: 2 });
  ctx.restore();
}
function drawDiamond(ctx, x, y, size, rot, color, alpha) {
  const pts = [[0, -size], [size, 0], [0, size], [-size, 0]];
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  fillPolyPath(ctx, pts, color);
  ctx.restore();
}
function drawImpactStar(ctx, x, y, opts = {}) {
  const { seed = 0, r = 36, progress = 1, color = '#e8b93b' } = opts;
  if (progress <= 0 || progress >= 1) return;
  const spikes = 8, pts = [];
  for (let i = 0; i < spikes * 2; i++) { const a = (i / (spikes * 2)) * Math.PI * 2; pts.push([x + Math.cos(a) * (i % 2 === 0 ? r : r * 0.42), y + Math.sin(a) * (i % 2 === 0 ? r : r * 0.42)]); }
  ctx.save();
  ctx.globalAlpha = clamp(progress * 3, 0, 1) * clamp((1 - progress) * 2.5, 0, 1);
  fillPolyPath(ctx, pts, color);
  ctx.restore();
  sketchPolyline(ctx, pts, { seed, rough: 2, passes: 1, color: '#a5780a', width: 1.8, closed: true });
}
function drawConfettiMixed(ctx, cx, cy, tt) {
  const count = 24;
  for (let i = 0; i < count; i++) {
    const rng = mulberry32(9000 + i * 97);
    const ang = rng() * Math.PI * 2;
    const speed = 220 + rng() * 300;
    const x = cx + Math.cos(ang) * speed * tt;
    const y = Math.min(GROUND_Y - 4, cy + Math.sin(ang) * speed * tt * 0.6 + 230 * tt * tt);
    const size = 7 + rng() * 7;
    const rot = rng() * Math.PI * 2 + tt * 8;
    const alpha = clamp(1 - tt * 0.7, 0, 1);
    const kind = i % 3;
    if (kind === 0) drawHeart(ctx, x, y, { seed: i, size, progress: 1, color: '#c0392b' });
    else if (kind === 1) drawDiamond(ctx, x, y, size * 0.8, rot, '#4f7fb0', alpha);
    else { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha; ctx.fillStyle = '#e3b877'; ctx.fillRect(-size / 2, -size / 2, size, size); ctx.restore(); }
  }
}
function drawSpeechBubble(ctx, x, y, text, opts = {}) {
  const { progress = 1, seed = 0 } = opts;
  if (progress <= 0) return;
  const s = easeOutBack(clamp(Math.min(progress * 3, 1), 0, 1));
  const w = 190, h = 90;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y);
  const pts = roundRectPts(x - w / 2, y - h - 20, w, h, 20);
  fillPolyPath(ctx, pts, 'rgba(255,255,255,0.92)');
  sketchPolyline(ctx, pts, { seed, rough: 1.3, passes: 1, color: INK, width: 2.5, closed: true });
  const tail = [[x - 14, y - 22], [x + 10, y - 22], [x - 6, y - 2]];
  fillPolyPath(ctx, tail, 'rgba(255,255,255,0.92)');
  sketchPolyline(ctx, tail, { seed: seed + 1, rough: 1, passes: 1, color: INK, width: 2, closed: true });
  ctx.restore();
  if (progress > 0.35) sketchText(ctx, text, x, y - h / 2 - 8, { font: 'bold 42px "Chalkboard SE"', align: 'center', color: '#c0392b', progress: segT(progress, 0.35, 0.75), seed: seed + 2 });
}

// ---------------------------------------------------------------------------
// character pose timeline (local animation params only — world position and
// screen placement are handled separately by the camera system)
// ---------------------------------------------------------------------------
// Beat boundaries — tightened across the board so something is always
// underway; the old cut was 4.2/8.0/12.0/16.0/22.0/28.5, now compressed to
// give the opening real energy in the first couple of seconds.
const BEAT = { discover: 2.4, ground: 4.6, pickup: 7.0, miss: 10.0, six: 14.5, end: DURATION };
function getOpusPose(t) {
  const pose = {
    scale: OPUS_SCALE, rotation: 0, squashX: 1, squashY: 1,
    armLAngle: 0, armRAngle: -0.2, legLift: 10, legPhase: t * 3.0, walking: false,
    blink: blinkAmount(t), lookX: 0, lookY: 0, mood: 'neutral', seed: hashSeed('opus', Math.floor(t * 9)),
    geared: t >= BEAT.ground, // helmet + pads go on once the bat (and the rest of the kit) turns up
  };

  // BEAT 1: discover the ball (0 - 2.4) — Opus is already on screen and
  // alert; the ball rolls in almost immediately instead of after a walk
  if (t < BEAT.discover) {
    if (t < 1.0) { pose.lookX = Math.sin(t * 3) * 0.15; }
    else if (t < 1.3) {
      const p = segT(t, 1.0, 1.3);
      pose.rotation = lerp(0, 0.08, p);
      pose.lookX = lerp(0, 0.7, p); pose.lookY = lerp(0, 0.3, p);
    } else { pose.rotation = 0.08; pose.lookX = 0.7; pose.lookY = 0.3; }
  }
  // BEAT 2: quick walk to the ground, spot the bat (2.4 - 4.6)
  else if (t < BEAT.ground) {
    pose.rotation = 0.08 * (1 - segT(t, BEAT.discover, BEAT.discover + 0.4));
    pose.walking = true;
    pose.lookX = Math.sin(t * 2.2) * 0.3;
    if (t > BEAT.ground - 0.5) { pose.lookX = 0.5; pose.lookY = -0.15; }
  }
  // BEAT 3: pick up the bat upside down, flip it, hop, walk to the crease
  // (4.6 - 7.0) — the whole grab-flip-hop reads in under 1.6s
  else if (t < BEAT.pickup) {
    const lt = t - BEAT.ground;
    if (lt < 0.3) { pose.armRAngle = lerp(-0.2, -1.5, easeInOutCubic(segT(lt, 0.03, 0.3))); pose.lookX = 0.4; }
    else if (lt < 0.55) { pose.armRAngle = -1.5; pose.mood = 'confused'; }
    else if (lt < 0.9) { pose.armRAngle = lerp(-1.5, -0.9, segT(lt, 0.55, 0.9)); pose.mood = 'confused'; }
    else if (lt < 1.15) { pose.armRAngle = lerp(-0.9, -0.35, segT(lt, 0.9, 1.15)); pose.mood = 'happy'; }
    else if (lt < 1.6) {
      const p = segT(lt, 1.15, 1.6); pose.armRAngle = -0.35; pose.mood = 'happy';
      const hop = Math.sin(p * Math.PI); pose.squashY = 1 + hop * 0.16; pose.squashX = 1 - hop * 0.1;
    }
    else { pose.armRAngle = -0.35; pose.walking = true; pose.mood = 'neutral'; }
  }
  // BEAT 4: bowled, swing and miss (7.0 - 10.0)
  else if (t < BEAT.miss) {
    const lt = t - BEAT.pickup;
    if (lt < 0.2) pose.armRAngle = -0.2;
    else if (lt < 0.8) { pose.armRAngle = -0.2; pose.lookX = 0.7; }
    else if (lt < 1.1) pose.armRAngle = lerp(-0.2, 1.4, easeOutCubic(segT(lt, 0.8, 1.1)));
    else if (lt < 1.4) {
      pose.armRAngle = 1.4; pose.mood = 'shocked'; pose.lookX = -0.6; pose.lookY = -0.15;
      const p = segT(lt, 1.1, 1.3); pose.squashX = lerp(1, 1.15, p); pose.squashY = lerp(1, 0.87, p);
    }
    else { pose.armRAngle = 0.6; pose.mood = 'shocked'; pose.lookX = -0.6; pose.lookY = -0.15; }
  }
  // BEAT 5: determined, connects for six (10.0 - 14.5) — the delivery is
  // bowled almost immediately (see the matching timing in drawPropsForTime),
  // no dead wait before it arrives
  else if (t < BEAT.six) {
    const lt = t - BEAT.miss;
    if (lt < 0.2) { pose.armRAngle = lerp(0.6, -0.5, easeInOutCubic(segT(lt, 0, 0.2))); pose.mood = 'determined'; }
    else if (lt < 0.7) { pose.armRAngle = -0.5; pose.mood = 'determined'; pose.lookX = 0.7; }
    else if (lt < 0.95) pose.armRAngle = lerp(-0.5, 1.3, easeOutCubic(segT(lt, 0.7, 0.95)));
    else if (lt < 1.5) {
      const p = segT(lt, 0.95, 1.5); pose.armRAngle = lerp(1.3, 0.8, p); pose.mood = 'happy';
      const hop = Math.sin(p * Math.PI); pose.squashY = 1 + hop * 0.2; pose.squashX = 1 - hop * 0.12;
    }
    else { pose.armRAngle = 0.5; pose.mood = 'happy'; pose.lookX = 0.3; }
  }
  // BEAT 6: celebration + signature (14.5 - end)
  else {
    const lt = t - BEAT.six;
    pose.mood = lt > 2.6 ? 'love' : 'happy';
    pose.armRAngle = -0.3;
    pose.armLAngle = lt < 1.8 ? Math.sin(lt * 7) * 0.5 * clamp(lt / 0.25, 0, 1) : 0;
  }
  return pose;
}

// ---------------------------------------------------------------------------
// world assembly
// ---------------------------------------------------------------------------
function drawWorld(ctx, fx, t) {
  drawSky(ctx, fx, t);
  drawGroundLine(ctx);
  for (const tx of WORLD.treeXs) drawTree(ctx, toScreenX(tx, fx), GROUND_Y, hashSeed('tree', tx));
  drawBench(ctx, toScreenX(WORLD.benchX, fx), GROUND_Y);
  drawLampPost(ctx, toScreenX(WORLD.lampX, fx), GROUND_Y);
  drawPavilion(ctx, toScreenX(WORLD.pavilionX, fx), GROUND_Y);
  drawScoreboard(ctx, toScreenX(WORLD.scoreboardX, fx), GROUND_Y, sixScored(t) ? '6' : '0');
  drawBoundaryFlag(ctx, toScreenX(WORLD.boundaryFlagX, fx), GROUND_Y);
  drawCrowdBlobs(ctx, toScreenX(WORLD.crowdX, fx), GROUND_Y, t);
  drawFerrisWheel(ctx, toScreenX(WORLD.ferrisX, fx), GROUND_Y, t);
  drawGrassTufts(ctx, fx);
}

function drawStumpsLayer(ctx, fx, t) {
  const sx = toScreenX(WORLD.stumpsX, fx);
  if (t >= BEAT.ground + 1.6 && t < BEAT.pickup) drawStumps(ctx, sx, GROUND_Y, { seed: 300, progress: segT(t, BEAT.ground + 1.6, BEAT.pickup - 0.15) });
  else if (t >= BEAT.pickup && t < BEAT.miss) {
    const lt = t - BEAT.pickup;
    drawStumps(ctx, sx, GROUND_Y, { seed: 300, progress: 1, knockT: lt >= 1.1 ? clamp(segT(lt, 1.1, 1.6), 0, 1) : 0 });
  }
  else if (t >= BEAT.miss) drawStumps(ctx, sx, GROUND_Y, { seed: 301, progress: 1 });
}

// ---------------------------------------------------------------------------
// beat-specific props (ball, bat, emblems, speech bubble, confetti)
// ---------------------------------------------------------------------------
function drawPropsForTime(ctx, fx, t, fullPose) {
  const ballR = 30, batScale = 0.72;

  // BEAT 1: the ball rolls in fast, right from the start — nothing sits idle
  if (t < BEAT.discover) {
    if (t >= 0.1 && t < 0.85) {
      const p = easeOutCubic(segT(t, 0.1, 0.8));
      const wx = lerp(WORLD.ballDiscoverFrom, WORLD.ballDiscoverTo, p);
      const bob = Math.abs(Math.sin(p * 16)) * 7 * (1 - p);
      drawBall(ctx, toScreenX(wx, fx), GROUND_Y - ballR - bob, ballR, { seed: 100, spin: p * 20, popT: 1 });
    } else if (t >= 0.85) {
      drawBall(ctx, toScreenX(WORLD.ballDiscoverTo, fx), GROUND_Y - ballR, ballR, { seed: 100, spin: 20 });
    }
    if (t > 1.0 && t < 2.3) {
      const a = fadeFactor(t, 1.0, 2.3, 0.2);
      ctx.save(); ctx.globalAlpha = a;
      drawEmblem(ctx, '?', toScreenX(WORLD.ballDiscoverTo - 40, fx), GROUND_Y - 330, { progress: segT(t, 1.0, 1.25) });
      ctx.restore();
    }
  }

  // ball keeps sitting where it was discovered while Opus continues toward the ground
  if (t >= BEAT.discover && t < BEAT.ground) {
    drawBall(ctx, toScreenX(WORLD.ballDiscoverTo, fx), GROUND_Y - ballR, ballR, { seed: 100, spin: 20 });
  }

  // BEAT 2/3: the bat — it lies on the ground drawing itself on during the
  // walk, then during the reach (lt 0.03-0.3) it now visibly travels from the
  // ground into Opus's hand instead of popping straight into the held pose
  const groundBatX = toScreenX(WORLD.batLyingX, fx), groundBatY = GROUND_Y - 6;
  if (t >= 2.9 && t < BEAT.ground) {
    drawBat(ctx, groundBatX, groundBatY, -1.4, { seed: 200, progress: segT(t, 2.9, 3.8), scale: batScale });
  } else if (t >= BEAT.ground && t < BEAT.pickup) {
    const lt = t - BEAT.ground;
    const [hx, hy] = opusRightHand(fullPose);
    if (lt < 0.3) {
      const p = easeInOutCubic(segT(lt, 0.03, 0.3));
      const bx = lerp(groundBatX, hx, p), by = lerp(groundBatY, hy, p);
      const angle = lerp(-1.4, Math.PI + 0.15, p);
      drawBat(ctx, bx, by, angle, { seed: 200, progress: 1, scale: batScale });
    } else if (lt < 0.9) {
      drawBat(ctx, hx, hy, Math.PI + 0.15, { seed: 200, progress: 1, scale: batScale });
    } else if (lt < 1.15) {
      const p = easeInOutCubic(segT(lt, 0.9, 1.15));
      drawBat(ctx, hx, hy, lerp(Math.PI, 0, p), { seed: 200, progress: 1, scale: batScale });
    } else {
      drawBat(ctx, hx, hy, 0, { seed: 200, progress: 1, scale: batScale });
    }
  } else if (t >= BEAT.pickup) {
    const [hx, hy] = opusRightHand(fullPose);
    const angle = fullPose.armRAngle > 1.0 ? Math.min(fullPose.armRAngle - 0.3, 1.0) : 0;
    drawBat(ctx, hx, hy, angle, { seed: 200, progress: 1, scale: batScale });
  }

  // BEAT 4: bowled & miss — fast delivery, snap reaction
  if (t >= BEAT.pickup && t < BEAT.miss) {
    const lt = t - BEAT.pickup;
    const ARC_Y = GROUND_Y - 70;
    if (lt < 1.05) {
      const p = easeInOutCubic(segT(lt, 0.2, 1.0));
      const wx = lerp(WORLD.bowlerX, WORLD.stumpsX - 10, p);
      const wy = ARC_Y - Math.sin(p * Math.PI) * 46;
      drawBall(ctx, toScreenX(wx, fx), wy, ballR * 0.85, { seed: 400, spin: p * 30, popT: 1 });
    }
    if (lt >= 1.0 && lt < 1.15) drawFlash(ctx, 0.35 * fadeFactor(lt, 1.0, 1.15, 0.05));
    if (lt > 1.05 && lt < 2.2) {
      const a = fadeFactor(lt, 1.05, 2.2, 0.2);
      ctx.save(); ctx.globalAlpha = a;
      drawEmblem(ctx, '!', toScreenX(WORLD.creaseX - 90, fx), GROUND_Y - 340, { color: '#c0392b', scale: 1.05 });
      ctx.restore();
    }
  }

  // BEAT 5: connects for six — bowled almost immediately (lt=0.2), contact
  // at lt=0.95. The incoming and outgoing arcs now share the same baseline
  // (ARC_Y) so the ball doesn't pop vertically at the moment of contact.
  if (t >= BEAT.miss && t < BEAT.six) {
    const lt = t - BEAT.miss;
    const CONTACT_X = WORLD.creaseX + 70; // the bat sits to the character's right (bowler side) — land the hit there, not in the torso
    const ARC_Y = GROUND_Y - 70;
    if (lt < 0.95) {
      const p = easeInOutCubic(segT(lt, 0.2, 0.9));
      const wx = lerp(WORLD.bowlerX, CONTACT_X, p);
      const wy = ARC_Y - Math.sin(p * Math.PI) * 46;
      drawBall(ctx, toScreenX(wx, fx), wy, ballR * 0.85, { seed: 500, spin: p * 30, popT: 1 });
    } else {
      if (lt < 1.1) drawFlash(ctx, 0.65 * fadeFactor(lt, 0.95, 1.1, 0.05));
      if (lt < 1.4) drawImpactStar(ctx, toScreenX(CONTACT_X, fx), ARC_Y, { seed: 501, progress: segT(lt, 0.95, 1.4) });
      const p = segT(lt, 0.95, 4.5);
      if (p < 1) {
        const ep = easeOutCubic(p);
        const wx = lerp(CONTACT_X, WORLD.sixLandX, ep);
        const screenY = ARC_Y - Math.sin(ep * Math.PI) * 380; // ep=0 -> ARC_Y, matching the incoming ball's end height exactly
        for (let i = 1; i <= 4; i++) {
          const tp = Math.max(0, p - i * 0.04);
          const tep = easeOutCubic(tp);
          const twx = lerp(CONTACT_X, WORLD.sixLandX, tep);
          const tscreenY = ARC_Y - Math.sin(tep * Math.PI) * 380;
          ctx.save(); ctx.globalAlpha = (1 - i / 5) * 0.5; ctx.fillStyle = '#c0392b';
          ctx.beginPath(); ctx.arc(toScreenX(twx, fx), tscreenY, 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        drawBall(ctx, toScreenX(wx, fx), screenY, ballR * 0.85, { seed: 500, spin: ep * 40, popT: 1 });
      }
      if (lt > 3.1 && lt < 3.65) {
        const sx = toScreenX(WORLD.sixLandX, fx);
        const a = fadeFactor(lt, 3.1, 3.65, 0.15);
        ctx.save(); ctx.strokeStyle = '#4f7fb0'; ctx.lineWidth = 4; ctx.globalAlpha = a;
        ctx.beginPath(); ctx.moveTo(sx - 14, GROUND_Y - 14); ctx.lineTo(sx + 14, GROUND_Y + 14);
        ctx.moveTo(sx + 14, GROUND_Y - 14); ctx.lineTo(sx - 14, GROUND_Y + 14); ctx.stroke();
        ctx.restore();
      }
    }
  }

  // BEAT 6: celebration
  if (t >= BEAT.six) {
    const lt = t - BEAT.six;
    if (lt > 0.2 && lt < 2.6) drawSpeechBubble(ctx, toScreenX(WORLD.creaseX, fx) + 150, GROUND_Y - 380, 'SIX!', { progress: fadeFactor(lt, 0.2, 2.6, 0.25), seed: 700 });
    if (lt > 0.35 && lt < 4.5) drawConfettiMixed(ctx, toScreenX(WORLD.creaseX, fx), GROUND_Y - 420, clamp(segT(lt, 0.35, 2.7), 0, 1));
    if (lt > 2.6) drawHeart(ctx, toScreenX(WORLD.creaseX, fx) + 200, GROUND_Y - 470 + Math.sin(lt * 2) * 8, { seed: 600, size: 30, progress: segT(lt, 2.6, 3.1) });
  }
}

// ---------------------------------------------------------------------------
// signature + end fade
// ---------------------------------------------------------------------------
function drawSignatureAndFade(ctx, t, fx) {
  const sigStart = BEAT.six + 5.0;
  if (t >= sigStart) {
    const lt = t - sigStart;
    const p = segT(lt, 0, 1.0);
    if (p > 0) sketchText(ctx, '— Opus 5.5', 1600, 1000, { font: 'italic 42px "Chalkboard SE"', align: 'left', progress: p, seed: 70, color: INK });
    if (lt > 1.0) drawHeart(ctx, 1600 + 200, 985, { seed: 601, size: 20, progress: segT(lt, 1.0, 1.4) });
  }
  if (t > DURATION - 0.5) {
    const a = segT(t, DURATION - 0.5, DURATION - 0.05);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = worldBgColor(fx, t); ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}

// ===========================================================================
// master render
// ===========================================================================
function renderFrame(t) {
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const fx = cameraFocusWorldX(t);
  drawPaperBase(ctx, fx, t);
  drawWorld(ctx, fx, t);
  drawStumpsLayer(ctx, fx, t);

  const pose = getOpusPose(t);
  const screenX = toScreenX(opusWorldX(t), fx);
  const fullPose = { ...pose, x: screenX, y: GROUND_Y };
  drawShadow(ctx, screenX, GROUND_Y, 150);
  drawOpus(ctx, fullPose);
  drawPropsForTime(ctx, fx, t, fullPose);

  drawBunting(ctx, t);
  drawSignatureAndFade(ctx, t, fx);
  drawGrainOverlay(ctx);
}

window.renderFrame = renderFrame;
window.DURATION = DURATION;
