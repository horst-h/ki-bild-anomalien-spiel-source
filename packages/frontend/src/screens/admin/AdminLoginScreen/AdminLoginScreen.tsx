import { useState } from "react";
import { api } from "../../../api/client";

// TODO: Design-Pass – Admin-Login-Screen

interface AdminLoginScreenProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

export function AdminLoginScreen({ onLoginSuccess, onBack }: AdminLoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      await api.adminLogin(password);
      onLoginSuccess();
    } catch {
      setError("Falsches Passwort.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={onBack}>← Zurück</button>
      <h2>Admin-Login</h2>
      <div>
        <label htmlFor="adminPw">Passwort: </label>
        <input
          id="adminPw"
          type="password"
          value={password}
          autoFocus
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        {error && <span style={{ color: "red" }}> {error}</span>}
      </div>
      <p>
        <button onClick={handleLogin} disabled={loading || !password}>
          {loading ? "Anmelden …" : "Anmelden"}
        </button>
      </p>
    </div>
  );
}
