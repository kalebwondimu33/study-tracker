const mongoose = require("mongoose");

const DEFAULT_SETTINGS = {
  key: "default",
  title: "JavaScript Study Log",
  subtitle: "Consistency & Q&A Tracker",
  targetHoursPerDay: 2,
  targetDaysPerWeek: 5,
};

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    title: { type: String, default: "JavaScript Study Log" },
    subtitle: { type: String, default: "Consistency & Q&A Tracker" },
    targetHoursPerDay: { type: Number, default: 2 },
    targetDaysPerWeek: { type: Number, default: 5 },
  },
  { versionKey: false }
);

const Settings =
  mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

module.exports = { Settings, DEFAULT_SETTINGS };
