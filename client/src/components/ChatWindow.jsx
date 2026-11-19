import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import Avatar from "./Avatar";

export default function ChatWindow({ selectedUser, onBack, onDeleted }) {
  const { user } = useAuth();
  const { socket, onlineUsers, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const typingSent = useRef(false);

  const isOnline = onlineUsers.includes(selectedUser._id);

  // 1. Load history over REST (the component remounts for each user
  //    because of the key in Chat.jsx, so state always starts fresh)
  useEffect(() => {
    let cancelled = false;

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

  // 2. Listen for live messages, typing events and conversation deletes
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      const belongsToThisChat =
        (message.sender === selectedUser._id && message.receiver === user._id) ||
        (message.sender === user._id && message.receiver === selectedUser._id);

      if (!belongsToThisChat) return;

      // A message from them means they've stopped typing
      if (message.sender === selectedUser._id) setIsTyping(false);

      setMessages((prev) =>
        prev.some((m) => m._id === message._id) ? prev : [...prev, message]
      );
    };

    const handleTyping = ({ senderId }) => {
      if (senderId === selectedUser._id) setIsTyping(true);
    };

    const handleStopTyping = ({ senderId }) => {
      if (senderId === selectedUser._id) setIsTyping(false);
    };

    // I deleted this conversation in another tab, so clear it here too
    const handleDeleted = ({ userId }) => {
      if (userId === selectedUser._id) setMessages([]);
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("conversationDeleted", handleDeleted);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("conversationDeleted", handleDeleted);
    };
  }, [socket, selectedUser._id, user._id]);

  // 3. When switching chats, tell the old chat we stopped typing
  useEffect(() => {
    return () => {
      clearTimeout(typingTimer.current);
      if (typingSent.current && socket) {
        socket.emit("stopTyping", { receiverId: selectedUser._id });
      }
      typingSent.current = false;
    };
  }, [socket, selectedUser._id]);

  // 4. Scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleChange = (e) => {
    setText(e.target.value);
    if (!socket) return;

    // Send "typing" only once, not on every keystroke
    if (!typingSent.current) {
      socket.emit("typing", { receiverId: selectedUser._id });
      typingSent.current = true;
    }

    // Send "stopTyping" after 1.5 seconds without keystrokes
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
      typingSent.current = false;
    }, 1500);
  };

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !socket || !connected) return;

    // Sending a message ends the typing state
    clearTimeout(typingTimer.current);
    if (typingSent.current) {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
      typingSent.current = false;
    }

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

  const handleDelete = async () => {
    const ok = window.confirm(
      `Delete your conversation with ${selectedUser.username}? ` +
        `This only removes it for you.`
    );
    if (!ok) return;

    try {
      await api.delete(`/messages/${selectedUser._id}`);
      setMessages([]);
      onDeleted?.();
    } catch {
      setError("Could not delete the conversation");
    }
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className="chat-window">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          &larr;
        </button>
        <Avatar user={selectedUser} />
        <div className="user-info">
          <strong>{selectedUser.username}</strong>
          {isTyping ? (
            <small className="typing">typing...</small>
          ) : (
            <small className={isOnline ? "online" : "offline"}>
              {isOnline ? "Online" : "Offline"}
            </small>
          )}
        </div>
        <button
          className="icon-btn"
          onClick={handleDelete}
          aria-label="Delete conversation"
          title="Delete conversation"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
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
          onChange={handleChange}
          maxLength={2000}
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!text.trim() || !connected}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </section>
  );
}