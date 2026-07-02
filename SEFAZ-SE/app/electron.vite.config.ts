import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["@sefaz/core"] })],
    resolve: {
      alias: {
        "@sefaz/core": resolve(__dirname, "../packages/core/src/index.ts"),
        "@sefaz/core/agil": resolve(__dirname, "../packages/core/src/agil/index.ts"),
        "@sefaz/core/dae": resolve(__dirname, "../packages/core/src/dae/index.ts"),
        "@sefaz/core/alterar-nota": resolve(__dirname, "../packages/core/src/alterar-nota/index.ts"),
        "@sefaz/core/demonstrativo": resolve(__dirname, "../packages/core/src/demonstrativo/index.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["@sefaz/core"] })],
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer"),
      },
    },
  },
});
