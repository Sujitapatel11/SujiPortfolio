import React, { createContext, useContext, useState, useEffect } from "react";

const AdminAuthContext = createContext(null);

const API_BASE = "http://localhost:8000";

export const AdminAuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("admin_token"));
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async (token) => {
    const tokenToUse = token || adminToken;
    if (!tokenToUse) {
      setAdminUser(null);
      setLoading(false);
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/me`, {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setAdminUser(data);
        setLoading(false);
        return true;
      } else {
        logout();
        setLoading(false);
        return false;
      }
    } catch (err) {
      console.error("Auth validation check failed:", err);
      setLoading(false);
      return false;
    }
  };

  useEffect(() => {
    checkAuth();
  }, [adminToken]);

  const login = async (username, password) => {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Invalid admin credentials");
    }

    const data = await res.json();
    localStorage.setItem("admin_token", data.access_token);
    setAdminToken(data.access_token);
    setAdminUser({ username: data.username, role: data.role });
    return true;
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setAdminToken(null);
    setAdminUser(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminToken,
        adminUser,
        loading,
        login,
        logout,
        checkAuth,
        isAuthenticated: !!adminToken && !!adminUser,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
