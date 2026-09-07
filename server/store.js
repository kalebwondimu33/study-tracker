const Entry = require("./models/entry");
const { Settings, DEFAULT_SETTINGS } = require("./models/settings");

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(key, amount) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return todayKey(date);
}

function weekdayName(key) {
  return parseDateKey(key).toLocaleDateString("en-US", { weekday: "long" });
}

function startOfWeek(key) {
  const date = parseDateKey(key);
  const day = date.getDay();
  const offset = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - offset);
  return todayKey(date);
}

function isStudied(entry) {
  return entry.status === "complete" || entry.status === "partial";
}

function toClient(doc) {
  if (!doc) return null;
  const entry = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  delete entry._id;
  return entry;
}

function computeStreaks(entries) {
  const studied = new Set(entries.filter(isStudied).map((entry) => entry.date));
  if (studied.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const today = todayKey();
  let cursor = studied.has(today) ? today : addDays(today, -1);
  let currentStreak = 0;

  while (studied.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...studied].sort();
  let longestStreak = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === addDays(sorted[i - 1], 1)) {
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 1;
    }
  }

  return { currentStreak, longestStreak };
}

function normalizeEntry(payload, existing = {}) {
  const date = String(payload.date || existing.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("A valid date is required.");
  }

  const status = String(payload.status || existing.status || "complete").toLowerCase();
  if (!["complete", "partial", "skipped"].includes(status)) {
    throw new Error("Status must be complete, partial, or skipped.");
  }

  const hours = Number(payload.hours ?? existing.hours ?? 0);
  if (Number.isNaN(hours) || hours < 0 || hours > 24) {
    throw new Error("Hours must be between 0 and 24.");
  }

  const now = new Date().toISOString();
  return {
    id: existing.id || `e-${date}`,
    date,
    hours,
    learned: String(payload.learned ?? existing.learned ?? "").trim(),
    status,
    question: String(payload.question ?? existing.question ?? "").trim(),
    answer: String(payload.answer ?? existing.answer ?? "").trim(),
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
}

async function getSettings() {
  const settings = await Settings.findOne({ key: "default" }).lean();
  if (!settings) {
    return { ...DEFAULT_SETTINGS };
  }
  const { key, _id, ...rest } = settings;
  return { ...DEFAULT_SETTINGS, ...rest };
}

async function saveSettings(payload) {
  const current = await getSettings();
  const next = { ...current };

  if (payload.title != null) next.title = String(payload.title).trim() || next.title;
  if (payload.subtitle != null) next.subtitle = String(payload.subtitle);
  if (payload.targetHoursPerDay != null) {
    const hours = Number(payload.targetHoursPerDay);
    if (Number.isNaN(hours) || hours <= 0 || hours > 24) {
      throw new Error("Target hours must be between 0 and 24.");
    }
    next.targetHoursPerDay = hours;
  }
  if (payload.targetDaysPerWeek != null) {
    const days = Number(payload.targetDaysPerWeek);
    if (!Number.isInteger(days) || days < 1 || days > 7) {
      throw new Error("Target days must be an integer from 1 to 7.");
    }
    next.targetDaysPerWeek = days;
  }

  const saved = await Settings.findOneAndUpdate(
    { key: "default" },
    { ...next, key: "default" },
    { new: true, upsert: true }
  ).lean();

  const { key, _id, ...rest } = saved;
  return rest;
}

async function getEntries() {
  const entries = await Entry.find().sort({ date: -1 });
  return entries.map(toClient);
}

async function getEntryByDate(date) {
  return toClient(await Entry.findOne({ date }));
}

async function getEntryById(id) {
  return toClient(await Entry.findOne({ id }));
}

async function createEntry(payload) {
  const exists = await Entry.findOne({ date: payload.date });
  if (exists) {
    const error = new Error("An entry already exists for that date. Edit it instead.");
    error.status = 409;
    throw error;
  }

  const entry = normalizeEntry(payload);
  const created = await Entry.create(entry);
  return toClient(created);
}

async function updateEntry(id, payload) {
  const existing = await getEntryById(id);
  if (!existing) {
    const error = new Error("Entry not found.");
    error.status = 404;
    throw error;
  }

  const next = normalizeEntry(payload, existing);
  const clash = await Entry.findOne({ date: next.date, id: { $ne: next.id } });
  if (clash) {
    const error = new Error("Another entry already uses that date.");
    error.status = 409;
    throw error;
  }

  const saved = await Entry.findOneAndUpdate({ id }, next, { new: true, runValidators: true });
  return toClient(saved);
}

async function deleteEntry(id) {
  const result = await Entry.deleteOne({ id });
  if (result.deletedCount === 0) {
    const error = new Error("Entry not found.");
    error.status = 404;
    throw error;
  }
}

async function getStats() {
  const [entries, settings] = await Promise.all([getEntries(), getSettings()]);
  const studied = entries.filter(isStudied);
  const totalHours = Number(
    entries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0).toFixed(1)
  );
  const { currentStreak, longestStreak } = computeStreaks(entries);
  const weekStart = startOfWeek(todayKey());
  const daysThisWeek = studied.filter((entry) => entry.date >= weekStart).length;
  const openQuestions = entries.filter(
    (entry) => entry.question?.trim() && !entry.answer?.trim()
  ).length;

  return {
    totalHours,
    daysStudied: studied.length,
    currentStreak,
    longestStreak,
    daysThisWeek,
    targetHoursPerDay: settings.targetHoursPerDay,
    targetDaysPerWeek: settings.targetDaysPerWeek,
    weekProgress: Math.min(1, daysThisWeek / settings.targetDaysPerWeek),
    openQuestions,
    totalEntries: entries.length,
  };
}

module.exports = {
  weekdayName,
  getSettings,
  saveSettings,
  getEntries,
  getEntryByDate,
  createEntry,
  updateEntry,
  deleteEntry,
  getStats,
};
