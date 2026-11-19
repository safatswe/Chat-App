import { useCallback, useEffect, useState } from "react";
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

  const refreshUsers = useCallback(() => {
    api
      .get("/users")
      .then(({ data }) => {
        setUsers(data);
        setError("");
      })
      .catch(() => setError("Could not load users"));
  }, []);

  useEffect(() => {
    refreshUsers();
  }, [onlineUsers, refreshUsers]);

  useEffect(() => {
    if (!socket) return;
    socket.on("newMessage", refreshUsers);
    socket.on("conversationDeleted", refreshUsers);
    socket.on("usersChanged", refreshUsers);
    return () => {
      socket.off("newMessage", refreshUsers);
      socket.off("conversationDeleted", refreshUsers);
      socket.off("usersChanged", refreshUsers);
    };
  }, [socket, refreshUsers]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.receiver !== user._id) return;
      if (selectedUser?._id === message.sender) return;

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
    setUnread((prev) => {
      const next = { ...prev };
      delete next[u._id];
      return next;
    });
  };

  // After I delete a chat: close it and refresh the list
  const handleDeleted = () => {
    setSelectedUser(null);
    refreshUsers();
  };

  const currentUser =
    users.find((u) => u._id === selectedUser?._id) || selectedUser;

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
              key={selectedUser._id}
              selectedUser={currentUser}
              onBack={() => setSelectedUser(null)}
              onDeleted={handleDeleted}
            />
          ) : (
            <div className="empty-state">
              <div className="logo">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h2>Your messages</h2>
              <p className="subtitle">
                Select a chat, or search for a person to start a new one.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}