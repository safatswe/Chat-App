/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext({
  socket: null,
  onlineUsers: [],
  connected: false,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const token = user?.token;
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Only connect while logged in
    if (!token) return;

    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
    });

    newSocket.on("connect", () => setConnected(true));
    newSocket.on("disconnect", () => setConnected(false));
    newSocket.on("connect_error", (err) => {
      setConnected(false);
      // The server rejected our token, so the login is no longer valid
      if (err.message.startsWith("Authentication error")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    });
    newSocket.on("onlineUsers", (ids) => setOnlineUsers(ids));

    // Storing an external connection in state is intentional here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(newSocket);

    // Cleanup: runs on logout (or when the app unmounts)
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setOnlineUsers([]);
      setConnected(false);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, connected }}>
      {children}
    </SocketContext.Provider>
  );
}