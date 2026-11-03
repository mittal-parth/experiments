import { mean, median } from "./util.js";

export function stepsWinner(race) {
  const hops = (side) => (side.status === "reached" ? side.hops : Number.POSITIVE_INFINITY);
  const prism = hops(race.prism);
  const jev = hops(race.jev);
  if (!Number.isFinite(prism) && !Number.isFinite(jev)) return "none";
  if (prism < jev) return "prism";
  if (jev < prism) return "jev";
  return "tie";
}

function sumOrNull(values) {
  if (values.some((value) => value == null || Number.isNaN(value))) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

function sideStats(races, key) {
  const sides = races.map((race) => race[key]);
  const finished = sides.filter((side) => side.status === "reached");
  const modelHops = sides.flatMap((side) => side.hopLog.filter((hop) => hop.kind === "model"));
  const hopMs = modelHops.map((hop) => hop.ms);
  const finishedHops = finished.map((side) => side.hops);
  return {
    finishes: finished.length,
    avgHops: mean(finishedHops),
    medianHops: median(finishedHops),
    medianHopMs: median(hopMs),
    meanHopMs: mean(hopMs),
    totalMs: sides.reduce((sum, side) => sum + side.totalMs, 0),
    totalUsd: sumOrNull(sides.map((side) => side.totalUsd)),
    totalInr: sumOrNull(sides.map((side) => side.totalInr)),
    modelCalls: sides.reduce((sum, side) => sum + side.modelCalls, 0),
    tokens: sides.reduce((sum, side) => sum + side.tokens, 0),
    illegal: sides.filter((side) => side.status === "illegal").length,
  };
}

export function summarize(races) {
  const stepWins = { prism: 0, jev: 0, tie: 0, none: 0 };
  for (const race of races) {
    const winner = race.stepsWinner ?? stepsWinner(race);
    stepWins[winner] += 1;
  }
  return {
    count: races.length,
    stepWins,
    prism: sideStats(races, "prism"),
    jev: sideStats(races, "jev"),
  };
}
