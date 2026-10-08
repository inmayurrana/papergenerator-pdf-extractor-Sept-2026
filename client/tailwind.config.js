/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        classic: {
          navy: "#0B1F3A",
          "navy-hover": "#16365F",
          "navy-active": "#08172C",
          background: "#F5F7FA",
          surface: "#FFFFFF",
          "surface-muted": "#F3F4F6",
          "surface-hover": "#F9FAFB",
          text: {
            primary: "#111827",
            secondary: "#374151",
            muted: "#6B7280",
            disabled: "#9CA3AF",
          },
          border: {
            DEFAULT: "#D1D5DB",
            light: "#E5E7EB",
            dark: "#9CA3AF",
            strong: "#9CA3AF",
          },
          success: {
            DEFAULT: "#166534",
            bg: "#F0FDF4",
            border: "#BBF7D0",
          },
          warning: {
            DEFAULT: "#92400E",
            bg: "#FFFBEB",
            border: "#FDE68A",
          },
          danger: {
            DEFAULT: "#B91C1C",
            bg: "#FEF2F2",
            border: "#FECACA",
          },
          info: {
            DEFAULT: "#1E40AF",
            bg: "#EFF6FF",
            border: "#BFDBFE",
          },
          focus: "#1D4ED8",
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      fontSize: {
        'page-title': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'section-title': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'subheading': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '24px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
      },
      minHeight: {
        control: '40px',
        touch: '44px',
        touchLg: '48px',
      },
      borderRadius: {
        input: "6px",
        button: "6px",
        card: "8px",
        dialog: "8px",
        classic: "6px",
      },
      boxShadow: {
        classic: "0 1px 2px rgba(0,0,0,0.05)",
        "classic-md": "0 2px 6px rgba(0,0,0,0.08)",
        "classic-lg": "0 8px 24px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
}
