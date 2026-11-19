import { useEffect, useState } from "react";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

export default function Chat() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/users")
      .then(({ data }) => setUsers(data))
      .catch(() => setError("Could not load users"));
  }, []);

  return (
    <div className="chat-layout">
      <Sidebar
        users={users}
        selectedUser={selectedUser}
        onSelect={setSelectedUser}
      />

      <main className="chat-main">
        {error && <div className="error">{error}</div>}
        {selectedUser ? (
          <ChatWindow selectedUser={selectedUser} />
        ) : (
          <div className="empty-state">
            <h2>Select a user to start chatting</h2>
          </div>
        )}
      </main>
    </div>
  );
}