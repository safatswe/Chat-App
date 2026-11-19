import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext({ socket: null, onlineUsers: [] });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const token = user?.token;
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // Only connect while logged in
    if (!token) return;

    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
    });

    newSocket.on("onlineUsers", (ids) => setOnlineUsers(ids));
    setSocket(newSocket);

    // Cleanup: runs on logout (or when the app unmounts)
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setOnlineUsers([]);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}