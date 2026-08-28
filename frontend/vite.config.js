import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Only proxy API paths — not /patient or /clinician (those are React Router routes).
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/wound": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
});
