import { nfc } from "./util.js";

const STOP = new Set([
  "का", "की", "के", "को", "में", "से", "पर", "और", "या", "एक", "यह", "वह",
  "ने", "भी", "नहीं", "जो", "कि", "तो", "है", "हैं", "था", "थे", "लिए", "तक",
  "हो", "इस", "उस", "तथा", "एवं", "the", "of", "and",
]);

export function targetTokens(title) {
  const parts = title
    .split(/[\s,،،。。॥।:;/|()[\]"'“”‘’._+\-–—]+/u)
    .map((part) => part.trim())
    .filter((part) => [...part].length >= 3 && !STOP.has(part.toLowerCase()));
  if (parts.length > 0) return parts;
  const fallback = title.trim();
  return fallback ? [fallback] : [];
}

export function isHub(title) {
  if (title === "मुख्य पृष्ठ" || title === "विकिपीडिया") return true;
  if (title.startsWith("सूची ") || title.startsWith("सूची:")) return true;
  if (title.includes(" की सूची")) return true;
  return false;
}

export function evenSample(items, count) {
  if (count <= 0) return [];
  if (count >= items.length) return items.slice();
  if (count === 1) return [items[Math.floor((items.length - 1) / 2)]];
  const used = new Set();
  const picked = [];
  for (let i = 0; i < count; i += 1) {
    let index = Math.round((i * (items.length - 1)) / (count - 1));
    if (used.has(index)) {
      let right = index + 1;
      while (right < items.length && used.has(right)) right += 1;
      let left = index - 1;
      while (left >= 0 && used.has(left)) left -= 1;
      if (right < items.length && (left < 0 || right - index <= index - left)) index = right;
      else if (left >= 0) index = left;
      else break;
    }
    used.add(index);
    picked.push(items[index]);
  }
  return picked;
}

function mentions(title, tokens) {
  const haystack = title.toLowerCase();
  return tokens.some((token) => haystack.includes(token.toLowerCase()));
}

// Same shape as Jev's wikiracer: drop visited pages and list articles, keep titles
// that share a word with the target, then fill the remaining slots evenly.
export function shortlist({ links, aliases, visited, target, limit }) {
  const seen = new Set();
  const cleaned = [];
  for (const raw of links) {
    const title = nfc(raw);
    if (!title || seen.has(title) || visited.has(title) || aliases.has(title)) continue;
    if (isHub(title)) continue;
    seen.add(title);
    cleaned.push(title);
  }

  const direct = links.map((raw) => nfc(raw)).find((title) => aliases.has(title));
  if (direct) return { kind: "direct", title: direct.trim() };
  if (cleaned.length === 0) return { kind: "dead" };
  if (cleaned.length === 1) return { kind: "only", title: cleaned[0] };

  const tokens = targetTokens(target);
  const matched = [];
  const rest = [];
  for (const title of cleaned) {
    if (mentions(title, tokens)) matched.push(title);
    else rest.push(title);
  }

  const picked = matched.slice(0, limit);
  if (picked.length < limit) picked.push(...evenSample(rest, limit - picked.length));
  const unique = [];
  const have = new Set();
  for (const title of picked) {
    if (have.has(title)) continue;
    have.add(title);
    unique.push(title);
  }
  if (unique.length < 2) return { kind: "only", title: unique[0] ?? cleaned[0] };
  return { kind: "choose", options: unique.slice(0, limit) };
}
