const API_BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      signal: controller.signal,
      ...options,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The API did not respond. Is the Node server running on port 4000?");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

export const api = {
  getSettings: () => request("/api/settings"),
  saveSettings: (body) => request("/api/settings", { method: "PUT", body: JSON.stringify(body) }),
  getStats: () => request("/api/stats"),
  getEntries: () => request("/api/entries"),
  createEntry: (body) => request("/api/entries", { method: "POST", body: JSON.stringify(body) }),
  updateEntry: (id, body) =>
    request(`/api/entries/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteEntry: (id) => request(`/api/entries/${id}`, { method: "DELETE" }),
};
