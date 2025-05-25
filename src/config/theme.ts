import { lightTheme, darkTheme, type ThemeConfig } from '@lib/theme'

// Application-specific theme configuration
export interface AppThemeConfig extends ThemeConfig {
  name: string
  isDark: boolean
  components: {
    header: {
      background: string
      border: string
    }
    sidebar: {
      background: string
      border: string
      hover: string
    }
    card: {
      background: string
      border: string
      shadow: string
    }
    button: {
      primary: string
      secondary: string
      ghost: string
    }
    input: {
      background: string
      border: string
      focus: string
    }
  }
}

export const appLightTheme: AppThemeConfig = {
  ...lightTheme,
  name: 'Light',
  isDark: false,
  components: {
    header: {
      background: '#ffffff',
      border: '#e2e8f0',
    },
    sidebar: {
      background: '#ffffff',
      border: '#e2e8f0',
      hover: '#f8fafc',
    },
    card: {
      background: '#ffffff',
      border: '#e2e8f0',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    button: {
      primary: '#6366f1',
      secondary: '#14b8a6',
      ghost: 'transparent',
    },
    input: {
      background: '#ffffff',
      border: '#e2e8f0',
      focus: '#6366f1',
    },
  },
}

export const appDarkTheme: AppThemeConfig = {
  ...darkTheme,
  name: 'Dark',
  isDark: true,
  components: {
    header: {
      background: '#1e293b',
      border: '#334155',
    },
    sidebar: {
      background: '#1e293b',
      border: '#334155',
      hover: '#334155',
    },
    card: {
      background: '#1e293b',
      border: '#334155',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    },
    button: {
      primary: '#6366f1',
      secondary: '#14b8a6',
      ghost: 'transparent',
    },
    input: {
      background: '#0f172a',
      border: '#334155',
      focus: '#6366f1',
    },
  },
}

// Theme presets for customization
export const themePresets = {
  default: {
    light: appLightTheme,
    dark: appDarkTheme,
  },
  blue: {
    light: {
      ...appLightTheme,
      name: 'Blue Light',
      colors: {
        ...appLightTheme.colors,
        primary: '#3b82f6',
        accent: '#1d4ed8',
      },
    },
    dark: {
      ...appDarkTheme,
      name: 'Blue Dark',
      colors: {
        ...appDarkTheme.colors,
        primary: '#3b82f6',
        accent: '#1d4ed8',
      },
    },
  },
  green: {
    light: {
      ...appLightTheme,
      name: 'Green Light',
      colors: {
        ...appLightTheme.colors,
        primary: '#059669',
        accent: '#047857',
      },
    },
    dark: {
      ...appDarkTheme,
      name: 'Green Dark',
      colors: {
        ...appDarkTheme.colors,
        primary: '#059669',
        accent: '#047857',
      },
    },
  },
  purple: {
    light: {
      ...appLightTheme,
      name: 'Purple Light',
      colors: {
        ...appLightTheme.colors,
        primary: '#7c3aed',
        accent: '#5b21b6',
      },
    },
    dark: {
      ...appDarkTheme,
      name: 'Purple Dark',
      colors: {
        ...appDarkTheme.colors,
        primary: '#7c3aed',
        accent: '#5b21b6',
      },
    },
  },
} as const

// Theme utilities for application use
export const getThemeConfig = (themeName: 'light' | 'dark', preset: keyof typeof themePresets = 'default'): AppThemeConfig => {
  return themePresets[preset][themeName]
}

// CSS variable names for theme integration
export const cssVariables = {
  // Colors
  primary: '--color-primary',
  secondary: '--color-secondary',
  accent: '--color-accent',
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
  
  // Background
  bgPrimary: '--bg-primary',
  bgSecondary: '--bg-secondary',
  bgTertiary: '--bg-tertiary',
  
  // Text
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textTertiary: '--text-tertiary',
  
  // Border
  borderPrimary: '--border-primary',
  borderSecondary: '--border-secondary',
  
  // Shadows
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  shadowLg: '--shadow-lg',
  shadowXl: '--shadow-xl',
  
  // Radius
  radiusSm: '--radius-sm',
  radiusMd: '--radius-md',
  radiusLg: '--radius-lg',
  radiusXl: '--radius-xl',
  
  // Spacing
  spacingXs: '--spacing-xs',
  spacingSm: '--spacing-sm',
  spacingMd: '--spacing-md',
  spacingLg: '--spacing-lg',
  spacingXl: '--spacing-xl',
} as const

// Default theme configuration
export const defaultThemeConfig = {
  defaultTheme: 'system' as const,
  storageKey: 'mcp-theme',
  enableSystem: true,
  attribute: 'class',
}

// Export for easy access
export { lightTheme, darkTheme } from '@lib/theme'