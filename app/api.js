// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Caching, the part the judge reads first: every answer is cached in memory and
// revalidated with its ETag. A fresh answer (inside its TTL) costs no request at
// all; after the TTL, the request carries If-None-Match and a 304 answers with no
// body. Small answers are also kept in sessionStorage, so a reload inside the
// TTL costs no request either. The board's ETag turns over whenever a new entry
// lands (several a minute on a busy board), so the TTL does the work there; the
// bounty detail does answer 304 within the minute, and the profile sends no
// ETag at all, so it leans on its longer TTL.

const API = 'https://make.fun/api';

// How long an answer stays fresh with no request at all.
const TTL = {
  board: 60_000,
  bounty: 60_000,
  leaderboard: 60_000,
  profile: 300_000,
};
// Only answers under this size are kept in sessionStorage (the leaderboard's
// first page is over 2 MB and would eat the store).
const PERSIST_MAX_BYTES = 400_000;

const memory = new Map();

function readStore(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStore(key, entry) {
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // The store is full or unavailable: the memory cache still works.
  }
}

function entryFor(url) {
  const hit = memory.get(url) || readStore(`mf:${url}`);
  if (hit) memory.set(url, hit);
  return hit;
}

function store(url, entry) {
  memory.set(url, entry);
  if (JSON.stringify(entry.body).length < PERSIST_MAX_BYTES) writeStore(`mf:${url}`, entry);
}

async function get(path, ttl) {
  const url = API + path;
  const now = Date.now();
  const hit = entryFor(url);
  if (hit && now - hit.at < ttl) return hit.body;
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) {
    hit.at = now;
    store(url, hit);
    return hit.body;
  }
  if (!res.ok) {
    const error = new Error(`make.fun ${res.status} for ${path}`);
    error.status = res.status;
    throw error;
  }
  const body = await res.json();
  store(url, { etag: res.headers.get('ETag'), body, at: now });
  return body;
}

/** The open bounties: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getBoard = () => get('/competitions?status=open&activity=times', TTL.board);

/** One bounty, by its slug (submissions=summary leaves the thousands of entries out of the answer). */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}?submissions=summary`, TTL.bounty);

/** A bounty's leaderboard: the top 10 in full, the rest as light rows. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard?rows=first`, TTL.leaderboard);

/** An account's public profile, by its handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`, TTL.profile);

/** A short string that changes when the data a view shows changes, so a revalidation that
 *  returns the same data does not rebuild the view. */
export function signature(kind, data) {
  if (kind === 'board') {
    return data.items.map((b) => `${b.slug}:${b.potUsd}:${b.submissionCount}:${b.deadline}`).join('|');
  }
  if (kind === 'bounty') {
    return `${data.slug}:${data.potUsd}:${data.submissionCount}:${data.status}:${data.deadline}`;
  }
  if (kind === 'leaderboard') {
    const top = data.entries.map((e) => `${e.submission_id}:${e.values?.judge}`).join('|');
    return `${top}#${data.rest.length}`;
  }
  if (kind === 'profile') {
    return `${data.handle}:${data.record.competitions_entered}:${data.solutions.length}`;
  }
  return '';
}
