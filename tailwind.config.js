/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14171F",
        paper: "#F7F6F2",
        line: "#E4E1D8",
        accent: "#B8622C",
        good: "#2F6B4F",
        bad: "#B23A2E",
        sidebar: "#15171C",
        gold: {
          DEFAULT: "#C8A24A",
          light: "#E4C878",
          dark: "#9C7A2E",
        },
      },
    },
  },
  plugins: [],
};
