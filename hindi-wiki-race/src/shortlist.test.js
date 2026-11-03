import assert from "node:assert/strict";
import test from "node:test";
import { evenSample, isHub, shortlist, targetTokens } from "./shortlist.js";
import { stepsWinner, summarize } from "./summary.js";

test("target tokens drop stopwords and tiny words", () => {
  assert.deepEqual(targetTokens("भारत का संविधान"), ["भारत", "संविधान"]);
  assert.deepEqual(targetTokens("चाय"), ["चाय"]);
});

test("hub and list pages are dropped, and a linked target is taken immediately", () => {
  assert.equal(isHub("सूची भारत के राज्यों की"), true);
  assert.equal(isHub("भारत के राज्यों की सूची"), true);
  const result = shortlist({
    links: ["मुख्य पृष्ठ", "दर्शनशास्त्र", "भारत", "सूची देशों की"],
    aliases: new Set(["दर्शनशास्त्र"]),
    visited: new Set(["चाय"]),
    target: "दर्शनशास्त्र",
    limit: 48,
  });
  assert.deepEqual(result, { kind: "direct", title: "दर्शनशास्त्र" });
});

test("keyword matches come first and the rest is an even sample", () => {
  const links = ["अ", "योग आसन", "ब", "स", "द", "ई", "फ"];
  const result = shortlist({
    links,
    aliases: new Set(["लक्ष्य"]),
    visited: new Set(["शुरू"]),
    target: "योग",
    limit: 4,
  });
  assert.equal(result.kind, "choose");
  assert.equal(result.options[0], "योग आसन");
  assert.equal(result.options.length, 4);
  assert.equal(new Set(result.options).size, 4);
});

test("visited pages and a single leftover link", () => {
  const only = shortlist({
    links: ["भारत", "मुख्य पृष्ठ"],
    aliases: new Set(["लक्ष्य"]),
    visited: new Set(["शुरू", "भारत"]),
    target: "लक्ष्य",
    limit: 48,
  });
  assert.deepEqual(only, { kind: "dead" });
});

test("even sample stays inside the list and keeps the ends", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  const sample = evenSample(items, 4);
  assert.equal(sample.length, 4);
  assert.equal(sample[0], "a");
  assert.equal(sample[3], "j");
  assert.equal(new Set(sample).size, 4);
});

function side(status, hops, ms = 100) {
  return {
    status,
    hops,
    totalMs: ms,
    totalUsd: 0.001,
    totalInr: 0.1,
    tokens: 10,
    modelCalls: 1,
    hopLog: [{ kind: "model", ms }],
  };
}

test("fewer finished hops wins, and a miss does not", () => {
  assert.equal(stepsWinner({ prism: side("reached", 4), jev: side("reached", 6) }), "prism");
  assert.equal(stepsWinner({ prism: side("max-hops", 10), jev: side("reached", 9) }), "jev");
  assert.equal(stepsWinner({ prism: side("reached", 5), jev: side("reached", 5) }), "tie");
  assert.equal(stepsWinner({ prism: side("dead", 3), jev: side("illegal", 2) }), "none");
});

test("summary counts finishes and decision time separately from free hops", () => {
  const races = [
    {
      stepsWinner: "prism",
      prism: side("reached", 3, 200),
      jev: side("reached", 5, 400),
    },
  ];
  const summary = summarize(races);
  assert.equal(summary.stepWins.prism, 1);
  assert.equal(summary.prism.finishes, 1);
  assert.equal(summary.prism.medianHopMs, 200);
  assert.equal(summary.jev.totalMs, 400);
});
