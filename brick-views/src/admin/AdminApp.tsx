import { useState } from "react";
import "../styles/admin.css";
import { ParticipantsTable } from "./ParticipantsTable";
import { ParticipantDetail } from "./ParticipantDetail";
import { PuzzlesTable } from "./PuzzlesTable";

/** Root of the /admin dashboard. Data access is protected server-side
 *  (see api/admin/_auth.ts) — this component has no login step of its
 *  own, since the browser's Basic Auth prompt handles that on first
 *  fetch. Navigation between the list and detail views is local state,
 *  not a real route — a single admin doesn't need a shareable URL for
 *  the detail view yet. */
type Tab = "participants" | "puzzles";

export function AdminApp() {
  const [tab, setTab] = useState<Tab>("participants");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <h1>Spatial Learning — Admin</h1>
        <nav className="admin-tabs">
          <button
            type="button"
            className={tab === "participants" ? "active" : undefined}
            onClick={() => setTab("participants")}
          >
            Participants
          </button>
          <button
            type="button"
            className={tab === "puzzles" ? "active" : undefined}
            onClick={() => setTab("puzzles")}
          >
            Puzzles
          </button>
        </nav>
      </header>
      <main className="admin-main">
        {tab === "puzzles" && <PuzzlesTable />}
        {tab === "participants" &&
          (selectedId ? (
            <ParticipantDetail key={selectedId} id={selectedId} onBack={() => setSelectedId(null)} />
          ) : (
            <ParticipantsTable onSelect={setSelectedId} />
          ))}
      </main>
    </div>
  );
}
