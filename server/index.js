require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const { connectDb } = require("./db");
const {
  weekdayName,
  getSettings,
  saveSettings,
  getEntries,
  getEntryByDate,
  createEntry,
  updateEntry,
  deleteEntry,
  getStats,
} = require("./store");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

function withMeta(entry) {
  return {
    ...entry,
    day: weekdayName(entry.date),
  };
}

function sendError(res, error) {
  const status = error.status || (error.name === "ValidationError" ? 400 : 500);
  res.status(status).json({ error: error.message || "Request failed." });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, db: "mongodb" });
});

app.get("/api/settings", async (_req, res) => {
  try {
    res.json(await getSettings());
  } catch (error) {
    sendError(res, error);
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    res.json(await saveSettings(req.body));
  } catch (error) {
    sendError(res, error.status ? error : Object.assign(error, { status: 400 }));
  }
});

app.get("/api/stats", async (_req, res) => {
  try {
    res.json(await getStats());
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/entries", async (_req, res) => {
  try {
    const entries = (await getEntries()).map(withMeta);
    res.json(entries);
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/entries/:date", async (req, res) => {
  try {
    const entry = await getEntryByDate(req.params.date);
    if (!entry) {
      return res.status(404).json({ error: "No entry for that date." });
    }
    res.json(withMeta(entry));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/entries", async (req, res) => {
  try {
    const entry = await createEntry(req.body);
    res.status(201).json(withMeta(entry));
  } catch (error) {
    sendError(res, error.status ? error : Object.assign(error, { status: 400 }));
  }
});

app.put("/api/entries/:id", async (req, res) => {
  try {
    const entry = await updateEntry(req.params.id, req.body);
    res.json(withMeta(entry));
  } catch (error) {
    sendError(res, error.status ? error : Object.assign(error, { status: 400 }));
  }
});

app.delete("/api/entries/:id", async (req, res) => {
  try {
    await deleteEntry(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

async function start() {
  await connectDb();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Study tracker running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start API:", error.message);
  process.exit(1);
});
