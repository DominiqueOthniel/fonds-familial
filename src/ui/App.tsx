// App.tsx
import React, { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { Login } from "../components/login";
import { Dashboard } from "../components/dashboard";
import { Toaster } from "../components/ui/sonner";
import "../types/electron-api.d.ts"; // Import des types Electron API

export default function App() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Vérifier si on est dans Electron
    if (window.electronAPI) {
      window.electronAPI.onSetRole((role) => {
        setUserRole(role);
        setIsAuthenticated(true);
      });
    }
  }, []);

  const handleLoginSuccess = (role: string) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUserRole(null);
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        {isAuthenticated ? (
          <Dashboard userRole={userRole || "admin"} onLogout={handleLogout} />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
