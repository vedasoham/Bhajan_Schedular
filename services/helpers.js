const DEITY_ORDER = [
  "Ganesha", "Guru", "Mata", "SarvaDharma", 
  "Sai", "Shiva", "Krishna", "Rama", "Narayana", "Vitthala", "Hanuman"
];

const SPEED_ORDER = { "slow": 0, "medium": 1, "fast": 2 };

function deityOrderKey(deity) {
  const index = DEITY_ORDER.findIndex(d => d.toLowerCase() === deity.toLowerCase());
  return index !== -1 ? index : DEITY_ORDER.length;
}

function getNextThursday() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilThursday = (4 - day + 7) % 7;
  const nextThursday = new Date(today);
  nextThursday.setDate(today.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));
  const y = nextThursday.getFullYear();
  const m = String(nextThursday.getMonth() + 1).padStart(2, '0');
  const d = String(nextThursday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  date.setHours(0,0,0,0);
  now.setHours(0,0,0,0);

  const diffTime = now - date;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return "Tomorrow";
    if (absDays < 7) return `In ${absDays} days`;
    if (absDays < 30) return `In ${Math.floor(absDays/7)} week(s)`;
    if (absDays < 365) return `In ${Math.floor(absDays/30)} month(s)`;
    return `In ${Math.floor(absDays/365)} year(s)`;
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays/7)} week(s) ago`;
  if (diffDays < 365) return `${Math.floor(diffDays/30)} month(s) ago`;
  return `${Math.floor(diffDays/365)} year(s) ago`;
}
module.exports = {
    DEITY_ORDER,
    SPEED_ORDER,
    deityOrderKey,
    getNextThursday,
    formatDateHuman,
    timeSince
};
