import { Fragment, useEffect, useState } from "react";
import { deletePuzzle, fetchPuzzleStats, updatePuzzle, type PuzzleSummary } from "./adminApi";
import { PuzzleBuilder } from "./PuzzleBuilder";

function formatSeconds(value: number | null): string {
  if (value == null) return "—";
  if (value < 60) return `${value}s`;
  return `${Math.floor(value / 60)}m ${value % 60}s`;
}

function solveRate(puzzle: PuzzleSummary): string {
  if (puzzle.timesPlayed === 0) return "—";
  return `${Math.round((puzzle.timesSolved / puzzle.timesPlayed) * 100)}%`;
}

/** Editing form for one puzzle. Kept as its own component so each row's draft
 *  state disappears when the row closes, rather than lingering in a parent. */
function PuzzleEditor({
  puzzle,
  onSaved,
  onCancel,
}: {
  puzzle: PuzzleSummary;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(puzzle.name);
  const [hint, setHint] = useState(puzzle.hint);
  const [monochrome, setMonochrome] = useState(puzzle.monochrome);
  const [isActive, setIsActive] = useState(puzzle.isActive);
  const [timeLimit, setTimeLimit] = useState(
    puzzle.timeLimitSeconds == null ? "" : String(puzzle.timeLimitSeconds)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = timeLimit.trim();
    const seconds = trimmed === "" ? null : Number(trimmed);
    if (seconds != null && (!Number.isInteger(seconds) || seconds <= 0)) {
      setError("Time limit must be a whole number of seconds, or blank for none.");
      return;
    }

    setSaving(true);
    updatePuzzle(puzzle.id, { name, hint, monochrome, isActive, timeLimitSeconds: seconds })
      .then(() => onSaved())
      .catch((err) => {
        setError(err.message ?? "Could not save.");
        setSaving(false);
      });
  }

  return (
    <form className="admin-puzzle-editor" onSubmit={save}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <label>
        Hint shown to the child
        <input value={hint} onChange={(e) => setHint(e.target.value)} />
      </label>

      <label>
        Time limit (seconds — leave blank for no countdown)
        <input
          type="number"
          min={1}
          step={1}
          value={timeLimit}
          placeholder="No limit"
          onChange={(e) => setTimeLimit(e.target.value)}
        />
      </label>

      <label className="admin-checkbox">
        <input type="checkbox" checked={monochrome} onChange={(e) => setMonochrome(e.target.checked)} />
        Uncoloured bricks (all grey — colour is not graded)
      </label>

      <label className="admin-checkbox">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active (shown to participants)
      </label>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-editor-actions">
        <button type="submit" className="admin-button-primary" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" className="admin-secondary-button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PuzzlesTable() {
  const [puzzles, setPuzzles] = useState<PuzzleSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Which puzzle's bricks are open in the 3D builder — or "new" for a blank
   *  board. Separate from editingId, which is the metadata row form. */
  const [building, setBuilding] = useState<PuzzleSummary | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    fetchPuzzleStats()
      .then((data) => {
        setPuzzles(data.puzzles);
        setError(null);
      })
      .catch(() => setError("Could not load puzzles."));
  }

  useEffect(load, []);

  const handleDelete = async (puzzle: PuzzleSummary) => {
    if (!window.confirm(`Delete "${puzzle.name}"? This removes all recorded play history for it too.`)) return;
    setDeletingId(puzzle.id);
    try {
      await deletePuzzle(puzzle.id);
      load();
    } catch {
      setError("Could not delete puzzle.");
    } finally {
      setDeletingId(null);
    }
  };

  if (error) {
    return (
      <div>
        <p className="admin-error">{error}</p>
        <button type="button" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  if (!puzzles) return <p>Loading...</p>;

  if (building) {
    return (
      <PuzzleBuilder
        editing={building === "new" ? null : building}
        onCancel={() => setBuilding(null)}
        onDone={() => {
          setBuilding(null);
          load();
        }}
      />
    );
  }

  return (
    <>
    <div className="admin-toolbar">
      <button type="button" className="admin-button-primary" onClick={() => setBuilding("new")}>
        New puzzle
      </button>
    </div>
    <table className="admin-table">
      <thead>
        <tr>
          <th>Puzzle</th>
          <th>Bricks</th>
          <th>Played</th>
          <th>Children</th>
          <th>Solve rate</th>
          <th>Usual tries</th>
          <th>Usual time</th>
          <th>Timer</th>
          <th>Colour</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {puzzles.map((puzzle) => (
          <Fragment key={puzzle.id}>
            <tr className={puzzle.isActive ? undefined : "admin-row-inactive"}>
              <td>
                {puzzle.name}
                {!puzzle.isActive && <span className="admin-badge in-progress">Hidden</span>}
              </td>
              <td>{puzzle.bricks}</td>
              <td>{puzzle.timesPlayed}</td>
              <td>{puzzle.distinctParticipants}</td>
              <td>{solveRate(puzzle)}</td>
              <td>{puzzle.medianAttemptsToSolve ?? "—"}</td>
              <td>{formatSeconds(puzzle.medianSolveSeconds)}</td>
              <td>{formatSeconds(puzzle.timeLimitSeconds)}</td>
              <td>{puzzle.monochrome ? "Grey" : "Coloured"}</td>
              <td className="admin-row-actions">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => setEditingId(editingId === puzzle.id ? null : puzzle.id)}
                >
                  {editingId === puzzle.id ? "Close" : "Edit"}
                </button>
                <button type="button" className="admin-secondary-button" onClick={() => setBuilding(puzzle)}>
                  Bricks
                </button>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => handleDelete(puzzle)}
                  disabled={deletingId === puzzle.id}
                  aria-label={`Delete ${puzzle.name}`}
                >
                  {deletingId === puzzle.id ? "Deleting..." : "Delete"}
                </button>
              </td>
            </tr>
            {editingId === puzzle.id && (
              <tr>
                <td colSpan={10}>
                  <PuzzleEditor
                    puzzle={puzzle}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      load();
                    }}
                  />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
    </>
  );
}
