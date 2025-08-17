import { useEffect, useState } from "react";

type UserRole = "admin" | "adjoint";

export function useRole() {
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("role") : null;
    return (saved as UserRole) || "admin";
  });

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem("role", newRole);
    } catch {}
  };

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "role" && e.newValue) {
        setRoleState(e.newValue as UserRole);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { role, setRole };
}

