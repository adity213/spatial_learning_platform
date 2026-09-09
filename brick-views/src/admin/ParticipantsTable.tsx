import { useEffect, useState } from "react";
import { AdminApiError, createParticipant, fetchParticipants, type ParticipantSummary } from "./adminApi";

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function ParticipantsTable({ onSelect }: { onSelect: (id: string) => void }) {
  const [participants, setParticipants] = useState<ParticipantSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<{ name: string; accessCode: string } | null>(null);

  const load = () => {
    fetchParticipants()
      .then((data) => {
        setParticipants(data.participants);
        setError(null);
      })
      .catch((err) => {
        setError(
          err instanceof AdminApiError && err.status === 401
            ? "Not authorized."
            : "Could not load participants."
        );
      });
  };

  useEffect(load, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const created = await createParticipant(trimmed);
      setJustCreated({ name: created.name, accessCode: created.accessCode });
      setNewName("");
      load();
    } catch {
      setError("Could not create participant.");
    } finally {
      setCreating(false);
    }
  };

  if (error) {
    return (
      <div className="admin-error">
        <p>{error}</p>
        <button type="button" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  if (!participants) return <p>Loading...</p>;

  return (
    <div>
      <form className="admin-add-form" onSubmit={handleAdd}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Participant name"
          aria-label="Participant name"
        />
        <button type="submit" disabled={creating || !newName.trim()}>
          {creating ? "Adding..." : "Add participant"}
        </button>
      </form>

      {justCreated && (
        <p className="admin-new-code">
          Access code for {justCreated.name}: <strong>{justCreated.accessCode}</strong>
        </p>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Solved</th>
            <th>Attempted</th>
            <th>Total time</th>
            <th>Hints used</th>
            <th>Last active</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} className="admin-row" onClick={() => onSelect(p.id)}>
              <td>{p.name}</td>
              <td>{p.accessCode}</td>
              <td>{p.puzzlesSolved}</td>
              <td>{p.puzzlesAttempted}</td>
              <td>{formatDuration(p.totalTimeSeconds)}</td>
              <td>{p.hintsUsed}</td>
              <td>{formatDate(p.lastActiveAt)}</td>
            </tr>
          ))}
          {participants.length === 0 && (
            <tr>
              <td colSpan={7}>No participants yet — add one above.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
