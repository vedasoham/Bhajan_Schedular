const DEITY_ORDER = [
  "Ganesha", "Guru", "Mata", "SarvaDharma",
  "Sai", "Shiva", "Krishna", "Rama", "Narayana", "Vitthala", "Hanuman"
];

const SPEED_ORDER = { "slow": 0, "medium": 1, "fast": 2 };

function deityOrderKey(deity) {
  const index = DEITY_ORDER.findIndex(d => d.toLowerCase() === deity.toLowerCase());
  return index !== -1 ? index : DEITY_ORDER.length;
}

/**
 * Returns "today" as YYYY-MM-DD using the LOCAL timezone (not UTC).
 * Using new Date().toISOString().split('T')[0] gives the UTC date, which is
 * wrong for IST (UTC+5:30) — at 00:30 IST it would return yesterday's date.
 */
function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the date of the NEXT open Thursday session as YYYY-MM-DD.
 *
 * Session Auto-Lock Rule:
 * - A Thursday session (e.g. 2026-08-13) is open for singer submissions
 *   up until Wednesday 11:59 PM (2026-08-12).
 * - As soon as Thursday 12:00 AM arrives (today >= 2026-08-13), the Thursday
 *   session is automatically LOCKED for non-admin submissions and moves into History.
 * - Therefore, on Thursday (or Fri, Sat, Sun, Mon, Tue, Wed), getNextThursday()
 *   returns the upcoming Thursday that has NOT yet reached Thursday 12:00 AM!
 */
/**
 * Returns info about regular Thursday submission availability:
 *  - openThursday: YYYY-MM-DD string of the open Thursday session (or null if closed until 8 PM)
 *  - opensAt8pmToday: boolean (true if today is Thursday before 8 PM)
 *  - nextThursdayDate: YYYY-MM-DD string of next Thursday
 */
function getThursdaySubmissionStatus(now = new Date()) {
  const day = now.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const hour = now.getHours(); // 0..23

  const daysUntilNextThu = (4 - day + 7) % 7 || 7;
  const nextThuObj = new Date(now);
  nextThuObj.setDate(now.getDate() + daysUntilNextThu);
  const nextThuStr = getLocalDateStr(nextThuObj);

  if (day === 4 && hour < 20) {
    // Today is Thursday before 8:00 PM: next Thursday is NOT open yet for non-admins
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
