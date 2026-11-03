const STATUS = {
  reached: "Reached",
  "max-hops": "Stopped at 10",
  dead: "No links left",
  illegal: "Illegal link",
  missing: "Missing page",
  loop: "Looped",
  error: "Error",
};

const go = document.querySelector("#go");
const hint = document.querySelector("#hint");

const wait = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

function formatMs(value) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

function formatUsd(value) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
}

function formatInr(value) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value === 0) return "₹0";
  if (value < 1) return `₹${value.toFixed(4)}`;
  return `₹${value.toFixed(2)}`;
}

function formatHops(value) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatWhen(utc) {
  if (!utc) return "";
  const date = new Date(utc);
  if (Number.isNaN(date.getTime())) return utc;
  return `${date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} IST`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function sideView(side, revealed) {
  const hops = side.hopLog.slice(0, revealed);
  const moved = hops.filter((hop) => hop.to);
  const title = moved.length > 0 ? moved[moved.length - 1].to : side.path[0];
  const ms = hops.reduce((sum, hop) => sum + (hop.ms || 0), 0);
  const usd = hops.reduce((sum, hop) => sum + (hop.costUsd || 0), 0);
  const inr = hops.reduce((sum, hop) => sum + (hop.costInr || 0), 0);
  return { title, hops, moved, ms, usd, inr, last: hops[hops.length - 1] ?? null };
}

function paintMeters(id, view) {
  const root = document.querySelector(id);
  root.replaceChildren();
  const bits = [
    ["Steps", String(view.moved.length)],
    ["Time", formatMs(view.ms)],
    ["Cost", view.inr ? formatInr(view.inr) : formatUsd(view.usd)],
  ];
  if (id === "#meters-jev") bits[2][1] = formatUsd(view.usd);
  for (const [label, value] of bits) {
    const wrap = el("div");
    wrap.append(el("dt", "", label), el("dd", "", value));
    root.append(wrap);
  }
}

function paintPath(id, view) {
  const list = document.querySelector(id);
  list.replaceChildren();
  for (const hop of view.hops) {
    if (!hop.to) continue;
    const item = el("li");
    item.append(document.createTextNode(hop.to));
    const meta = hop.kind === "model"
      ? `${Math.round((hop.probability ?? 0) * 100)}% · ${formatMs(hop.ms)}`
      : hop.kind === "direct"
        ? "Target was linked"
        : "Only link";
    item.append(el("span", "", `${hop.from} → ${meta}`));
    list.append(item);
  }
  list.scrollTop = list.scrollHeight;
}

function paintDecision(id, view) {
  const root = document.querySelector(id);
  root.replaceChildren();
  const hop = view.last;
  if (!hop) {
    root.append(el("p", "note", "Waiting on the first link."));
    return;
  }
  if (hop.kind === "direct") {
    root.append(el("p", "note", "The target is linked from this page, so this hop is free."));
    return;
  }
  if (hop.kind === "only") {
    root.append(el("p", "note", "Only one article link was left."));
    return;
  }
  if (hop.kind === "illegal") {
    root.append(el("p", "note", `Picked “${hop.choice}”, which was not one of the links.`));
    return;
  }
  if (hop.kind === "dead") {
    root.append(el("p", "note", "This page has no unused article links."));
    return;
  }
  const runners = hop.runners ?? [];
  for (const runner of runners.slice(0, 3)) {
    const row = el("div", `bar-row${runner.title === hop.to ? " picked" : ""}`);
    const top = el("div", "bar-top");
    top.append(el("div", "bar-name hi", runner.title), el("div", "", `${Math.round(runner.p * 100)}%`));
    const track = el("div", "track");
    const fill = el("div", "fill");
    track.append(fill);
    row.append(top, track);
    root.append(row);
    requestAnimationFrame(() => {
      fill.style.width = `${Math.max(2, runner.p * 100)}%`;
    });
  }
}

function paintLane(model, side, revealed, done) {
  const view = sideView(side, revealed);
  document.querySelector(`#title-${model}`).textContent = view.title ?? "—";
  paintMeters(`#meters-${model}`, view);
  paintPath(`#path-${model}`, view);
  paintDecision(`#decision-${model}`, view);
  const stamp = document.querySelector(`#stamp-${model}`);
  const lane = document.querySelector(`#lane-${model}`);
  if (!done) {
    stamp.hidden = true;
    lane.classList.remove("winner");
    return;
  }
  stamp.hidden = false;
  stamp.textContent = STATUS[side.status] ?? side.status;
  stamp.classList.toggle("bad", side.status !== "reached");
}

function paintSpine(race, index, total, done) {
  document.querySelector("#race-kicker").textContent = `Race ${index + 1} of ${total}`;
  document.querySelector("#spine-titles").textContent = `${race.start} → ${race.target}`;
  document.querySelector("#spine-blurb").textContent = race.blurb;
  const verdict = document.querySelector("#verdict");
  if (!done) {
    verdict.textContent = "";
    return;
  }
  if (race.stepsWinner === "prism") verdict.textContent = "Prism used fewer steps";
  else if (race.stepsWinner === "jev") verdict.textContent = "Jev used fewer steps";
  else if (race.stepsWinner === "tie") verdict.textContent = "Same number of steps";
  else verdict.textContent = "Neither reached the target";
}

function paintTally(tally) {
  const unfinished = tally.none ? ` · Unfinished ${tally.none}` : "";
  document.querySelector("#tally").textContent = `Prism ${tally.prism} · Ties ${tally.tie} · Jev ${tally.jev}${unfinished}`;
}

function costLabel(side, model) {
  if (model === "prism") return `${formatInr(side.totalInr)} · ${formatUsd(side.totalUsd)}`;
  return formatUsd(side.totalUsd);
}

function stepsCell(side) {
  if (side.status !== "reached") return STATUS[side.status] ?? side.status;
  return String(side.hops);
}

function renderBoard(data) {
  const { races, summary, fx, rules } = data;
  const lead = document.querySelector("#lead");
  const prismSteps = summary.stepWins.prism;
  const jevSteps = summary.stepWins.jev;
  const ties = summary.stepWins.tie;
  const none = summary.stepWins.none;
  const neither = none ? ` ${none} ${none === 1 ? "route" : "routes"} where neither arrived.` : "";
  lead.textContent = `Across ${summary.count} Hindi routes, Prism finished ${summary.prism.finishes} and Jev finished ${summary.jev.finishes}. Prism used fewer steps ${prismSteps} ${prismSteps === 1 ? "time" : "times"}, Jev ${jevSteps} ${jevSteps === 1 ? "time" : "times"}, and ${ties} ${ties === 1 ? "was a tie" : "were ties"}.${neither} Median decision: Prism ${formatMs(summary.prism.medianHopMs)}, Jev ${formatMs(summary.jev.medianHopMs)}. Total cost: Prism ${formatInr(summary.prism.totalInr)} (${formatUsd(summary.prism.totalUsd)}), Jev ${formatUsd(summary.jev.totalUsd)}.`;

  const stats = document.querySelector("#stats");
  stats.replaceChildren();
  const cards = [
    {
      label: "Steps",
      prism: `${summary.prism.finishes}/${summary.count} finished · ${formatHops(summary.prism.avgHops)} avg`,
      jev: `${summary.jev.finishes}/${summary.count} finished · ${formatHops(summary.jev.avgHops)} avg`,
      headline: `Prism ${prismSteps} · Jev ${jevSteps}`,
      caption: ties ? `${ties} tied on steps` : "fewer finished hops",
    },
    {
      label: "Speed",
      prism: `${formatMs(summary.prism.totalMs)} total · ${summary.prism.modelCalls} calls`,
      jev: `${formatMs(summary.jev.totalMs)} total · ${summary.jev.modelCalls} calls`,
      headline: `Prism ${formatMs(summary.prism.medianHopMs)} · Jev ${formatMs(summary.jev.medianHopMs)}`,
      caption: "median API time per hop",
    },
    {
      label: "Cost",
      prism: formatInr(summary.prism.totalInr),
      jev: formatUsd(summary.jev.totalUsd),
      headline: `Prism ${formatUsd(summary.prism.totalUsd)} · Jev ${formatUsd(summary.jev.totalUsd)}`,
      caption: "input tokens only, output is free",
    },
  ];
  for (const card of cards) {
    const node = el("article", "stat");
    node.append(
      el("p", "", card.label),
      el("strong", "", card.headline),
      el("span", "", `Prism ${card.prism}`),
      el("span", "", `Jev ${card.jev}`),
      el("span", "", card.caption),
    );
    stats.append(node);
  }

  const rows = document.querySelector("#rows");
  rows.replaceChildren();
  races.forEach((race, index) => {
    const row = document.createElement("tr");
    row.className = race.stepsWinner;
    const cells = [
      String(index + 1),
      null,
      stepsCell(race.prism),
      stepsCell(race.jev),
      formatMs(race.prism.totalMs),
      formatMs(race.jev.totalMs),
      costLabel(race.prism, "prism"),
      costLabel(race.jev, "jev"),
    ];
    cells.forEach((value, cellIndex) => {
      const cell = document.createElement("td");
      if (cellIndex === 1) {
        cell.className = "route";
        cell.append(el("div", "hi", `${race.start} → ${race.target}`), el("div", "blurb", race.blurb));
      } else {
        cell.textContent = value;
      }
      if (race.stepsWinner === "prism" && cellIndex === 2) cell.classList.add("better");
      if (race.stepsWinner === "jev" && cellIndex === 3) cell.classList.add("better");
      row.append(cell);
    });
    rows.append(row);
  });

  const rate = fx?.usdInr ? `₹${fx.usdInr.toFixed(2)} per $1 on ${formatWhen(fx.asOf)}` : "USD conversion unavailable";
  document.querySelector("#footnote").textContent = `Same loop as Jev's wikiracer, asked in Hindi. Up to ${rules.shortlist} real article links; lists, the main page, visited pages, and red links are dropped. A linked target costs nothing. Decision time is the API round trip and leaves Wikipedia out. Prism ₹${rules.pricing.prismInrPerMtok}/M input tokens, Jev $${rules.pricing.jevUsdPerMtok}/M. ${rate}.`;
}

function showReady(data) {
  document.body.dataset.phase = "ready";
  document.querySelector("#board").hidden = true;
  document.querySelector("#lanes").hidden = false;
  document.querySelector("#route-count").textContent = `${data.races.length} races`;
  document.querySelector("#title-prism").textContent = "हिन्दी विकिपीडिया";
  document.querySelector("#title-jev").textContent = "हिन्दी विकिपीडिया";
  document.querySelector("#race-kicker").textContent = "A split-screen race";
  document.querySelector("#spine-titles").textContent = "Same start. Same target.";
  document.querySelector("#spine-blurb").textContent = "Only the links on the page. One decision per hop.";
  document.querySelector("#verdict").textContent = "";
  hint.textContent = "Prism’s claim is Indian languages. Both models get the same Hindi question over Hindi Wikipedia.";
  go.hidden = false;
  paintTally({ prism: 0, jev: 0, tie: 0, none: 0 });
  for (const model of ["prism", "jev"]) {
    document.querySelector(`#path-${model}`).replaceChildren();
    document.querySelector(`#decision-${model}`).replaceChildren();
    document.querySelector(`#stamp-${model}`).hidden = true;
    document.querySelector(`#meters-${model}`).replaceChildren();
  }
}

async function playAll(data) {
  go.hidden = true;
  hint.textContent = "";
  document.body.dataset.phase = "race";
  const tally = { prism: 0, jev: 0, tie: 0, none: 0 };
  paintTally(tally);
  for (let index = 0; index < data.races.length; index += 1) {
    const race = data.races[index];
    const hops = Math.max(race.prism.hopLog.length, race.jev.hopLog.length, 1);
    paintSpine(race, index, data.races.length, false);
    for (const model of ["prism", "jev"]) paintLane(model, race[model], 0, false);
    for (let step = 1; step <= hops; step += 1) {
      for (const model of ["prism", "jev"]) paintLane(model, race[model], step, false);
      await wait(index === 0 ? 880 : 380);
    }
    for (const model of ["prism", "jev"]) paintLane(model, race[model], race[model].hopLog.length, true);
    if (race.stepsWinner === "prism" || race.stepsWinner === "jev") {
      document.querySelector(`#lane-${race.stepsWinner}`).classList.add("winner");
    }
    paintSpine(race, index, data.races.length, true);
    tally[race.stepsWinner] += 1;
    paintTally(tally);
    await wait(index === 0 ? 1300 : 520);
  }
  renderBoard(data);
  document.querySelector("#lanes").hidden = true;
  document.querySelector("#board").hidden = false;
  document.body.dataset.phase = "board";
  document.querySelector("#ready-flag").hidden = false;
  document.querySelector("#route-count").textContent = "Comparison";
  window.__raceDone = true;
}

const response = await fetch("/api/results");
if (!response.ok) {
  document.body.dataset.phase = "ready";
  hint.textContent = "No results yet. Run npm run race in hindi-wiki-race, then reload.";
  go.hidden = true;
} else {
  const data = await response.json();
  renderBoard(data);
  const openBoard = new URLSearchParams(location.search).has("board");
  if (openBoard) {
    document.querySelector("#lanes").hidden = true;
    document.querySelector("#board").hidden = false;
    document.body.dataset.phase = "board";
    document.querySelector("#ready-flag").hidden = false;
    document.querySelector("#route-count").textContent = "Comparison";
    paintTally({
      prism: data.summary.stepWins.prism,
      jev: data.summary.stepWins.jev,
      tie: data.summary.stepWins.tie,
      none: data.summary.stepWins.none,
    });
  } else {
    showReady(data);
  }
  go.addEventListener("click", () => {
    go.disabled = true;
    playAll(data).catch((error) => {
      hint.textContent = error.message;
    });
  });
}
