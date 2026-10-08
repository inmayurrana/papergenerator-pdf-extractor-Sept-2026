/**
 * Design Tokens for Classic Professional Design System
 * Scientific Document Intelligence & Examination Suite
 */

export const tokens = {
  colors: {
    // Primary Brand
    primary: '#0B1F3A',          // Primary Navy
    primaryHover: '#16365F',     // Primary Navy Hover
    primaryActive: '#08172C',    // Primary Navy Deep

    // Surfaces & Backgrounds
    pageBackground: '#F5F7FA',   // Page Background
    surface: '#FFFFFF',          // Card & Panel Background
    surfaceMuted: '#F3F4F6',     // Muted surface / toolbar background
    surfaceHover: '#F9FAFB',     // Subtle hover state

    // Text & Content
    textPrimary: '#111827',      // Primary Text (High Contrast)
    textSecondary: '#374151',    // Secondary Text (14px minimum)
    textMuted: '#6B7280',        // Muted / Hint Text
    textDisabled: '#9CA3AF',     // Disabled Text (Readable)
    textInverse: '#FFFFFF',      // White Text for Navy/Dark buttons

    // Borders & Dividers
    border: '#D1D5DB',           // Standard Border
    borderLight: '#E5E7EB',      // Subdivided item border
    borderStrong: '#9CA3AF',     // Focused or high-contrast border
    borderDark: '#6B7280',

    // Interactive States
    hover: '#F3F4F6',            // General Item Hover
    selected: '#0B1F3A',         // Selected Item Background
    selectedText: '#FFFFFF',     // Selected Item Text
    selectedLight: '#EFF6FF',    // Selected Row / Tab highlight
    selectedLightText: '#0B1F3A',

    // Feedback & Semantic Alerts
    success: '#166534',          // Verified / Success Text
    successBg: '#F0FDF4',        // Success Light Badge
    successBorder: '#BBF7D0',    // Success Badge Border

    warning: '#92400E',          // Needs Review / Warning Text
    warningBg: '#FFFBEB',        // Warning Light Badge
    warningBorder: '#FDE68A',    // Warning Badge Border

    error: '#B91C1C',            // Error / Failed Text
    errorBg: '#FEF2F2',          // Error Light Badge
    errorBorder: '#FECACA',      // Error Badge Border

    info: '#1E40AF',             // Processing / Info Text
    infoBg: '#EFF6FF',           // Info Light Badge
    infoBorder: '#BFDBFE',       // Info Badge Border

    // Focus & Accessibility
    focus: '#1D4ED8',            // Accessible Focus Ring
    focusRing: 'rgba(29, 78, 216, 0.25)',
  },

  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontFamilyMath: 'KaTeX_Main, Times New Roman, serif',

    fontSize: {
      pageTitle: '24px',
      sectionTitle: '20px',
      subheading: '18px',
      body: '16px',
      bodySecondary: '14px',
      control: '14px',
      label: '14px',
      nav: '15px',
      badge: '12px',
      code: '13px',
      mobileBody: '16px',
      mobileControl: '16px',
    },

    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },

    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
    },
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    base: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '40px',
    '4xl': '48px',
  },

  radius: {
    xs: '4px',
    sm: '6px',      // Inputs & Buttons
    md: '8px',      // Cards & Dialogs
    lg: '10px',
    badge: '9999px', // Pill badges only
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 2px 6px rgba(0, 0, 0, 0.08)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },

  layout: {
    sidebarWidth: '260px',
    sidebarCollapsedWidth: '68px',
    headerHeight: '64px',
    mobileBottomNavHeight: '56px',
    minTouchTarget: '44px',
    preferredTouchTarget: '48px',
  },

  breakpoints: {
    phone: '640px',
    tablet: '1024px',
    desktop: '1440px',
    largeDesktop: '1920px',
  },

  animation: {
    fast: '120ms ease',
    normal: '180ms ease',
  },
} as const;

export type ThemeTokens = typeof tokens;
