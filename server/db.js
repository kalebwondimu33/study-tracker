const mongoose = require("mongoose");
const Entry = require("./models/entry");
const { Settings, DEFAULT_SETTINGS } = require("./models/settings");

async function ensureSettings() {
  const settingsCount = await Settings.countDocuments();
  if (settingsCount === 0) {
    await Settings.create(DEFAULT_SETTINGS);
  }
}

async function connectDb() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/study-tracker";
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  await ensureSettings();
  const entryCount = await Entry.countDocuments();
  const safeUri = uri.replace(/\/\/([^:/@]+):([^@]+)@/, "//$1:***@");
  console.log(`Connected to MongoDB at ${safeUri} (${entryCount} entries)`);
}

module.exports = { connectDb };
