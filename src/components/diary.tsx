"use client";

import type { DiaryEntry } from "@/components/shared";

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date, now: Date) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(now)) return "Today";
  if (dayKey(date) === dayKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function groupDiaryByDay(entries: DiaryEntry[], now = new Date()) {
  const groups: { key: string; label: string; entries: DiaryEntry[] }[] = [];
  const sorted = [...entries].sort(
    (a, b) => new Date(b.eatenAt).getTime() - new Date(a.eatenAt).getTime(),
  );
  for (const entry of sorted) {
    const date = new Date(entry.eatenAt);
    const key = dayKey(date);
    const group = groups.at(-1);
    if (group?.key === key) group.entries.push(entry);
    else groups.push({ key, label: dayLabel(date, now), entries: [entry] });
  }
  return groups;
}

export function DiaryHistory({ entries }: { entries: DiaryEntry[] }) {
  const groups = groupDiaryByDay(entries);
  return (
    <div className="diary-history">
      {groups.map((group) => (
        <section key={group.key} className="diary-day" aria-labelledby={`diary-day-${group.key}`}>
          <h3 id={`diary-day-${group.key}`} className="diary-day-title">
            {group.label}
            <span className="muted">
              {" "}
              · {group.entries.length} {group.entries.length === 1 ? "food" : "foods"}
            </span>
          </h3>
          <ul className="diary-entries">
            {group.entries.map((entry) => (
              <li className="diary-entry" key={entry.id}>
                <div className="diary-entry-head">
                  <strong className="diary-entry-food">{entry.food.name}</strong>
                  <time className="diary-entry-time" dateTime={entry.eatenAt}>
                    {new Date(entry.eatenAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <dl className="diary-entry-facts">
                  <div>
                    <dt>Preparation</dt>
                    <dd>{entry.preparation}</dd>
                  </div>
                  <div>
                    <dt>Texture</dt>
                    <dd>{entry.texture}</dd>
                  </div>
                  {entry.amount && (
                    <div>
                      <dt>Amount</dt>
                      <dd>{entry.amount}</dd>
                    </div>
                  )}
                </dl>
                {entry.reaction && (
                  <p className="diary-entry-reaction">
                    <strong>Observed:</strong> {entry.reaction}
                  </p>
                )}
                {entry.notes && <p className="diary-entry-notes">{entry.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
