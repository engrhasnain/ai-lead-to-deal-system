/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#F26522",
          "orange-light": "#FF8C42",
          "orange-dark": "#D94E10",
          "orange-50": "#FFF5F0",
          "orange-100": "#FFE8DC",
          yellow: "#F5B800",
          "yellow-light": "#FFF8E1",
          charcoal: "#333333",
          "charcoal-light": "#555555",
          muted: "#888888",
          border: "#E8E8E8",
          surface: "#FAFAFA",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(51, 51, 51, 0.06), 0 1px 2px rgba(51, 51, 51, 0.04)",
        "card-hover": "0 4px 12px rgba(242, 101, 34, 0.08), 0 2px 4px rgba(51, 51, 51, 0.04)",
      },
    },
  },
  plugins: [],
};
