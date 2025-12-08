/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#0f172a", // Slate 900
                secondary: "#334155", // Slate 700
                accent: "#3b82f6", // Blue 500
                background: "#f8fafc", // Slate 50
                surface: "#ffffff",
                danger: "#ef4444", // Red 500
                warning: "#f59e0b", // Amber 500
                success: "#22c55e", // Green 500
            }
        },
    },
    plugins: [],
}
