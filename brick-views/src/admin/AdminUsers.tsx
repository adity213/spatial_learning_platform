import React, { useState, useEffect } from 'react';

export function AdminUsers() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        setUsername('');
        setPassword('');
        fetchAdmins();
      } else {
        const data = await res.json();
        setError(data.error || 'Creation failed');
      }
    } catch (err) {
      setError('A network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>Manage admin users</h2>

      <div className="admin-card">
        <h3>Create new admin</h3>
        {error && <p className="admin-error">{error}</p>}
        <form className="admin-form" onSubmit={handleCreate}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="admin-button-primary" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create admin'}
          </button>
        </form>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Created at</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td>{admin.username}</td>
              <td>{new Date(admin.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {admins.length === 0 && (
            <tr>
              <td colSpan={2}>No admins created yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
