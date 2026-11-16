// Small helpers for showing API values.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00' or 0.5) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
}

/** A micro-USD amount ('127975848') as '$127.98'. */
export function microMoney(value) {
  return money(Number(value) / 1_000_000);
}

/** A count as '7,756'. */
export function num(value) {
  return Number(value).toLocaleString('en-US');
}

/** A deadline as a date in UTC (the time and 'UTC' stay together on one line). */
export function date(iso) {
  return `${new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** The time until a deadline: '2d 4h left', '35m left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** Whether a bounty still takes entries: by its deadline, not its status alone —
 *  a bounty past its deadline may still read status open until its results publish. */
export function isOpen(bounty) {
  return new Date(bounty.deadline).getTime() > Date.now();
}

/** A past date as '2d ago', '3h ago', 'just now'. */
export function relTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** A judge win rate in micro units ('973639') as '97.4%'. */
export function winRate(micro) {
  if (micro == null) return '—';
  return `${(Number(micro) / 10_000).toFixed(1)}%`;
}

/** A byte count as '703 KB'. */
export function bytes(value) {
  const n = Number(value);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
