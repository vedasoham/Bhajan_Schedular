const DEITY_ORDER = [
  "Ganesha", "Guru", "Mata", "SarvaDharma",
  "Sai", "Shiva", "Krishna", "Rama", "Narayana", "Vitthala", "Hanuman"
];

const SPEED_ORDER = { "slow": 0, "medium": 1, "fast": 2 };

function deityOrderKey(deity) {
  const index = DEITY_ORDER.findIndex(d => d.toLowerCase() === deity.toLowerCase());
  return index !== -1 ? index : DEITY_ORDER.length;
}

const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

// Cached singleton formatters to avoid CPU overhead of instantiating new Intl formatters per request
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  weekday: 'short'
});

const HOUR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  hour: 'numeric',
  hour12: false
});

const DAY_MAP = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };

/**
 * Returns "today" as YYYY-MM-DD in the target timezone (defaults to Asia/Kolkata / IST).
 * Uses cached DateTimeFormat instance for ultra-fast formatting (<0.01ms).
 */
function getLocalDateStr(date = new Date(), timeZone = TIMEZONE) {
  if (timeZone === TIMEZONE) return DATE_FORMATTER.format(date);
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/**
 * Returns info about regular Thursday submission availability in target timezone (IST):
 *  - openThursday: YYYY-MM-DD string of the open Thursday session (or null if closed until 8 PM)
 *  - opensAt8pmToday: boolean (true if today is Thursday before 8 PM)
 *  - nextThursdayDate: YYYY-MM-DD string of next Thursday
 */
function getThursdaySubmissionStatus(now = new Date(), timeZone = TIMEZONE) {
  const todayStr = getLocalDateStr(now, timeZone);

  const dayStr = timeZone === TIMEZONE ? DAY_FORMATTER.format(now) : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
  const day = DAY_MAP[dayStr] ?? 0;

  const hourStr = timeZone === TIMEZONE ? HOUR_FORMATTER.format(now) : new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).format(now);
  const hour = parseInt(hourStr, 10);

  const daysUntilNextThu = (4 - day + 7) % 7 || 7;
  const [y, m, d] = todayStr.split('-').map(Number);
  const nextThuObj = new Date(y, m - 1, d + daysUntilNextThu);
  const nextThuStr = getLocalDateStr(nextThuObj, timeZone);

  if (day === 4 && hour < 20) {
    return {
      openThursday: null,
      opensAt8pmToday: true,
      nextThursdayDate: nextThuStr
    };
  }

  return {
    openThursday: nextThuStr,
    opensAt8pmToday: false,
    nextThursdayDate: nextThuStr
  };
}

function getNextThursday() {
  return getThursdaySubmissionStatus().nextThursdayDate;
}

/**
 * Normalise a name for duplicate-detection:
 *   - trim leading/trailing whitespace
 *   - collapse internal runs of whitespace to a single space
 *   - convert to lower-case
 * Use this before comparing names to find existing records.
 */
function normalizeName(str) {
  return String(str || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function formatDateHuman(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-GB', options);
}

function timeSince(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  date.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = now - date;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return "Tomorrow";
    if (absDays < 7) return `In ${absDays} days`;
    if (absDays < 30) return `In ${Math.floor(absDays / 7)} week(s)`;
    if (absDays < 365) return `In ${Math.floor(absDays / 30)} month(s)`;
    return `In ${Math.floor(absDays / 365)} year(s)`;
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week(s) ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month(s) ago`;
  return `${Math.floor(diffDays / 365)} year(s) ago`;
}

module.exports = {
  DEITY_ORDER,
  SPEED_ORDER,
  deityOrderKey,
  getNextThursday,
  getThursdaySubmissionStatus,
  getLocalDateStr,
  normalizeName,
  formatDateHuman,
  timeSince
};
