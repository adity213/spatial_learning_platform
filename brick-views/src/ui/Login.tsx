import { useState } from "react";
import { useSession } from "../state/session";

/** Gate shown before the puzzle app. Collects the participant's access
 *  code and opens the first backend Session via `useSession.login`. */
export function Login() {
  const [code, setCode] = useState("");
  const login = useSession((state) => state.login);
  const authLoading = useSession((state) => state.authLoading);
  const authError = useSession((state) => state.authError);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || authLoading) return;
    login(trimmed);
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">Enter your code</h1>
        <input
          className="login-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="Access code"
          placeholder="Access code"
        />
        <button type="submit" className="login-button" disabled={authLoading || !code.trim()}>
          {authLoading ? "Checking..." : "Start"}
        </button>
        {authError && (
          <span className="login-error" role="alert">
            {authError}
          </span>
        )}
      </form>
    </div>
  );
}
