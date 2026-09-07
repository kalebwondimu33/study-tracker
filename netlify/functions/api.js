const { connectDb } = require("../../server/db");
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
} = require("../../server/store");

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function apiPath(event) {
  let path = event.path || event.rawPath || "/";
  if (path.startsWith("/.netlify/functions/api")) {
    path = `/api${path.slice("/.netlify/functions/api".length)}`;
  }
  if (!path.startsWith("/api")) {
    path = `/api${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path.replace(/\/+$/, "") || "/api";
}

function parseBody(event) {
  if (event.body == null || event.body === "") return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function withMeta(entry) {
  return { ...entry, day: weekdayName(entry.date) };
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDb();
    const method = (
      event.httpMethod ||
      event.requestContext?.http?.method ||
      "GET"
    ).toUpperCase();
    const path = apiPath(event);
    const body = parseBody(event);

    if (path === "/api/health" && method === "GET") {
      return json(200, { ok: true, db: "mongodb" });
    }
    if (path === "/api/settings" && method === "GET") {
      return json(200, await getSettings());
    }
    if (path === "/api/settings" && method === "PUT") {
      return json(200, await saveSettings(body));
    }
    if (path === "/api/stats" && method === "GET") {
      return json(200, await getStats());
    }
    if (path === "/api/entries" && method === "GET") {
      return json(200, (await getEntries()).map(withMeta));
    }
    if (path === "/api/entries" && method === "POST") {
      return json(201, withMeta(await createEntry(body)));
    }

    const dateMatch = path.match(/^\/api\/entries\/(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch && method === "GET") {
      const entry = await getEntryByDate(dateMatch[1]);
      if (!entry) return json(404, { error: "No entry for that date." });
      return json(200, withMeta(entry));
    }

    const idMatch = path.match(/^\/api\/entries\/([^/]+)$/);
    if (idMatch && method === "PUT") {
      return json(200, withMeta(await updateEntry(decodeURIComponent(idMatch[1]), body)));
    }
    if (idMatch && method === "DELETE") {
      await deleteEntry(decodeURIComponent(idMatch[1]));
      return json(200, { ok: true });
    }

    return json(404, { error: `Not found: ${method} ${path}` });
  } catch (error) {
    return json(error.status || 400, { error: error.message || "Request failed." });
  }
};
