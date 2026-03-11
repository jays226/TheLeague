import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(24 16% 82%)",
        input: "hsl(24 16% 82%)",
        ring: "hsl(151 58% 22%)",
        background: "hsl(42 44% 96%)",
        foreground: "hsl(148 38% 13%)",
        primary: {
          DEFAULT: "hsl(151 58% 22%)",
          foreground: "hsl(42 44% 96%)"
        },
        secondary: {
          DEFAULT: "hsl(42 40% 90%)",
          foreground: "hsl(148 38% 13%)"
        },
        muted: {
          DEFAULT: "hsl(40 20% 92%)",
          foreground: "hsl(151 14% 35%)"
        },
        accent: {
          DEFAULT: "hsl(22 94% 61%)",
          foreground: "hsl(42 44% 96%)"
        },
        card: {
          DEFAULT: "hsla(0 0% 100% / 0.72)",
          foreground: "hsl(148 38% 13%)"
        }
      },
      boxShadow: {
        soft: "0 18px 70px rgba(20, 68, 44, 0.12)"
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.75rem"
      },
      fontFamily: {
        sans: ["Satoshi", "Avenir Next", "Segoe UI", "sans-serif"],
        mono: ["'IBM Plex Mono'", "Menlo", "monospace"]
      },
      backgroundImage: {
        court:
          "radial-gradient(circle at top left, rgba(245,132,79,0.2), transparent 32%), radial-gradient(circle at bottom right, rgba(38,117,81,0.22), transparent 30%)"
      }
    }
  },
  plugins: []
};

export default config;
