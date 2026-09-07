import { useEffect, useState } from "react";
import { toIsoDate, weekdayShort } from "../utils";

const EMPTY = {
  date: "",
  hours: 2,
  learned: "",
  status: "complete",
  question: "",
  answer: "",
};

export default function LogForm({
  selectedDate,
  entry,
  defaultHours,
  onSave,
  onDelete,
  busy,
  error,
}) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (entry) {
      setForm({
        date: toIsoDate(entry.date),
        hours: entry.hours,
        learned: entry.learned,
        status: entry.status,
        question: entry.question,
        answer: entry.answer,
      });
    } else {
      setForm({ ...EMPTY, date: toIsoDate(selectedDate), hours: defaultHours });
    }
  }, [entry, selectedDate, defaultHours]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      ...form,
      date: toIsoDate(form.date),
      hours: Number(form.hours),
    });
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Date
          <input
            type="date"
            value={toIsoDate(form.date)}
            onChange={(event) => update("date", toIsoDate(event.target.value))}
            required
          />
        </label>
        <label>
          Day
          <input value={form.date ? weekdayShort(form.date) : ""} readOnly />
        </label>
      </div>

      <div className="form-row">
        <label>
          Hours spent
          <input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={form.hours}
            onChange={(event) => update("hours", event.target.value)}
          />
        </label>
        <label>
          Consistency
          <select value={form.status} onChange={(event) => update("status", event.target.value)}>
            <option value="complete">Complete</option>
            <option value="partial">Partial</option>
            <option value="skipped">Skipped</option>
          </select>
        </label>
      </div>

      <label>
        What I learned / practiced
        <textarea
          value={form.learned}
          onChange={(event) => update("learned", event.target.value)}
          placeholder="Objects, functions, a kata, a concept..."
        />
      </label>

      <label>
        Question
        <textarea
          value={form.question}
          onChange={(event) => update("question", event.target.value)}
          placeholder="Anything you want to ask or remember later"
        />
      </label>

      <label>
        Answer
        <textarea
          value={form.answer}
          onChange={(event) => update("answer", event.target.value)}
          placeholder="Come back and fill this in"
        />
      </label>

      {error ? <p className="error">{error}</p> : null}

      <div className="form-actions">
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>
            {entry ? "Save changes" : "Log this day"}
          </button>
        </div>
        {entry ? (
          <button
            className="btn danger"
            type="button"
            disabled={busy}
            onClick={() => onDelete(entry)}
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
