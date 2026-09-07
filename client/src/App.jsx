import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import Heatmap from "./components/Heatmap";
import LogForm from "./components/LogForm";
import { formatLongDate, todayKey } from "./utils";

const EMPTY_STATS = {
  totalHours: 0,
  daysStudied: 0,
  currentStreak: 0,
  longestStreak: 0,
  daysThisWeek: 0,
  targetHoursPerDay: 2,
  targetDaysPerWeek: 5,
  weekProgress: 0,
  openQuestions: 0,
};

export default function App() {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [entries, setEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.date === selectedDate) || null,
    [entries, selectedDate]
  );

  const questions = useMemo(
    () => entries.filter((entry) => entry.question?.trim()),
    [entries]
  );

  const load = useCallback(async () => {
    try {
      const [nextSettings, nextStats, nextEntries] = await Promise.all([
        api.getSettings(),
        api.getStats(),
        api.getEntries(),
      ]);
      setSettings(nextSettings);
      setStats(nextStats);
      setEntries(nextEntries);
      setDraftSettings(nextSettings);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") setSettingsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function saveEntry(payload) {
    setBusy(true);
    setError("");
    try {
      if (selectedEntry) {
        await api.updateEntry(selectedEntry.id, payload);
      } else {
        await api.createEntry(payload);
      }
      setSelectedDate(payload.date);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry(entry) {
    if (!window.confirm(`Delete the log for ${formatLongDate(entry.date)}?`)) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteEntry(entry.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.saveSettings(draftSettings);
      setSettingsOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="app">
        <section className="card heatmap-card">
          <h1>Loading your study log…</h1>
          <p className="muted">Pulling entries, streaks, and targets.</p>
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="app">
        <section className="card heatmap-card">
          <h1>Could not load the tracker</h1>
          <p className="muted">{loadError}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Personal study tracker</p>
          <h1>{settings?.title || "Study Log"}</h1>
          <p className="subtitle">{settings?.subtitle}</p>
        </div>
        <div className="actions">
          <button className="btn ghost" type="button" onClick={() => setSettingsOpen(true)}>
            Targets
          </button>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setSelectedDate(todayKey());
              setError("");
            }}
          >
            Log today
          </button>
        </div>
      </header>

      <section className="stats">
        <article className="card stat">
          <span>Current streak</span>
          <strong>{stats.currentStreak}</strong>
          <em>Longest {stats.longestStreak} days</em>
        </article>
        <article className="card stat">
          <span>Hours logged</span>
          <strong>{stats.totalHours}</strong>
          <em>{stats.targetHoursPerDay}h target / day</em>
        </article>
        <article className="card stat">
          <span>Days studied</span>
          <strong>{stats.daysStudied}</strong>
          <em>{stats.targetDaysPerWeek} days / week goal</em>
        </article>
        <article className="card stat">
          <span>Open questions</span>
          <strong>{stats.openQuestions}</strong>
          <em>{questions.length} asked in total</em>
        </article>
      </section>

      <Heatmap
        entries={entries}
        stats={stats}
        selectedDate={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          setError("");
        }}
      />

      <section className="grid">
        <article className="panel">
          <div className="section-head">
            <div>
              <h2>{selectedEntry ? "Edit day" : "Log a day"}</h2>
              <p className="muted">{formatLongDate(selectedDate)}</p>
            </div>
            {selectedEntry ? (
              <span className={`badge ${selectedEntry.status}`}>{selectedEntry.status}</span>
            ) : null}
          </div>
          <LogForm
            selectedDate={selectedDate}
            entry={selectedEntry}
            defaultHours={stats.targetHoursPerDay}
            onSave={saveEntry}
            onDelete={deleteEntry}
            busy={busy}
            error={error}
          />
        </article>

        <div>
          <article className="panel" style={{ marginBottom: 16 }}>
            <div className="section-head">
              <h2>Recent logs</h2>
            </div>
            {entries.length === 0 ? (
              <p className="empty">No days logged yet. Start with today.</p>
            ) : (
              <div className="entry-list">
                {entries.slice(0, 6).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`entry ${entry.date === selectedDate ? "active" : ""}`}
                    onClick={() => setSelectedDate(entry.date)}
                  >
                    <div className="entry-top">
                      <strong>{formatLongDate(entry.date)}</strong>
                      <span className={`badge ${entry.status}`}>{entry.status}</span>
                    </div>
                    <p className="muted">
                      {entry.hours}h
                      {entry.learned ? ` · ${entry.learned}` : " · no notes yet"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="section-head">
              <h2>Questions</h2>
            </div>
            {questions.length === 0 ? (
              <p className="empty">Questions you add on a day will show up here.</p>
            ) : (
              questions.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="question"
                  onClick={() => setSelectedDate(entry.date)}
                >
                  <div className="entry-top">
                    <span className="muted">{entry.date}</span>
                    <span className={`badge ${entry.answer ? "complete" : "open"}`}>
                      {entry.answer ? "answered" : "open"}
                    </span>
                  </div>
                  <p>{entry.question}</p>
                  {entry.answer ? <p className="muted">{entry.answer}</p> : null}
                </button>
              ))
            )}
          </article>
        </div>
      </section>

      {settingsOpen ? (
        <div className="overlay" onClick={() => setSettingsOpen(false)}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">Goals</p>
            <h2>Study targets</h2>
            <p className="muted" style={{ margin: "8px 0 18px" }}>
              These match the targets from your spreadsheet.
            </p>
            <form className="form" onSubmit={saveSettings}>
              <label>
                Tracker title
                <input
                  value={draftSettings?.title || ""}
                  onChange={(event) =>
                    setDraftSettings((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>
              <label>
                Target hours / day
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={draftSettings?.targetHoursPerDay || 2}
                  onChange={(event) =>
                    setDraftSettings((current) => ({
                      ...current,
                      targetHoursPerDay: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Target days / week
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={draftSettings?.targetDaysPerWeek || 5}
                  onChange={(event) =>
                    setDraftSettings((current) => ({
                      ...current,
                      targetDaysPerWeek: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <div className="actions">
                <button className="btn primary" type="submit" disabled={busy}>
                  Save targets
                </button>
                <button className="btn ghost" type="button" onClick={() => setSettingsOpen(false)}>
                  Close
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
