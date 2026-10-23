// Choosing *when* you want to go out: a day and a rough time of day.
// Everything else in the app (weather, opening hours, scoring) works from the
// single Date this produces.

export const SLOTS = [
  { key: "morning", label: "Morning", hour: 10, minute: 0 },
  { key: "midday", label: "Midday", hour: 12, minute: 0 },
  { key: "afternoon", label: "Afternoon", hour: 14, minute: 30 },
  { key: "late", label: "Late afternoon", hour: 16, minute: 30 },
];

export const NOW_SLOT = { key: "now", label: "Right now" };

export function isoDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** The next weekday (0 = Sunday … 6 = Saturday), today counting only if it is still early. */
export function nextWeekday(weekday, from = new Date()) {
  const d = new Date(from);
  const diff = (weekday - d.getDay() + 7) % 7;
  return addDays(d, diff === 0 && from.getHours() >= 17 ? 7 : diff);
}

/** Day chips offered in the interface. */
export function dayOptions(now = new Date()) {
  const sat = nextWeekday(6, now);
  const sun = nextWeekday(0, now);
  const options = [
    { key: "today", label: "Today", date: isoDate(now) },
    { key: "tomorrow", label: "Tomorrow", date: isoDate(addDays(now, 1)) },
  ];
  const taken = new Set(options.map((o) => o.date));
  if (!taken.has(isoDate(sat))) options.push({ key: "sat", label: "Saturday", date: isoDate(sat) });
  if (!taken.has(isoDate(sun))) options.push({ key: "sun", label: "Sunday", date: isoDate(sun) });
  return options;
}

/** Which slot makes sense by default, given the time now. */
export function defaultSlot(now = new Date()) {
  const h = now.getHours();
  if (h < 9) return "morning";
  if (h < 11) return "now";
  if (h < 13) return "midday";
  if (h < 15) return "now";
  if (h < 17) return "late";
  return "morning"; // evening: you are probably planning for tomorrow
}

/** Slots that have not already passed, when the chosen day is today. */
export function slotsFor(dateIso, now = new Date()) {
  const isToday = dateIso === isoDate(now);
  const list = isToday ? [NOW_SLOT, ...SLOTS.filter((s) => s.hour * 60 + s.minute > now.getHours() * 60 + now.getMinutes())] : [...SLOTS];
  return list.length ? list : [NOW_SLOT];
}

/** The actual moment to plan for. */
export function resolveWhen(dateIso, slotKey, now = new Date()) {
  if (slotKey === "now" || !slotKey) {
    return dateIso === isoDate(now) ? new Date(now) : atHour(dateIso, 10, 0);
  }
  const slot = SLOTS.find((s) => s.key === slotKey) || SLOTS[0];
  return atHour(dateIso, slot.hour, slot.minute);
}

function atHour(dateIso, hour, minute) {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

/** "today at 14:30", "Saturday morning", "24 Oct, 10:00" — for headings. */
export function describeWhen(when, dateIso, slotKey, now = new Date()) {
  const time = `${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
  const todayIso = isoDate(now);
  const tomorrowIso = isoDate(addDays(now, 1));
  if (dateIso === todayIso) return slotKey === "now" ? `right now (${time})` : `today at ${time}`;
  if (dateIso === tomorrowIso) return `tomorrow at ${time}`;
  const day = when.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
  return `${day}, ${time}`;
}

/** How many days ahead, to warn when the forecast does not reach that far. */
export function daysAhead(dateIso, now = new Date()) {
  const [y, m, d] = dateIso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}
