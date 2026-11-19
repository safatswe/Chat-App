import { useRef, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { resizeImage } from "../utils/resizeImage";
import Avatar from "./Avatar";

export default function Sidebar({ users, selectedUser, onSelect, unread }) {
  const { user, logout, updateUser } = useAuth();
  const { onlineUsers } = useSocket();
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);

  const searching = query.trim() !== "";

  // No search: only people I have a chat with. Searching: everyone who matches.
  const visible = searching
    ? users.filter((u) =>
        u.username.toLowerCase().includes(query.trim().toLowerCase())
      )
    : users.filter((u) => u.hasChat || u._id === selectedUser?._id);

  const saveAvatar = async (avatar) => {
    const { data } = await api.put("/users/avatar", { avatar });
    updateUser({ avatar: data.avatar });
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    setUploadError("");
    setUploading(true);
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Image must be under 10 MB");
      }
      await saveAvatar(await resizeImage(file));
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploadError("");
    setUploading(true);
    try {
      await saveAvatar("");
    } catch (err) {
      setUploadError(err.response?.data?.message || "Could not remove photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = (u) => {
    setQuery("");
    onSelect(u);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div
          className={`avatar-wrap editable ${uploading ? "busy" : ""}`}
          onClick={() => !uploading && fileRef.current?.click()}
          title="Change profile photo"
        >
          <Avatar user={user} />
          <span className="cam-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFile}
        />
        <div className="me">
          <strong>{user.username}</strong>
          <div className="subtitle">
            {uploading ? "Uploading..." : user.email}
          </div>
        </div>
        <button className="small" onClick={logout}>
          Log out
        </button>
      </div>

      {(uploadError || user.avatar) && (
        <div className="photo-actions">
          {uploadError && <span className="photo-error">{uploadError}</span>}
          {user.avatar && !uploading && (
            <button className="link-btn" onClick={handleRemove}>
              Remove photo
            </button>
          )}
        </div>
      )}

      <div className="search">
        <input
          type="text"
          placeholder="Search people to start a chat..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="section-label">
        {searching ? "Search results" : "Chats"}
      </div>

      <div className="user-list">
        {!searching && visible.length === 0 && (
          <p className="subtitle pad">
            No chats yet. Search for a person above to start one.
          </p>
        )}
        {searching && visible.length === 0 && (
          <p className="subtitle pad">No matches found.</p>
        )}
        {visible.map((u) => {
          const isOnline = onlineUsers.includes(u._id);
          const count = unread[u._id] || 0;
          return (
            <div
              key={u._id}
              className={`user-item ${
                selectedUser?._id === u._id ? "active" : ""
              }`}
              onClick={() => handleSelect(u)}
            >
              <div className="avatar-wrap">
                <Avatar user={u} />
                <span className={`status-dot ${isOnline ? "on" : ""}`} />
              </div>
              <div className="user-info">
                <span>{u.username}</span>
                <small className={isOnline ? "online" : "offline"}>
                  {isOnline ? "Online" : "Offline"}
                </small>
              </div>
              {count > 0 && <span className="badge">{count}</span>}
            </div>
          );
        })}
      </div>
    </aside>
  );
}