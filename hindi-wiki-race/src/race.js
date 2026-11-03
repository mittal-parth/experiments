import { hopState, MAX_HOPS, SHORTLIST } from "./config.js";
import { decide } from "./decide.js";
import { CANDIDATES } from "./pairs.js";
import { shortlist } from "./shortlist.js";
import { stepsWinner } from "./summary.js";
import { nfc } from "./util.js";
import { getPage, resolveTitle } from "./wiki.js";

async function land(title) {
  const page = await getPage(title);
  if (!page || page.missing) return { title: nfc(title), missing: true };
  return { title: page.title, missing: false };
}

async function runModel(model, startTitle, target, usdInr, log) {
  const aliases = new Set(target.aliases.map((alias) => nfc(alias)));
  const path = [nfc(startTitle)];
  const visited = new Set(path);
  const hopLog = [];
  let totalMs = 0;
  let totalUsd = 0;
  let totalInr = 0;
  let usdKnown = true;
  let inrKnown = true;
  let tokens = 0;
  let modelCalls = 0;
  let reportedModel = null;
  const started = performance.now();

  const addMoney = (decision) => {
    if (decision.costUsd == null) usdKnown = false;
    else totalUsd += decision.costUsd;
    if (decision.costInr == null) inrKnown = false;
    else totalInr += decision.costInr;
  };

  const pack = (status) => ({
    status,
    hops: Math.max(0, path.length - 1),
    path: [...path],
    hopLog,
    totalMs,
    totalUsd: usdKnown ? totalUsd : null,
    totalInr: inrKnown ? totalInr : null,
    tokens,
    modelCalls,
    reportedModel,
    wallMs: performance.now() - started,
  });

  for (let step = 1; step <= MAX_HOPS; step += 1) {
    let current = path[path.length - 1];
    if (aliases.has(current)) return pack("reached");

    const page = await getPage(current);
    if (!page || page.missing) return pack("missing");
    if (page.title !== current) {
      current = page.title;
      path[path.length - 1] = current;
      visited.add(current);
      if (aliases.has(current)) return pack("reached");
    }

    const choice = shortlist({
      links: page.links,
      aliases,
      visited,
      target: target.title,
      limit: SHORTLIST,
    });

    if (choice.kind === "direct") {
      hopLog.push({
        step,
        from: current,
        to: target.title,
        via: choice.title,
        kind: "direct",
        ms: 0,
        tokens: 0,
        costUsd: 0,
        costInr: 0,
        options: page.links.length,
      });
      path.push(target.title);
      visited.add(target.title);
      log?.(model, step, current, target.title, "direct", 0);
      return pack("reached");
    }

    if (choice.kind === "dead") {
      hopLog.push({ step, from: current, kind: "dead", options: 0, ms: 0, tokens: 0, costUsd: 0, costInr: 0 });
      log?.(model, step, current, "—", "dead", 0);
      return pack("dead");
    }

    let nextTitle = choice.kind === "only" ? choice.title : null;
    let decision = null;
    if (choice.kind === "choose") {
      decision = await decide({
        model,
        state: hopState(current, target.title),
        options: choice.options,
        usdInr,
      });
      modelCalls += 1;
      reportedModel = decision.reportedModel;
      totalMs += decision.ms;
      tokens += decision.tokens;
      addMoney(decision);
      if (!choice.options.includes(decision.choice)) {
        hopLog.push({
          step,
          from: current,
          kind: "illegal",
          choice: decision.choice,
          ms: decision.ms,
          tokens: decision.tokens,
          costUsd: decision.costUsd,
          costInr: decision.costInr,
          probability: decision.probability,
          confidence: decision.confidence,
          runners: decision.runners,
          options: choice.options.length,
          reportedModel: decision.reportedModel,
        });
        log?.(model, step, current, decision.choice, "illegal", decision.ms);
        return pack("illegal");
      }
      nextTitle = decision.choice;
    }

    const landed = await land(nextTitle);
    const hop = {
      step,
      from: current,
      to: landed.missing ? nextTitle : landed.title,
      kind: choice.kind === "only" ? "only" : "model",
      ms: decision?.ms ?? 0,
      tokens: decision?.tokens ?? 0,
      costUsd: decision?.costUsd ?? 0,
      costInr: decision?.costInr ?? 0,
      probability: decision?.probability ?? null,
      confidence: decision?.confidence ?? null,
      runners: decision?.runners ?? [],
      options: choice.kind === "only" ? 1 : choice.options.length,
      reportedModel: decision?.reportedModel ?? null,
    };
    hopLog.push(hop);
    path.push(hop.to);
    visited.add(nextTitle);
    visited.add(hop.to);
    log?.(model, step, current, hop.to, hop.kind, hop.ms);
    if (landed.missing) return pack("missing");
    if (aliases.has(hop.to)) return pack("reached");
    if (path.slice(0, -1).includes(hop.to)) return pack("loop");
  }

  return pack("max-hops");
}

async function settleModel(model, startTitle, target, usdInr, log, prior) {
  if (prior && prior.status !== "error") return prior;
  try {
    return await runModel(model, startTitle, target, usdInr, log);
  } catch (error) {
    return {
      status: "error",
      error: error.message,
      hops: 0,
      path: [startTitle],
      hopLog: [],
      totalMs: 0,
      totalUsd: 0,
      totalInr: 0,
      tokens: 0,
      modelCalls: 0,
      reportedModel: null,
      wallMs: 0,
    };
  }
}

export async function racePair(pair, usdInr, log, prior = null) {
  const start = await resolveTitle(pair.start);
  const target = await resolveTitle(pair.target);
  if (!start || !target) {
    throw new Error(`Missing Hindi Wikipedia article for ${pair.id}`);
  }
  const [prism, jev] = await Promise.all([
    settleModel("prism", start.title, target, usdInr, log, prior?.prism),
    settleModel("jev", start.title, target, usdInr, log, prior?.jev),
  ]);
  const race = {
    id: pair.id,
    blurb: pair.blurb,
    start: start.title,
    target: target.title,
    prism,
    jev,
  };
  race.stepsWinner = stepsWinner(race);
  return race;
}

export async function selectPairs(limit) {
  const selected = [];
  const skipped = [];
  for (const candidate of CANDIDATES) {
    if (selected.length >= limit) break;
    const start = await resolveTitle(candidate.start);
    const target = await resolveTitle(candidate.target);
    if (!start || !target) {
      skipped.push({ id: candidate.id, reason: "missing", start: candidate.start, target: candidate.target });
      continue;
    }
    if (start.title === target.title) {
      skipped.push({ id: candidate.id, reason: "same-page", start: start.title, target: target.title });
      continue;
    }
    const page = await getPage(start.title);
    if (!page || page.missing || page.links.length < 8) {
      skipped.push({ id: candidate.id, reason: "thin-page", start: start.title, target: target.title });
      continue;
    }
    const opening = shortlist({
      links: page.links,
      aliases: new Set(target.aliases.map((alias) => nfc(alias))),
      visited: new Set([start.title]),
      target: target.title,
      limit: SHORTLIST,
    });
    if (opening.kind === "direct") {
      skipped.push({ id: candidate.id, reason: "already-linked", start: start.title, target: target.title });
      continue;
    }
    selected.push({
      ...candidate,
      start: start.title,
      target: target.title,
      openingLinks: page.links.length,
    });
  }
  return { selected, skipped };
}
