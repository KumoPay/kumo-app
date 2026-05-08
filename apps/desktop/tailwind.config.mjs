/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', "ui-monospace", "monospace"],
        display: ['"Space Mono"', '"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#070809",
        paper: "#f3efe5",
        signal: "#ff5f1f",
        ghost: "#7d7466",
      },
      animation: {
        "blink": "blink 1.05s steps(1) infinite",
        "scan": "scan 5s linear infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
      keyframes: {
        blink: { "50%": { opacity: "0" } },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
