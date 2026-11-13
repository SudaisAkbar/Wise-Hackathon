// Fetches a Wise Help Centre article and pulls out its readable text.
// This runs on the laptop that hosts the demo, so it needs internet access.
// Results are cached for an hour; any failure returns null and the assistant
// falls back to a general answer plus the article link.
import { config } from '../config.js';

const cache = new Map();
const HOUR = 60 * 60 * 1000;
const MAX_CHARS = 6000;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };

function decode(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

function stripTags(html) {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<(nav|header|footer|aside|form|button)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|h[1-6]|div|section|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function inner(html, tag) {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(html);
  return match ? match[1] : null;
}

// Long prose strings inside a page's embedded JSON (many sites render from it).
function proseFromJson(value, out = []) {
  if (typeof value === 'string') {
    const text = value.includes('<') ? stripTags(value) : value;
    if (text.length > 60 && /\s/.test(text) && !/^https?:\/\//.test(text)) out.push(text);
  } else if (Array.isArray(value)) {
    for (const item of value) proseFromJson(item, out);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) proseFromJson(item, out);
  }
  return out;
}

export function extractArticleText(html) {
  if (!html || typeof html !== 'string') return '';

  for (const tag of ['article', 'main']) {
    const part = inner(html, tag);
    if (part) {
      const text = stripTags(part);
      if (text.length > 200) return text.slice(0, MAX_CHARS);
    }
  }

  for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      const body = [data].flat().map((item) => item?.articleBody || item?.text).find(Boolean);
      if (body && body.length > 100) return stripTags(body).slice(0, MAX_CHARS);
    } catch {
      /* not usable */
    }
  }

  const next = /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (next) {
    try {
      const prose = [...new Set(proseFromJson(JSON.parse(next[1])))];
      const text = prose.join('\n');
      if (text.length > 100) return text.slice(0, MAX_CHARS);
    } catch {
      /* not usable */
    }
  }

  const body = inner(html, 'body') || html;
  return stripTags(body).slice(0, MAX_CHARS);
}

export async function fetchArticle(path, { fetchImpl = fetch } = {}) {
  if (!config.helpLiveFetch) return null;
  const url = new URL(path, config.helpBaseUrl).toString();
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < HOUR) return cached.value;

  try {
    const response = await fetchImpl(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (hackathon prototype; voice assistant)', Accept: 'text/html' },
      signal: AbortSignal.timeout(config.helpTimeoutMs)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = extractArticleText(await response.text());
    const value = text.length > 80 ? { url, text } : null;
    cache.set(url, { at: Date.now(), value });
    return value;
  } catch (error) {
    console.warn(`[help] could not fetch ${url}: ${error.message}`);
    return null;
  }
}

export function clearArticleCache() {
  cache.clear();
}
