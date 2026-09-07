import { buildHeatmap, formatLongDate, levelForEntry } from "../utils";

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function Heatmap({
  entries,
  stats,
  selectedDate,
  onSelect,
}) {
  const { weeks, months } = buildHeatmap(entries);
  const studied = entries.filter((entry) => entry.status !== "skipped").length;

  return (
    <section className="card heatmap-card">
      <div className="heatmap-head">
        <div>
          <h2>{studied} days studied in the last year</h2>
          <p className="muted">Click a square to log or review that day.</p>
        </div>
      </div>

      <div className="heatmap-wrap">
        <div className="heatmap">
          <div className="day-labels">
            <span />
            {DAY_LABELS.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>

          <div>
            <div className="month-row">
              {months.map((month, index) => (
                <span key={`${month}-${index}`}>{month}</span>
              ))}
            </div>
            <div className="weeks">
              {weeks.map((week, weekIndex) => (
                <div className="week" key={weekIndex}>
                  {week.map((day) => {
                    const level = levelForEntry(day.entry, stats.targetHoursPerDay);
                    const className = [
                      "cell",
                      day.future ? "future" : "",
                      selectedDate === day.date ? "selected" : "",
                      level === "skipped" ? "skipped" : level ? `l${level}` : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const title = day.entry
                      ? `${formatLongDate(day.date)} • ${day.entry.hours}h • ${day.entry.status}`
                      : `${formatLongDate(day.date)} • no study logged`;

                    return (
                      <button
                        key={day.date}
                        type="button"
                        className={className}
                        title={title}
                        disabled={day.future}
                        onClick={() => onSelect(day.date)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="legend">
        <span>Less</span>
        <div className="legend-scale">
          <span className="cell" />
          <span className="cell l1" />
          <span className="cell l2" />
          <span className="cell l3" />
          <span className="cell l4" />
        </div>
        <span>More</span>
        <span className="cell skipped" title="Skipped day" />
        <span>Skipped</span>
      </div>

      <div className="week-bar">
        <header>
          <span>This week</span>
          <span>
            {stats.daysThisWeek} / {stats.targetDaysPerWeek} target days
          </span>
        </header>
        <div className="track">
          <div className="fill" style={{ width: `${Math.round(stats.weekProgress * 100)}%` }} />
        </div>
      </div>
    </section>
  );
}
