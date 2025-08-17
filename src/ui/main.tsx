// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./global.css";

// Appliquer le thème persisté (dark/clair) dès le démarrage
try {
  const stored = localStorage.getItem("ff_theme");
  if (stored === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
} catch {}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
