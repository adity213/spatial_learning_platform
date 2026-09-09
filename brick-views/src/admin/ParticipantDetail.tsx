import { useEffect, useState } from "react";
import { fetchParticipantDetail, type ParticipantDetail as ParticipantDetailData } from "./adminApi";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatGap(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/** Time the participant spent before submitting this event — the gap since
 *  the previous attempt/hint, or since the session started for the first one.
 *  Derived from timestamps we already store, so it also applies to attempts
 *  recorded before this was displayed. */
function secondsSpentOn(timestamp: string, previous: string): number {
  return Math.max(0, Math.round((new Date(timestamp).getTime() - new Date(previous).getTime()) / 1000));
}

export function ParticipantDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<ParticipantDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Remounted by `key={id}` in AdminApp whenever the selected participant
  // changes, so state below always starts fresh — no manual reset needed.
  useEffect(() => {
    fetchParticipantDetail(id)
      .then(setData)
      .catch(() => setError("Could not load this participant."));
  }, [id]);

  return (
    <div>
      <button type="button" className="admin-back-button" onClick={onBack}>
        ← Back to participants
      </button>

      {error && <p className="admin-error">{error}</p>}
      {!error && !data && <p>Loading...</p>}

      {data && (
        <>
          <h2>
            {data.name} <span className="admin-access-code">({data.accessCode})</span>
          </h2>

          {data.sessions.length === 0 && <p>No puzzles attempted yet.</p>}

          {data.sessions.map((session) => (
            <section key={session.id} className="admin-session">
              <h3>
                {session.puzzleName}{" "}
                <span className={`admin-badge ${session.isSolved ? "solved" : "in-progress"}`}>
                  {session.isSolved ? "Solved" : "In progress"}
                </span>
              </h3>
              <p className="admin-session-meta">
                Started {formatDate(session.startedAt)}
                {session.totalTimeSeconds != null && ` — took ${session.totalTimeSeconds}s`}
              </p>

              <ol className="admin-timeline">
                {session.timeline.map((event, i) => {
                  const previous = session.timeline[i - 1];
                  const spent = secondsSpentOn(event.timestamp, previous ? previous.timestamp : session.startedAt);
                  return (
                    <li key={i} className={`admin-timeline-event ${event.type}`}>
                      {event.type === "attempt" ? (
                        <span>
                          Attempt {event.attemptNumber}: {event.isCorrect ? "solved" : "not yet"} — took{" "}
                          {formatGap(spent)}
                        </span>
                      ) : (
                        <span>
                          Hint requested (attempt {event.attemptNumber}) after {formatGap(spent)}: "
                          {event.aiResponse}"
                        </span>
                      )}
                      <time title={formatDate(event.timestamp)}>{formatDate(event.timestamp)}</time>
                    </li>
                  );
                })}
                {session.timeline.length === 0 && <li>No activity recorded.</li>}
              </ol>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
