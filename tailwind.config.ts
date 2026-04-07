import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Space Grotesk", "Avenir Next", "Segoe UI", "sans-serif"]
      },
      colors: {
        ink: "#0f1720",
        mist: "#dce7f5",
        surf: "#f5f0e6",
        coral: "#f97352",
        mint: "#b7f5c5",
        gold: "#f4cf68",
        teal: "#61d0cf",
        slateblue: "#1d3557"
      },
      boxShadow: {
        glow: "0 20px 60px rgba(15, 23, 32, 0.25)"
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at top, rgba(244, 207, 104, 0.26), transparent 34%), radial-gradient(circle at 20% 20%, rgba(97, 208, 207, 0.18), transparent 26%), radial-gradient(circle at 80% 0%, rgba(249, 115, 82, 0.2), transparent 28%)"
      }
    }
  },
  plugins: []
} satisfies Config;

