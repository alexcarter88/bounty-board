// The four pages, each a function from API data to HTML.
//
//   board(data)        the bounty board
//   bounty(b)          one bounty's page
//   leaderboard(d, s)  that bounty's leaderboard
//   profile(p)         an account's public profile
//
// Every image the API points at loads from where it points, with
// crossorigin="anonymous" set before src (those images send a
// Cross-Origin-Resource-Policy of same-origin, so a plain <img> would not load).

import { bytes, date, esc, isOpen, microMoney, money, num, relTime, timeLeft, winRate } from './format.js';

/** The reward as it stands now: the live pot, or the fixed reward when there is no pot yet. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const fee = (b) => (b.entryFeeUsd ? `${money(b.entryFeeUsd)} entry fee` : 'Free entry');

/** A full URL for an image the API points at: a path on make.fun ('/api/avatars/….webp')
 *  gets the site in front of it; an absolute URL (some avatars live on other hosts) is used as it is. */
const apiUrl = (path) => {
  if (!path) return '';
  return /^https?:\/\//.test(path) ? path : `https://make.fun${path}`;
};

/** A pill that reads the bounty by its deadline: a bounty past its deadline may
 *  still carry status open until its results publish. */
const statusPill = (b) =>
  isOpen(b)
    ? `<span class="pill open">Open</span>`
    : `<span class="pill ended">Ended</span>`;

/* ---------------------------------------------------------------- board -- */

/** One row of the board. */
function boardRow(b) {
  const open = isOpen(b);
  return `<li class="bounty-row">
    <span class="bounty-main">
      <a class="bounty-title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
      <span class="bounty-cat">${esc(b.category)}</span>
    </span>
    <span class="bounty-pot">${pot(b)}</span>
    <span class="bounty-fee">${fee(b)}</span>
    <span class="bounty-time timeleft" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span>
    <span class="bounty-entries">${num(b.submissionCount)} ${b.submissionCount === 1 ? 'entry' : 'entries'}</span>
    ${statusPill(b)}
  </li>`;
}

/** Just the board's rows, so a filter or a sort re-renders the list alone,
 *  not the page around it. */
export function boardRows(items) {
  if (!items.length) return '<li class="empty">No bounties match.</li>';
  return items.map(boardRow).join('');
}

