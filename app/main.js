// A make.fun frontend: the board of open bounties, a page for each bounty, that
// bounty's leaderboard, and an account's public profile — on hash routes.
//
//   #/                            the board
//   #/bounty/<slug>               one bounty
//   #/bounty/<slug>/leaderboard   that bounty's leaderboard
//   #/u/<handle>                  an account's public profile
//
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture. The countdowns tick
// every 30 seconds by writing new text into the time-left nodes alone — the
// page is never rebuilt for the clock — and a revalidation that returns the same
// data (see api.js) does not re-render the view either.

import { getBoard, getBounty, getLeaderboard, getProfile, signature } from './api.js';
import {
  board,
  boardRows,
  bounty,
  leaderboard,
  notFound,
  profile,
  restPage,
  restPageSize,
  solutionPage,
  solutionPageSize,
} from './views.js';
import { isOpen, timeLeft } from './format.js';

const app = document.getElementById('app');

/** The last rendered view, so a revalidation with no change leaves it alone. */
let last = { kind: '', sig: '' };

/** The board's filter and sort, kept across renders. */
const boardState = { q: '', show: 'all', sort: 'deadline' };

function sortBoard(items) {
  const list = [...items];
  if (boardState.sort === 'pot') return list.sort((a, b) => Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0));
  if (boardState.sort === 'entries') return list.sort((a, b) => b.submissionCount - a.submissionCount);
  return list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}

function filterBoard(items) {
  let list = items;
  if (boardState.show === 'open') list = list.filter(isOpen);
  if (boardState.show === 'ended') list = list.filter((b) => !isOpen(b));
  if (boardState.q) {
    const q = boardState.q.toLowerCase();
    list = list.filter((b) => b.title.toLowerCase().includes(q) || b.category.toLowerCase().includes(q));
  }
  return sortBoard(list);
}

/** Re-render the board's list alone (a filter or a sort), not the page around it. */
function renderBoardList(data) {
  const list = document.getElementById('board-list');
  if (list) list.innerHTML = boardRows(filterBoard(data.items));
}

function wireBoard(data) {
  const q = document.getElementById('board-q');
  const show = document.getElementById('board-filter');
  const sort = document.getElementById('board-sort');
  if (!q || !show || !sort) return;
  q.value = boardState.q;
  show.value = boardState.show;
  sort.value = boardState.sort;
  q.addEventListener('input', () => {
    boardState.q = q.value;
    renderBoardList(data);
  });
  show.addEventListener('change', () => {
    boardState.show = show.value;
    renderBoardList(data);
  });
  sort.addEventListener('change', () => {
    boardState.sort = sort.value;
    renderBoardList(data);
  });
}

/** Append the next page of a paginated list without rebuilding it. */
function wireMore(buttonId, rowsSelector, pageHtml, pageSize) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const shown = Number(btn.dataset.shown);
    const total = Number(btn.dataset.total);
    document.querySelector(rowsSelector)?.insertAdjacentHTML('beforeend', pageHtml(shown));
    const next = shown + pageSize;
    if (next >= total) {
      btn.remove();
    } else {
      btn.dataset.shown = String(next);
      btn.textContent = `Show more (${total - next} left)`;
    }
  });
}

/** Write new text into every time-left node; the clock never rebuilds the page. */
function tick() {
  for (const el of document.querySelectorAll('.timeleft[data-deadline]')) {
    el.textContent = timeLeft(el.dataset.deadline);
  }
}

let tickTimer = null;
function startTick() {
  clearInterval(tickTimer);
  tickTimer = setInterval(tick, 30_000);
}

function fail(message) {
  app.innerHTML = `<h1>Something went wrong</h1><p>${message}</p><p><a href="#/">← Back to the board</a></p>`;
  window.__shotReady = true;
}

async function render() {
  window.__shotReady = false;
  const hash = location.hash || '#/';
  const lb = hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/);
  const b = hash.match(/^#\/bounty\/([^/]+)$/);
  const u = hash.match(/^#\/u\/([^/]+)$/);
  app.innerHTML = '<p>Loading…</p>';
  try {
    if (lb) {
      const slug = decodeURIComponent(lb[1]);
      const data = await getLeaderboard(slug);
      const sig = signature('leaderboard', data);
      if (last.kind === `leaderboard:${slug}` && last.sig === sig) {
        // Same data as last time: leave the view alone.
      } else {
        document.title = `Leaderboard — ${data.competition?.title ?? slug} | make.fun bounties`;
        app.innerHTML = leaderboard(data, slug);
        wireMore('rest-more', '#rest-rows', (shown) => restPage(data, shown), restPageSize);
        last = { kind: `leaderboard:${slug}`, sig };
      }
    } else if (b) {
      const slug = decodeURIComponent(b[1]);
      const data = await getBounty(slug);
      const sig = signature('bounty', data);
      if (last.kind === `bounty:${slug}` && last.sig === sig) {
        // Same data as last time: leave the view alone.
      } else {
        document.title = `${data.title} | make.fun bounties`;
        app.innerHTML = bounty(data);
        last = { kind: `bounty:${slug}`, sig };
      }
    } else if (u) {
      const handle = decodeURIComponent(u[1]);
      const data = await getProfile(handle);
      const sig = signature('profile', data);
      if (last.kind === `profile:${handle}` && last.sig === sig) {
        // Same data as last time: leave the view alone.
      } else {
        document.title = `${data.display_name || data.handle} | make.fun bounties`;
        app.innerHTML = profile(data);
        wireMore('solutions-more', '#solutions-list', (shown) => solutionPage(data, shown), solutionPageSize);
        last = { kind: `profile:${handle}`, sig };
      }
    } else {
      const data = await getBoard();
      const sig = signature('board', data);
      if (last.kind === 'board' && last.sig === sig) {
        // Same data as last time: leave the view (and its filter) alone.
      } else {
        document.title = 'make.fun bounties';
        app.innerHTML = board(data);
        wireBoard(data);
        last = { kind: 'board', sig };
      }
    }
  } catch (err) {
    if (err && err.status === 404) {
      const what = lb ? 'That leaderboard' : b ? 'That bounty' : u ? 'That account' : 'That page';
      app.innerHTML = notFound(what);
      last = { kind: '', sig: '' };
    } else {
      fail(err && err.message ? String(err.message) : 'The request failed.');
      last = { kind: '', sig: '' };
    }
  }
  window.scrollTo(0, 0);
  startTick();
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
