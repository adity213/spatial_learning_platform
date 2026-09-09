import { useEffect, useState } from "react";
import { Stage } from "../scene/Stage";
import { BuilderTray } from "../ui/BuilderTray";
import { useSession } from "../state/session";
import { createPuzzle, updatePuzzle, type PuzzleSummary } from "./adminApi";
import type { BoardSize, Placement } from "../core/types";

const BLANK_BOARD: BoardSize = { width: 4, depth: 4, height: 4 };

export interface EditingPuzzle extends PuzzleSummary {
  board: BoardSize;
  solution: Placement[];
}

export function PuzzleBuilder({
  editing,
  onDone,
  onCancel,
}: {
  editing: EditingPuzzle | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const startBuilder = useSession((state) => state.startBuilder);
  const placed = useSession((state) => state.placed);
  const mode = useSession((state) => state.mode);
  const rotation = useSession((state) => state.rotation);
  const rotateCW = useSession((state) => state.rotateCW);
  const lastReject = useSession((state) => state.lastReject);

  const [id, setId] = useState(editing?.id ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [hint, setHint] = useState(editing?.hint ?? "");
  const [monochrome, setMonochrome] = useState(editing?.monochrome ?? false);
  const [board, setBoard] = useState<BoardSize>(editing?.board ?? BLANK_BOARD);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startBuilder({
      id: "draft",
      name: "Draft",
      hint: "",
      board,
      solution: editing?.solution ?? [],
      monochrome,
    });
  }, [board, monochrome, editing, startBuilder]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;

      const { rotateCW, mode } = useSession.getState();

      switch (e.key) {
        case 'r':
        case 'R':
          rotateCW();
          break;
        case 'e':
        case 'E':
          useSession.setState({ mode: mode === 'build' ? 'erase' : 'build' });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function setDimension(axis: keyof BoardSize, value: string) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 12) return;
    setBoard((prev) => ({ ...prev, [axis]: n }));
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (placed.length === 0) {
      setError("Place at least one brick before saving.");
      return;
    }

    setSaving(true);
    const failed = (err: Error) => {
      setError(err.message || "Could not save.");
      setSaving(false);
    };

    if (editing) {
      updatePuzzle(editing.id, { name, hint, monochrome, solution: placed, board })
        .then(onDone)
        .catch(failed);
    } else {
      createPuzzle({ id, name, hint, board, solution: placed, monochrome }).then(onDone).catch(failed);
    }
  }

  return (
    <div 
      className="app-shell builder-app-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 140px)',
        minHeight: '600px',
        padding: 0,
        backgroundColor: 'transparent'
      }}
    >
      <main className="app-main" style={{ flex: 1, minHeight: 0 }}>
        <aside className="app-tray-region" aria-label="Builder tray">
          <BuilderTray />
        </aside>
        
        <section className="app-board-region" aria-label="3D board stage" style={{ position: 'relative' }}>
          <Stage />
          {lastReject && <p className="admin-error" style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '4px' }}>Can't place there: {lastReject.replace(/-/g, " ")}</p>}
        </section>
        
        <aside className="app-views-region builder-form-region" style={{ padding: '1rem', overflowY: 'auto' }}>
          <form className="builder-form" onSubmit={save} id="builder-form">
            <h3 style={{ marginTop: 0 }}>{editing ? `Editing "${editing.name}"` : "New puzzle"}</h3>

            {!editing && (
              <label>
                Id (permanent — sessions are recorded against it)
                <input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="easy-05"
                  pattern="[a-z0-9][a-z0-9\-]{1,40}"
                  required
                />
              </label>
            )}

            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>

            <label>
              Hint shown to the child
              <input value={hint} onChange={(e) => setHint(e.target.value)} />
            </label>

            <fieldset className="builder-board" style={{ margin: '1rem 0' }}>
              <legend>Board size</legend>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(["width", "depth", "height"] as const).map((axis) => (
                  <label key={axis} style={{ flex: 1 }}>
                    {axis}
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={board[axis]}
                      onChange={(e) => setDimension(axis, e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="admin-checkbox">
              <input type="checkbox" checked={monochrome} onChange={(e) => setMonochrome(e.target.checked)} />
              Uncoloured bricks (all grey — colour is not graded)
            </label>

            {error && <p className="admin-error">{error}</p>}

            <div className="admin-editor-actions" style={{ marginTop: '2rem' }}>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Create puzzle"}
              </button>
              <button type="button" className="admin-secondary-button" onClick={onCancel} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        </aside>
      </main>

      <footer className="app-footer" aria-label="Toolbar" style={{ flexShrink: 0 }}>
        <div className="toolbar">
          <div className="toolbar-left">
            <button type="button" className="toolbar-button" onClick={rotateCW}>
              Rotate ({rotation}°)
            </button>
            <div className="mode-segmented-group" role="radiogroup" aria-label="Tool mode">
              <button
                type="button"
                className={`mode-button ${mode === "build" ? "active" : ""}`}
                onClick={() => useSession.setState({ mode: "build" })}
                role="radio"
                aria-checked={mode === "build"}
              >
                Build
              </button>
              <button
                type="button"
                className={`mode-button ${mode === "erase" ? "active" : ""}`}
                onClick={() => useSession.setState({ mode: "erase" })}
                role="radio"
                aria-checked={mode === "erase"}
              >
                Erase
              </button>
            </div>
          </div>
          
          <div className="toolbar-center">
            <span className="builder-count">{placed.length} bricks placed</span>
          </div>
          
          <div className="toolbar-right">
            {/* Empty for symmetry, forms are handled on the right panel */}
          </div>
        </div>
      </footer>
    </div>
  );
}
