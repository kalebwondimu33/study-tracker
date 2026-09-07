export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(key, amount) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return todayKey(date);
}

export function formatLongDate(key) {
  return parseDateKey(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function weekdayShort(key) {
  return parseDateKey(key).toLocaleDateString("en-US", { weekday: "short" });
}

export function levelForEntry(entry, targetHours) {
  if (!entry) return 0;
  if (entry.status === "skipped") return "skipped";
  const hours = Number(entry.hours) || 0;
  if (hours <= 0) return 1;
  if (hours < targetHours) return 2;
  if (hours < targetHours * 1.5) return 3;
  return 4;
}

export function buildHeatmap(entries, endKey = todayKey()) {
  const byDate = Object.fromEntries(entries.map((entry) => [entry.date, entry]));
  const end = parseDateKey(endKey);
  const start = new Date(end);
  start.setDate(end.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());

  const weeks = [];
  const months = [];
  let cursor = todayKey(start);
  let lastMonth = "";

  while (cursor <= endKey || weeks.length === 0 || weeks[weeks.length - 1].length < 7) {
    if (weeks.length === 0 || weeks[weeks.length - 1].length === 7) {
      weeks.push([]);
      const month = parseDateKey(cursor).toLocaleDateString("en-US", { month: "short" });
      months.push(month !== lastMonth ? month : "");
      lastMonth = month;
    }

    weeks[weeks.length - 1].push({
      date: cursor,
      entry: byDate[cursor] || null,
      future: cursor > endKey,
    });

    cursor = addDays(cursor, 1);
    if (weeks.length > 54) break;
  }

  return { weeks, months };
}