export function board(data) {
  const items = data.items;
  const open = items.filter(isOpen);
  const totalPot = items.reduce((sum, b) => sum + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
  return `<h1>Open bounties</h1>
  <p class="lede">${num(items.length)} bounties listed · ${num(open.length)} still taking entries · ${money(totalPot)} in live pots</p>
  <div class="board-tools" role="search">
    <input type="search" id="board-q" placeholder="Filter by title…" aria-label="Filter bounties by title" autocomplete="off">
    <label>Show
      <select id="board-filter" aria-label="Show which bounties">
        <option value="all">All bounties</option>
        <option value="open">Open now</option>
        <option value="ended">Ended</option>
      </select>
    </label>
    <label>Sort
      <select id="board-sort" aria-label="Sort bounties">
        <option value="deadline">Soonest deadline</option>
        <option value="pot">Largest pot</option>
        <option value="entries">Most entries</option>
      </select>
    </label>
  </div>
  <ul class="board" id="board-list">${boardRows(items)}</ul>
  <p class="board-note">A bounty past its deadline is shown as ended even while its status still reads open — results publish after the deadline.</p>`;
}

/* --------------------------------------------------------------- bounty -- */

export function bounty(b) {
  const open = isOpen(b);
  const rewards = [...(b.rewardsNow || [])].sort((x, y) => x.place - y.place);
  const rewardRows = rewards
    .map(
      (r) => `<tr>
        <td>${r.place === 1 ? '1st' : r.place === 2 ? '2nd' : r.place === 3 ? '3rd' : `${r.place}th`}</td>
        <td>${money(r.amountUsd)}</td>
        <td class="muted">${money(r.baseUsd)} prize${Number(r.feeShareUsd) > 0 ? ` + ${money(r.feeShareUsd)} from entry fees` : ''}</td>
      </tr>`,
    )
    .join('');
  return `<p class="crumb"><a href="#/">← All bounties</a></p>
  <h1>${esc(b.title)}</h1>
  <p class="summary">${esc(b.summary)}</p>
  <p class="pills"><span class="pill">${esc(b.category)}</span>${statusPill(b)}
    <span class="timeleft pill ghost" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span>
  </p>
  <dl class="facts">
    <div><dt>Live pot</dt><dd>${pot(b)}</dd></div>
    <div><dt>Entry fee</dt><dd>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</dd></div>
    <div><dt>Deadline</dt><dd>${date(b.deadline)}</dd></div>
    <div><dt>Entries</dt><dd>${num(b.submissionCount)}</dd></div>
    <div><dt>Opened</dt><dd>${date(b.opensAt)}</dd></div>
    <div><dt>Published</dt><dd>${relTime(b.publishedAt)}</dd></div>
  </dl>
  <p class="actions">
    <a class="btn" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">View leaderboard →</a>
    <a class="btn ghost" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">Open on make.fun ↗</a>
  </p>
  <h2>Rewards</h2>
  ${rewards.length ? `<table class="rewards">
    <thead><tr><th>Place</th><th>Prize</th><th>Made up of</th></tr></thead>
    <tbody>${rewardRows}</tbody>
  </table>
  <p class="muted">Live pot ${pot(b)} — entry fees paid in are added to the prizes above.</p>` : `<p class="muted">No prize table published yet.</p>`}
  <h2>Description</h2>
  <div class="description">${esc(b.description)}</div>
  <details class="rules">
    <summary>Rules (${Math.round((b.rules || '').length / 1024)} KB)</summary>
    <div class="description">${esc(b.rules)}</div>
  </details>`;
}

/* ---------------------------------------------------------- leaderboard -- */

/** A win-rate cell from a micro value and its 90% interval. */
const rateCell = (value, interval) =>
  `<td class="num">${winRate(value)}</td><td class="num muted">${interval ? `${winRate(interval.low)}–${winRate(interval.high)}` : '—'}</td>`;

/** One of the top 10 rows, in full. */
function topRow(e) {
  const thumb = e.rank <= 3 && e.judge?.artifact?.preview_url
    ? `<img class="thumb" crossorigin="anonymous" loading="lazy" src="${esc(apiUrl(e.judge.artifact.preview_url))}" alt="">`
    : '';
  const avatar = e.image
    ? `<img class="mini-avatar" crossorigin="anonymous" loading="lazy" src="${esc(apiUrl(e.image))}" alt="">`
    : '';
  return `<tr>
    <td class="num rank">${e.rank}</td>
    <td>${avatar}<a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a></td>
    <td>${thumb}<span class="entry-title">${esc(e.title)}</span></td>
    ${rateCell(e.values?.judge, e.interval)}
    <td class="num">${e.cost ? microMoney(e.cost.micro_usd) : '—'}</td>
    <td class="num">${e.values?.bytes != null ? bytes(e.values.bytes) : '—'}</td>
  </tr>`;
}

/** One of the rows past the top 10: a lighter shape, no cost or size. */
function restRow(e) {
  return `<tr>
    <td class="num rank">${e.rank}</td>
    <td><a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a></td>
    <td>${esc(e.title)}</td>
    ${rateCell(e.value, e.interval)}
    <td class="num">—</td>
    <td class="num">—</td>
  </tr>`;
}

const REST_PAGE = 25;

export function leaderboard(data, slug) {
  const title = data.competition?.title ?? slug;
  const phase = data.phase?.title ?? '';
  const shown = Math.min(data.rest.length, REST_PAGE);
  return `<p class="crumb"><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(title)}</a></p>
  <h1>Leaderboard — ${esc(title)}</h1>
  <p class="lede">${esc(phase)}${data.metrics_withheld ? ' · scores are live' : ''} · ${num(data.entries.length + data.rest.length)} entries ranked</p>
  <table class="leader">
    <thead><tr><th>#</th><th>Entrant</th><th>Entry</th><th>Win rate</th><th>90% interval</th><th>Build cost</th><th>Size</th></tr></thead>
    <tbody>${data.entries.map(topRow).join('')}</tbody>
  </table>
  ${data.rest.length ? `<h2>More entries</h2>
  <table class="leader rest">
    <thead><tr><th>#</th><th>Entrant</th><th>Entry</th><th>Win rate</th><th>90% interval</th><th>Build cost</th><th>Size</th></tr></thead>
    <tbody id="rest-rows">${data.rest.slice(0, REST_PAGE).map(restRow).join('')}</tbody>
  </table>
  ${data.rest.length > REST_PAGE ? `<p><button class="btn ghost" id="rest-more" data-shown="${shown}" data-total="${data.rest.length}">Show more (${data.rest.length - shown} left)</button></p>` : ''}` : ''}
  <p class="muted">Win rate is the judge's head-to-head win rate; the interval is the 90% range. Build cost is what the entry's build spent.</p>`;
}

/** The next page of the light rows, appended to the table without rebuilding it. */
export function restPage(data, shown) {
  return data.rest.slice(shown, shown + REST_PAGE).map(restRow).join('');
}

export const restPageSize = REST_PAGE;

/* -------------------------------------------------------------- profile -- */

function solutionRow(s, index) {
  const c = s.competition || {};
  return `<li class="solution">
    <a class="solution-title" href="#/bounty/${encodeURIComponent(c.slug)}">${esc(s.title)}</a>
    <span class="solution-comp">${esc(c.title ?? '')}</span>
    <span class="solution-meta">${c.reward_usd ? money(c.reward_usd) : ''}${c.deadline ? ` · ${isOpen(c) ? timeLeft(c.deadline) : 'ended'}` : ''}</span>
  </li>`;
}

const SOLUTION_PAGE = 10;

export function profile(p) {
  const name = p.display_name || p.handle;
  const avatar = p.avatar?.url_small || p.avatar?.url || p.image;
  const r = p.record || {};
  const links = [
    p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub ↗</a>` : '',
    p.x ? `<a href="https://x.com/${encodeURIComponent(p.x)}">X ↗</a>` : '',
    p.discord ? `<span>Discord: ${esc(p.discord)}</span>` : '',
    p.wallet?.explorer_url ? `<a href="${esc(p.wallet.explorer_url)}">Wallet ↗</a>` : '',
  ].filter(Boolean);
  const solutions = p.solutions || [];
  return `<div class="profile-head">
    ${avatar ? `<img class="avatar" crossorigin="anonymous" src="${esc(apiUrl(avatar))}" alt="">` : ''}
    <div>
      <h1>${esc(name)}</h1>
      <p class="handle">@${esc(p.handle)}</p>
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
      ${links.length ? `<p class="links">${links.join(' · ')}</p>` : ''}
      <p class="muted">Joined ${date(p.joined_at)}</p>
    </div>
  </div>
  <dl class="facts record">
    <div><dt>Entered</dt><dd>${num(r.competitions_entered ?? 0)}</dd></div>
    <div><dt>Won</dt><dd>${num(r.competitions_won ?? 0)}</dd></div>
    <div><dt>Placed</dt><dd>${num(r.competitions_placed ?? 0)}</dd></div>
    <div><dt>Podium</dt><dd>${num(r.podium_finishes ?? 0)}</dd></div>
    <div><dt>Best finish</dt><dd>${r.best_placement ? `#${r.best_placement}` : '—'}</dd></div>
    <div><dt>Prize money</dt><dd>${money(r.prize_usd ?? 0)}</dd></div>
  </dl>
  <h2>Entries (${num(solutions.length)})</h2>
  ${solutions.length ? `<ul class="solutions" id="solutions-list">${solutions.slice(0, SOLUTION_PAGE).map(solutionRow).join('')}</ul>
  ${solutions.length > SOLUTION_PAGE ? `<p><button class="btn ghost" id="solutions-more" data-shown="${SOLUTION_PAGE}" data-total="${solutions.length}">Show more (${solutions.length - SOLUTION_PAGE} left)</button></p>` : ''}` : '<p class="muted">No entries yet.</p>'}
  <h2>Payouts</h2>
  ${(p.payouts || []).length
    ? `<ul class="payouts">${p.payouts.map((x) => `<li>${esc(x.amount ?? x.amountUsd ?? '')} — ${esc(x.status ?? '')}</li>`).join('')}</ul>`
    : '<p class="muted">No payouts yet.</p>'}`;
}

export const solutionPageSize = SOLUTION_PAGE;

/** The next page of a profile's entries, appended without rebuilding the list. */
export function solutionPage(p, shown) {
  return (p.solutions || []).slice(shown, shown + SOLUTION_PAGE).map(solutionRow).join('');
}

/* ------------------------------------------------------------- not found -- */

export function notFound(what) {
  return `<h1>Not found</h1><p>${esc(what)} does not exist on make.fun, or it has been taken down.</p><p><a href="#/">← Back to the board</a></p>`;
}
