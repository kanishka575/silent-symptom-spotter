import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_URL || "http://localhost:5001/api";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget.replace(/\/api$/, ""),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/api"),
        },
      },
    },
    preview: {
      allowedHosts: [
        "silent-symptom-spotter-1.onrender.com",
        "silent-symptom-spotter-3.onrender.com",
      ],
    },
  };
});
