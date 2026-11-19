import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

export default function Chat() {
  const { user } = useAuth();
  const { socket, onlineUsers, connected } = useSocket();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unread, setUnread] = useState({});
  const [error, setError] = useState("");

  // Load users now, and again whenever someone connects or disconnects,
  // so newly registered users appear without a page refresh
  useEffect(() => {
    api
      .get("/users")
      .then(({ data }) => {
        setUsers(data);
        setError("");
      })
      .catch(() => setError("Could not load users"));
  }, [onlineUsers]);

  // Count incoming messages from chats that aren't currently open
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.receiver !== user._id) return; // ignore my own messages
      if (selectedUser?._id === message.sender) return; // chat is open

      setUnread((prev) => ({
        ...prev,
        [message.sender]: (prev[message.sender] || 0) + 1,
      }));
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [socket, selectedUser?._id, user._id]);

  const handleSelect = (u) => {
    setSelectedUser(u);
    // Opening a chat clears its unread badge
    setUnread((prev) => {
      const next = { ...prev };
      delete next[u._id];
      return next;
    });
  };

  return (
    <div className="chat-root">
      {!connected && (
        <div className="conn-banner">
          Connecting to server... messages can't be sent until you're connected.
        </div>
      )}

      <div className={`chat-layout ${selectedUser ? "chat-open" : ""}`}>
        <Sidebar
          users={users}
          selectedUser={selectedUser}
          onSelect={handleSelect}
          unread={unread}
        />

        <main className="chat-main">
          {error && <div className="error">{error}</div>}
          {selectedUser ? (
            <ChatWindow
              selectedUser={selectedUser}
              onBack={() => setSelectedUser(null)}
            />
          ) : (
            <div className="empty-state">
              <h2>Select a user to start chatting</h2>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}