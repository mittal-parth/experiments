import { JEV_USD_PER_MTOK, PRISM_INR_PER_MTOK, INSTRUCTIONS } from "./config.js";
import { nfc, sleep } from "./util.js";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const PRISM_URL = "https://api.sarvam.ai/v2/systemone";
const PRISM_GAP_MS = 2000;

let lastPrismAt = 0;

function endpoint(model) {
  if (model === "prism") {
    const key = process.env.SARVAM_API_KEY;
    if (!key) throw new Error("SARVAM_API_KEY is missing");
    return {
      url: PRISM_URL,
      headers: { "api-subscription-key": key, "Content-Type": "application/json" },
      modelId: "sarvam-prism",
    };
  }
  if (model === "jev") {
    const key = process.env.JEV_API_KEY;
    if (!key) throw new Error("JEV_API_KEY is missing");
    return {
      url: JEV_URL,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      modelId: "jev-latest",
    };
  }
  throw new Error(`Unknown model ${model}`);
}

async function pace(model) {
  if (model !== "prism") return;
  const gap = PRISM_GAP_MS - (Date.now() - lastPrismAt);
  if (gap > 0) await sleep(gap);
  lastPrismAt = Date.now();
}

async function postDecision(model, body) {
  const target = endpoint(model);
  await pace(model);
  const started = performance.now();
  const response = await fetch(target.url, {
    method: "POST",
    headers: target.headers,
    body: JSON.stringify({ ...body, model: target.modelId }),
    signal: AbortSignal.timeout(8000),
  });
  const text = await response.text();
  const ms = performance.now() - started;
  if (!response.ok) {
    const error = new Error(`${model} returned ${response.status}: ${text.slice(0, 280)}`);
    error.status = response.status;
    throw error;
  }
  return { payload: JSON.parse(text), ms };
}

async function withRetry(model, body) {
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await postDecision(model, body);
    } catch (error) {
      lastError = error;
      const status = error.status;
      const retry = status === 429 || status === 500 || status === 502 || status === 503 || error.name === "TimeoutError" || error.name === "AbortError";
      if (!retry || attempt === 4) throw error;
      console.error(`  ${model} retry ${attempt + 1} after ${status ?? error.name}`);
      await sleep(8000 * (attempt + 1));
    }
  }
  throw lastError ?? new Error(`${model} request failed`);
}

function money(model, tokens, usdInr) {
  if (model === "prism") {
    const costInr = (tokens * PRISM_INR_PER_MTOK) / 1_000_000;
    return { costInr, costUsd: usdInr ? costInr / usdInr : null };
  }
  const costUsd = (tokens * JEV_USD_PER_MTOK) / 1_000_000;
  return { costUsd, costInr: usdInr ? costUsd * usdInr : null };
}

export async function decide({ model, state, options, usdInr }) {
  const criteria = {};
  for (const option of options) criteria[option] = option;
  const { payload, ms } = await withRetry(model, {
    state,
    questions: {
      hop: {
        type: "choice",
        instructions: INSTRUCTIONS,
        criteria,
      },
    },
  });
  const answer = payload.answers?.hop;
  if (!answer || answer.type !== "choice") {
    throw new Error(`${model} returned no choice`);
  }
  const probabilities = answer.probabilities ?? {};
  const choice = nfc(String(answer.choice ?? ""));
  const runners = Object.entries(probabilities)
    .map(([title, probability]) => ({ title: nfc(title), p: probability }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 4);
  const tokens = payload.usage?.input_tokens ?? 0;
  return {
    choice,
    probability: probabilities[answer.choice] ?? runners.find((runner) => runner.title === choice)?.p ?? null,
    confidence: answer.confidence ?? null,
    runners,
    tokens,
    ms,
    reportedModel: payload.model ?? null,
    ...money(model, tokens, usdInr),
  };
}
