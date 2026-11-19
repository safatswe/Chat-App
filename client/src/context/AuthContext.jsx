/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  // Restore the logged-in user after a page refresh
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const saveUser = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
  };

  // Merge changes (like a new avatar) into the stored user
  const updateUser = (changes) => {
    const next = { ...user, ...changes };
    localStorage.setItem("user", JSON.stringify(next));
    setUser(next);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, saveUser, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}