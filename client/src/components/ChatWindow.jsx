import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

export default function ChatWindow({ selectedUser }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  // 1. Load history over REST whenever another user is selected
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setError("");

    api
      .get(`/messages/${selectedUser._id}`)
      .then(({ data }) => {
        if (cancelled) return;
        // Merge, in case a live message arrived while history was loading
        setMessages((prev) => {
          const ids = new Set(data.map((m) => m._id));
          return [...data, ...prev.filter((m) => !ids.has(m._id))];
        });
      })
      .catch(() => !cancelled && setError("Could not load messages"))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [selectedUser._id]);

  // 2. Listen for live messages over the socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      const belongsToThisChat =
        (message.sender === selectedUser._id && message.receiver === user._id) ||
        (message.sender === user._id && message.receiver === selectedUser._id);

      if (!belongsToThisChat) return;

      setMessages((prev) =>
        prev.some((m) => m._id === message._id) ? prev : [...prev, message]
      );
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [socket, selectedUser._id, user._id]);

  // 3. Scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !socket) return;

    setError("");
    socket.emit(
      "sendMessage",
      { receiverId: selectedUser._id, text: trimmed },
      (response) => {
        if (!response.ok) setError(response.error);
      }
    );
    setText("");
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className="chat-window">
      <div className="chat-header">
        <div className="avatar">{selectedUser.username[0].toUpperCase()}</div>
        <strong>{selectedUser.username}</strong>
      </div>

      <div className="messages">
        {loading && <p className="subtitle pad">Loading messages...</p>}
        {!loading && messages.length === 0 && (
          <p className="subtitle pad">No messages yet. Say hello!</p>
        )}

        {messages.map((m) => {
          const mine = m.sender === user._id;
          return (
            <div key={m._id} className={`bubble ${mine ? "mine" : "theirs"}`}>
              <div>{m.text}</div>
              <small>{formatTime(m.createdAt)}</small>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <div className="error chat-error">{error}</div>}

      <form className="message-form" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <button type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}