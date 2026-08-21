/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  corePlugins: {
    // CRÍTICO durante la coexistencia (Strangler Fig): el CSS legado
    // asume estilos UA por defecto. Se activa en Fase 4.
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#aa3bff",
          soft: "rgba(170, 59, 255, 0.1)",
          border: "rgba(170, 59, 255, 0.5)",
        },
        success: "#059669",
        danger: "#dc2626",
        surface: { light: "#f4f6f8", card: "#ffffff" },
        ink: { muted: "#6b6375", strong: "#08060d" },
        line: "#e5e4e7",
        shell: {
          bg: "#1a0d26",
          border: "#2d1a40",
          text: "#f5f2fa",
          muted: "#b5aebe",
        },
      },
      maxWidth: { content: "1280px" },
      boxShadow: { card: "0 1px 3px rgba(0, 0, 0, 0.04)" },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
