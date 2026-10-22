import type { Config } from "tailwindcss";

// Palette built around the light blue ("G") of the Perfectgration logo.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#009FE3", // logo light blue: buttons, active states, accents
          hover: "#1AAEEB",
          deep: "#0077B6",    // links and text accents on white (AA)
          soft: "#D9F1FB",    // soft fills, badges
          tint: "#F2FAFE",    // page and panel backgrounds
        },
        ink: {
          DEFAULT: "#0F2A3D", // headings and body text
          muted: "#557083",   // secondary text (AA on white)
          on: "#06202E",      // text placed on light blue buttons
        },
        line: "#D3E9F4",
        canvas: "#F4FBFE",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
