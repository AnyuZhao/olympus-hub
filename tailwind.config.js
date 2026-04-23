/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#1a1a2e",
          card: "#16213e",
          hover: "#1f2d4a",
        },
        accent: {
          DEFAULT: "#4f8ef7",
          hover: "#6aa3ff",
        },
      },
    },
  },
  plugins: [],
};
