import { useState, useEffect } from "react";
import "../styles/admin.css";
import { ParticipantsTable } from "./ParticipantsTable";
import { ParticipantDetail } from "./ParticipantDetail";
import { PuzzlesTable } from "./PuzzlesTable";
import { AdminUsers } from "./AdminUsers";
import { AdminLogin } from "./AdminLogin";
import { fetchParticipants, AdminApiError } from "./adminApi";

type Tab = "participants" | "puzzles" | "admins";

export function AdminApp() {
  const [tab, setTab] = useState<Tab>("participants");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Ping an admin endpoint to check if we have a valid cookie
    fetchParticipants()
      .then(() => setIsAuthenticated(true))
      .catch((err) => {
        if (err instanceof AdminApiError && err.status === 401) {
          setIsAuthenticated(false);
        } else {
          // Some other error, but we'll assume logged out for safety
          setIsAuthenticated(false);
        }
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) return <div>Loading...</div>;
  if (isAuthenticated === false) return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;

  return (
    <div className="admin-shell">
      <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1>Spatial Learning – Admin</h1>
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
            <button
              type="button"
              className={tab === "admins" ? "active" : undefined}
              onClick={() => setTab("admins")}
            >
              Admins
            </button>
          </nav>
        </div>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
          Logout
        </button>
      </header>
      <main className="admin-main">
        {tab === "puzzles" && <PuzzlesTable />}
        {tab === "admins" && <AdminUsers />}
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
