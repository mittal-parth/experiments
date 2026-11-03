import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { INSTRUCTIONS, MAX_HOPS, RACE_COUNT, SHORTLIST } from "./config.js";
import { racePair, selectPairs } from "./race.js";
import { summarize } from "./summary.js";
import { sleep } from "./util.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const outPath = join(root, "data", "results.json");

const args = new Set(process.argv.slice(2));
const only = process.argv.find((arg, index) => process.argv[index - 1] === "--only") ?? null;
const preflight = args.has("--preflight");
const fresh = args.has("--fresh");

async function fetchFx() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const usdInr = data?.rates?.INR;
    if (!usdInr) return null;
    return {
      usdInr,
      source: "open.er-api.com",
      asOf: data.time_last_update_utc ?? null,
    };
  } catch {
    return null;
  }
}

function loadExisting() {
  if (fresh || !existsSync(outPath)) return null;
  return JSON.parse(readFileSync(outPath, "utf8"));
}

function save(state) {
  mkdirSync(dirname(outPath), { recursive: true });
  const body = `${JSON.stringify(state, null, 2)}\n`;
  const temp = `${outPath}.tmp`;
  writeFileSync(temp, body);
  renameSync(temp, outPath);
}

function logHop(model, step, from, to, kind, ms) {
  const clock = ms ? `${Math.round(ms)}ms` : kind;
  console.log(`  ${model.padEnd(5)} ${String(step).padStart(2)}  ${from}  →  ${to}  (${clock})`);
}

async function runOne(pair, usdInr) {
  let partial = null;
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      partial = await racePair(pair, usdInr, logHop, partial);
      if (partial.prism.status !== "error" && partial.jev.status !== "error") return partial;
      lastError = new Error(
        `${pair.id} prism ${partial.prism.status} ${partial.prism.error ?? ""} / jev ${partial.jev.status} ${partial.jev.error ?? ""}`.trim(),
      );
    } catch (error) {
      lastError = error;
    }
    console.error(`  retry ${attempt} for ${pair.id}: ${lastError.message}`);
    await sleep(5000 * attempt);
  }
  if (partial) return partial;
  throw lastError ?? new Error(`Could not finish ${pair.id}`);
}

const fx = await fetchFx();
const usdInr = fx?.usdInr ?? null;
console.log(fx ? `USD/INR ${fx.usdInr} (${fx.asOf})` : "FX unavailable; native currency only");

const { selected, skipped } = await selectPairs(RACE_COUNT);
console.log(`Selected ${selected.length} races`);
for (const pair of selected) {
  console.log(`  ${pair.id}: ${pair.start} → ${pair.target} (${pair.openingLinks} links)`);
}
if (skipped.length > 0) {
  console.log("Skipped");
  for (const pair of skipped) console.log(`  ${pair.id}: ${pair.reason}`);
}

if (preflight) process.exit(0);

if (!process.env.SARVAM_API_KEY || !process.env.JEV_API_KEY) {
  console.error("SARVAM_API_KEY and JEV_API_KEY are required");
  process.exit(1);
}

const wanted = only ? selected.filter((pair) => pair.id === only) : selected;
if (only && wanted.length === 0) {
  console.error(`Unknown or filtered pair ${only}`);
  process.exit(1);
}

const existing = loadExisting();
const previous = new Map((existing?.races ?? []).map((race) => [race.id, race]));
const races = [];

for (const pair of wanted) {
  if (!only && previous.has(pair.id)) {
    console.log(`\nkeep ${pair.id}`);
    races.push(previous.get(pair.id));
    continue;
  }
  console.log(`\nrace ${pair.id}: ${pair.start} → ${pair.target}`);
  const race = await runOne(pair, usdInr);
  console.log(
    `  result ${race.stepsWinner}  prism ${race.prism.status} ${race.prism.hops} hops ${Math.round(race.prism.totalMs)}ms  jev ${race.jev.status} ${race.jev.hops} hops ${Math.round(race.jev.totalMs)}ms`,
  );
  races.push(race);
  save(buildState(snapshot(races), fx, skipped));
}

const state = buildState(snapshot(races), fx, skipped);
save(state);
console.log(`\nWrote ${outPath}`);
console.log(JSON.stringify(state.summary, null, 2));

function snapshot(finished) {
  const byId = new Map(finished.map((race) => [race.id, race]));
  const ordered = [];
  for (const pair of selected) {
    if (byId.has(pair.id)) ordered.push(byId.get(pair.id));
    else if (previous.has(pair.id)) ordered.push(previous.get(pair.id));
  }
  return ordered;
}

function buildState(races, rate, dropped) {
  return {
    generatedAt: new Date().toISOString(),
    fx: rate,
    rules: {
      wiki: "https://hi.wikipedia.org",
      maxHops: MAX_HOPS,
      shortlist: SHORTLIST,
      instructions: INSTRUCTIONS,
      pricing: {
        prismInrPerMtok: 4,
        jevUsdPerMtok: 0.042,
      },
    },
    skipped: dropped,
    races,
    summary: summarize(races),
  };
}
