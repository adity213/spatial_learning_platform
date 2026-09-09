import { useEffect, useState } from "react";
import {
  AdminApiError,
  createParticipant,
  deleteParticipant,
  fetchParticipants,
  type ParticipantSummary,
} from "./adminApi";

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

// Quotes any field containing a comma, quote or newline, doubling embedded
// quotes — the standard CSV escaping Excel/Sheets/LibreOffice all expect.
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadParticipantsCsv(participants: ParticipantSummary[]): void {
  const headers = [
    "Name",
    "Access Code",
    "Created At",
    "Puzzles Solved",
    "Puzzles Attempted",
    "Total Time (s)",
    "Hints Used",
    "Last Active",
  ];
  const rows = participants.map((p) => [
    p.name,
    p.accessCode,
    p.createdAt,
    p.puzzlesSolved,
    p.puzzlesAttempted,
    p.totalTimeSeconds,
    p.hintsUsed,
    p.lastActiveAt ?? "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");

  // Excel needs a UTF-8 BOM to not mangle non-ASCII names.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `participants-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ParticipantsTable({ onSelect }: { onSelect: (id: string) => void }) {
  const [participants, setParticipants] = useState<ParticipantSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<{ name: string; accessCode: string } | null>(null);

  const [bulkNames, setBulkNames] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<
    { name: string; accessCode: string; error?: string }[] | null
  >(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    // Pasting a spreadsheet column gives one name per line; tolerate stray
    // commas/tabs too in case someone pastes a row instead of a column.
    const names = bulkNames
      .split(/[\r\n,\t]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length || bulkRunning) return;

    setBulkRunning(true);
    setBulkResults(null);
    const results: { name: string; accessCode: string; error?: string }[] = [];

    // Sequential, not Promise.all: each create retries on access-code
    // collisions against the same table, so racing N of them just makes
    // those retries more likely to collide with each other too.
    for (const name of names) {
      try {
        const created = await createParticipant(name);
        results.push({ name: created.name, accessCode: created.accessCode });
      } catch {
        results.push({ name, accessCode: "", error: "Failed" });
      }
    }

    setBulkResults(results);
    setBulkNames("");
    setBulkRunning(false);
    load();
  };

  const handleDelete = async (e: React.MouseEvent, p: ParticipantSummary) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${p.name}? This removes all of their session history too.`)) return;
    setDeletingId(p.id);
    try {
      await deleteParticipant(p.id);
      load();
    } catch {
      setError("Could not delete participant.");
    } finally {
      setDeletingId(null);
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
        <button type="submit" className="admin-button-primary" disabled={creating || !newName.trim()}>
          {creating ? "Adding..." : "Add participant"}
        </button>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={() => downloadParticipantsCsv(participants)}
          disabled={participants.length === 0}
        >
          Export CSV
        </button>
      </form>

      {justCreated && (
        <p className="admin-new-code">
          Access code for {justCreated.name}: <strong>{justCreated.accessCode}</strong>
        </p>
      )}

      <details className="admin-bulk-add">
        <summary>Add multiple participants</summary>
        <form onSubmit={handleBulkAdd}>
          <textarea
            className="admin-bulk-textarea"
            value={bulkNames}
            onChange={(e) => setBulkNames(e.target.value)}
            placeholder={"Paste names, one per line\nAva\nNoah\nMia"}
            aria-label="Participant names, one per line"
            rows={5}
          />
          <button type="submit" className="admin-button-primary" disabled={bulkRunning || !bulkNames.trim()}>
            {bulkRunning ? "Adding..." : "Add all"}
          </button>
        </form>

        {bulkResults && (
          <table className="admin-table admin-bulk-results">
            <thead>
              <tr>
                <th>Name</th>
                <th>Access code</th>
              </tr>
            </thead>
            <tbody>
              {bulkResults.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.error ? <span className="admin-error">{r.error}</span> : r.accessCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>

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
            <th></th>
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
              <td className="admin-row-actions">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={(e) => handleDelete(e, p)}
                  disabled={deletingId === p.id}
                  aria-label={`Delete ${p.name}`}
                >
                  {deletingId === p.id ? "Deleting..." : "Delete"}
                </button>
              </td>
            </tr>
          ))}
          {participants.length === 0 && (
            <tr>
              <td colSpan={8}>No participants yet — add one above.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
