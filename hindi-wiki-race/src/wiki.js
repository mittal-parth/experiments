import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { nfc, sleep } from "./util.js";

const ENDPOINT = "https://hi.wikipedia.org/w/api.php";
const USER_AGENT = "HindiWikiRace/1.0 (educational Prism vs Jev demo; local research)";
const CACHE_PATH = new URL("../data/wiki-cache.json", import.meta.url);

const pages = new Map();
const pageJobs = new Map();
const titles = new Map();

let disk = { titles: {}, pages: {} };
try {
  disk = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
} catch {
  disk = { titles: {}, pages: {} };
}

let queue = Promise.resolve();
let lastRequestAt = 0;

function persistCache() {
  const temp = new URL("../data/wiki-cache.json.tmp", import.meta.url);
  writeFileSync(temp, JSON.stringify(disk));
  renameSync(fileURLToPath(temp), fileURLToPath(CACHE_PATH));
}

function spaced(task) {
  const run = queue.then(async () => {
    const gap = 250 - (Date.now() - lastRequestAt);
    if (gap > 0) await sleep(gap);
    lastRequestAt = Date.now();
    return task();
  });
  queue = run.then(() => {}, () => {});
  return run;
}

async function wikiGet(params) {
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({ format: "json", maxlag: "5", ...params });
  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await spaced(() => fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      }));
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await response.text().catch(() => "");
        const pause = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 1500 * 2 ** attempt;
        lastError = new Error(`Wikipedia returned ${response.status}`);
        await sleep(pause);
        continue;
      }
      if (!response.ok) throw new Error(`Wikipedia returned ${response.status}`);
      const data = await response.json();
      if (data.error?.code === "maxlag") {
        lastError = new Error("Wikipedia maxlag");
        await sleep(1500 * 2 ** attempt);
        continue;
      }
      if (data.error) throw new Error(data.error.info || data.error.code || "Wikipedia error");
      return data;
    } catch (error) {
      lastError = error;
      const retry = error.name === "TimeoutError" || error.name === "AbortError" || error.name === "TypeError" || String(error.message).startsWith("Wikipedia returned 429") || String(error.message).startsWith("Wikipedia returned 5") || error.message === "Wikipedia maxlag";
      if (!retry || attempt === 5) throw error;
      await sleep(1500 * 2 ** attempt);
    }
  }
  throw lastError ?? new Error("Wikipedia request failed");
}

export async function resolveTitle(input) {
  const key = nfc(input);
  if (titles.has(key)) return titles.get(key);
  if (Object.hasOwn(disk.titles, key)) {
    const stored = disk.titles[key];
    titles.set(key, stored);
    return stored;
  }
  const aliases = new Set();
  let canonical = null;
  let extra = null;
  for (let page = 0; page < 8; page += 1) {
    const params = {
      action: "query",
      titles: key,
      redirects: "1",
      prop: "redirects",
      rdlimit: "max",
      ...extra,
    };
    const data = await wikiGet(params);
    const found = Object.values(data.query?.pages ?? {})[0];
    if (!found || found.missing !== undefined) {
      titles.set(key, null);
      disk.titles[key] = null;
      persistCache();
      return null;
    }
    canonical = nfc(found.title);
    aliases.add(canonical);
    for (const redirect of found.redirects ?? []) aliases.add(nfc(redirect.title));
    for (const redirect of data.query?.redirects ?? []) aliases.add(nfc(redirect.from));
    for (const normalized of data.query?.normalized ?? []) aliases.add(nfc(normalized.from));
    extra = data.continue ?? null;
    if (!extra) break;
  }
  const resolved = { title: canonical, aliases: [...aliases] };
  for (const alias of aliases) {
    titles.set(alias, resolved);
    disk.titles[alias] = resolved;
  }
  titles.set(key, resolved);
  disk.titles[key] = resolved;
  persistCache();
  return resolved;
}

function rememberPage(requested, result) {
  pages.set(requested, result);
  pages.set(result.title, result);
  disk.pages[requested] = result;
  disk.pages[result.title] = result;
  persistCache();
}

async function loadPage(input) {
  const requested = nfc(input);
  const links = [];
  const seen = new Set();
  let resolved = requested;
  let extra = null;
  let truncated = false;
  for (let page = 0; page < 12; page += 1) {
    const data = await wikiGet({
      action: "query",
      generator: "links",
      titles: requested,
      gplnamespace: "0",
      gpllimit: "max",
      redirects: "1",
      prop: "info",
      ...extra,
    });
    for (const normalized of data.query?.normalized ?? []) {
      if (nfc(normalized.from) === requested) resolved = nfc(normalized.to);
    }
    for (const redirect of data.query?.redirects ?? []) {
      if (nfc(redirect.from) === requested || nfc(redirect.from) === resolved) {
        resolved = nfc(redirect.to);
      }
    }
    for (const found of Object.values(data.query?.pages ?? {})) {
      if (found.missing !== undefined || !found.title) continue;
      const title = nfc(found.title);
      if (!title || title === resolved || seen.has(title)) continue;
      seen.add(title);
      links.push(title);
    }
    extra = data.continue ?? null;
    if (!extra || links.length >= 5000) {
      truncated = Boolean(extra);
      break;
    }
  }

  if (links.length === 0) {
    const info = await wikiGet({ action: "query", titles: requested, redirects: "1" });
    const found = Object.values(info.query?.pages ?? {})[0];
    if (!found || found.missing !== undefined) {
      const missing = { title: requested, links: [], missing: true, truncated: false };
      rememberPage(requested, missing);
      return missing;
    }
    resolved = nfc(found.title);
  }

  const result = { title: resolved, links, missing: false, truncated };
  rememberPage(requested, result);
  return result;
}

export function getPage(title) {
  const key = nfc(title);
  const cached = pages.get(key) ?? disk.pages[key];
  if (cached) {
    pages.set(key, cached);
    return Promise.resolve(cached);
  }
  const pending = pageJobs.get(key);
  if (pending) return pending;
  const job = loadPage(key).finally(() => {
    pageJobs.delete(key);
  });
  pageJobs.set(key, job);
  return job;
}
