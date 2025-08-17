import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // Ajusté pour votre structure
    "./index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
