import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base = nom du dépôt GitHub Pages
export default defineConfig({
  base: "/un-pas-apres-lautre/",
  plugins: [react(), tailwindcss()],
});
