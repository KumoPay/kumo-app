/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Nunito Sans"', "system-ui", "sans-serif"],
        body: ['"Nunito Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        navy: "#0B1020",
        cloud: "#FFFFFF",
        cyan: "#7FE8FF",
        sky: "#B7F1FF",
        lilac: "#C7B5FF",
        mute: "#C4CCD8",
        cream: "#FAFCFF",
      },
      animation: {
        breathe: "breathe 3s ease-in-out infinite",
        twinkle: "twinkle 2.4s ease-in-out infinite",
        wave: "wave 2.4s ease-out infinite",
        zfloat: "zfloat 3.5s ease-in-out infinite",
        burst: "burst 2s ease-out infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.35", transform: "scale(0.95)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        wave: {
          "0%": { transform: "scale(0.6)", opacity: "0.7" },
          "100%": { transform: "scale(1.3)", opacity: "0" },
        },
        zfloat: {
          "0%": { transform: "translate(0, 0) rotate(-6deg)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translate(14px, -28px) rotate(6deg)", opacity: "0" },
        },
        burst: {
          "0%": { transform: "scale(0.4) rotate(0)", opacity: "0" },
          "30%": { opacity: "1" },
          "100%": { transform: "scale(1.1) rotate(40deg)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
}
