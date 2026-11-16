import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Chat() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/users")
      .then(({ data }) => setUsers(data))
      .catch(() => setError("Could not load users"));
  }, []);

  return (
    <div className="placeholder">
      <header>
        <h2>Hi, {user.username}</h2>
        <button onClick={logout}>Log out</button>
      </header>

      <h3>Users you can chat with</h3>
      {error && <div className="error">{error}</div>}
      <ul>
        {users.map((u) => (
          <li key={u._id}>{u.username}</li>
        ))}
      </ul>
      <p className="subtitle">The chat window arrives on Day 5.</p>
    </div>
  );
}