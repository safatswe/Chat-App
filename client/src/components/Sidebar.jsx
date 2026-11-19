import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

export default function Sidebar({ users, selectedUser, onSelect, unread }) {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <strong>{user.username}</strong>
          <div className="subtitle">{user.email}</div>
        </div>
        <button className="small" onClick={logout}>
          Log out
        </button>
      </div>

      <div className="user-list">
        {users.length === 0 && (
          <p className="subtitle pad">No other users yet.</p>
        )}
        {users.map((u) => {
          const isOnline = onlineUsers.includes(u._id);
          const count = unread[u._id] || 0;
          return (
            <div
              key={u._id}
              className={`user-item ${
                selectedUser?._id === u._id ? "active" : ""
              }`}
              onClick={() => onSelect(u)}
            >
              <div className="avatar">{u.username[0].toUpperCase()}</div>
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