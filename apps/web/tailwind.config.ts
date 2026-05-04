import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        surface: "#F8FAFC"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "progress-stripes": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "40px 0" }
        }
      },
      animation: {
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "progress-stripes": "progress-stripes 1s linear infinite"
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
