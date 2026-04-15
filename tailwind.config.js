/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
  display: ["'Plus Jakarta Sans'", "sans-serif"],
  body: ["'Plus Jakarta Sans'", "sans-serif"],
  mono: ["'DM Mono'", "monospace"],
},
      colors: {
        zap: {
          bg: "#080B10",
          surface: "#0E1218",
          border: "#1A2030",
          muted: "#2A3448",
          accent: "#00D4FF",
          "accent-dim": "#0099BB",
          green: "#00E5A0",
          orange: "#FF6B35",
          text: "#E8EDF5",
          subtext: "#6B7A99",
        },
      },
      backgroundImage: {
        "glow-accent": "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,212,255,0.12) 0%, transparent 70%)",
        "glow-green": "radial-gradient(ellipse 40% 30% at 50% 100%, rgba(0,229,160,0.08) 0%, transparent 70%)",
      },
      animation: {
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        "glow-accent": "0 0 24px rgba(0,212,255,0.15)",
        "glow-green": "0 0 24px rgba(0,229,160,0.15)",
      },
    },
  },
  plugins: [],
};