import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/renderer/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        sidebar: "hsl(var(--sidebar))",
        "sidebar-fg": "hsl(var(--sidebar-fg))",
        "sidebar-accent": "hsl(var(--sidebar-accent))",
        "sidebar-accent-fg": "hsl(var(--sidebar-accent-fg))",
        "sidebar-border": "hsl(var(--sidebar-border))",
      },
    },
  },
  plugins: [],
};

export default config;
