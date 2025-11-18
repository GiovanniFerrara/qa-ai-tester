export const theme = {
  colors: {
    primary: '#667eea',
    primaryDark: '#5568d3',
    secondary: '#764ba2',
    background: '#f5f7fa',
    cardBg: '#ffffff',
    text: '#2c3e50',
    textSecondary: '#5a6c7d',
    textMuted: '#94a3b8',
    border: '#e0e6ed',
    borderLight: '#cbd5f5',
    borderDark: '#e2e8f0',
    hover: '#f8f9ff',
    hoverDark: '#f0f4ff',
    accent: '#f8f9ff',
    
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    
    status: {
      pending: {
        bg: '#fff3cd',
        text: '#856404'
      },
      running: {
        bg: '#cfe2ff',
        text: '#084298'
      },
      completed: {
        bg: '#d1e7dd',
        text: '#0f5132'
      },
      passed: {
        bg: '#d1e7dd',
        text: '#0f5132'
      },
      failed: {
        bg: '#f8d7da',
        text: '#842029'
      },
      inconclusive: {
        bg: '#fff3cd',
        text: '#856404'
      }
    },
    
    severity: {
      blocker: '#b91c1c',
      critical: '#dc2626',
      major: '#f97316',
      minor: '#64748b',
      info: '#0d9488'
    },
    
    findingBg: {
      blocker: '#fee2e2',
      critical: '#fee2e2',
      major: '#fff4e6',
      minor: '#f1f5f9',
      info: '#ffffff'
    },
    
    badge: {
      provider: {
        bg: '#e3f2fd',
        text: '#1976d2'
      },
      model: {
        bg: '#f3e5f5',
        text: '#7b1fa2'
      }
    },
    
    success: {
      bg: '#d1e7dd',
      text: '#0f5132'
    },
    error: {
      bg: '#f8d7da',
      text: '#842029',
      border: '#dc3545'
    },
    
    button: {
      secondary: {
        bg: '#f1f4ff',
        text: '#3b4cca',
        hover: '#dce3ff'
      },
      danger: {
        bg: '#f87171',
        hover: '#ef4444'
      }
    },
    
    event: {
      log: {
        bg: '#eef2ff',
        text: '#4338ca'
      },
      toolCall: {
        bg: '#ecfeff',
        text: '#0f766e'
      },
      status: {
        bg: '#e0f2fe',
        text: '#0369a1'
      },
      screenshot: {
        bg: '#fef3c7',
        text: '#b45309'
      }
    },
    
    kpi: {
      ok: {
        bg: '#d1e7dd',
        text: '#0f5132'
      },
      mismatch: {
        bg: '#f8d7da',
        text: '#842029'
      },
      missing: {
        bg: '#fff3cd',
        text: '#856404'
      }
    }
  },
  
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem'
  },
  
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '999px'
  },
  
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0 4px 8px rgba(0, 0, 0, 0.15)',
    lg: '0 6px 12px rgba(0, 0, 0, 0.15)',
    xl: '0 8px 32px rgba(0, 0, 0, 0.5)',
    primaryHover: '0 4px 8px rgba(102, 126, 234, 0.4)',
    card: '0 2px 4px rgba(0, 0, 0, 0.05)',
    screenshot: '0 2px 6px rgba(0, 0, 0, 0.1)'
  },
  
  fonts: {
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    mono: "'Courier New', monospace"
  },
  
  fontSizes: {
    xs: '0.7rem',
    sm: '0.75rem',
    md: '0.85rem',
    base: '0.875rem',
    normal: '0.9rem',
    lg: '1rem',
    xl: '1.1rem',
    '2xl': '1.25rem',
    '3xl': '1.5rem',
    '4xl': '1.75rem',
    '5xl': '2rem',
    '6xl': '2.5rem'
  },
  
  transitions: {
    fast: 'all 0.2s',
    normal: 'all 0.3s',
    width: 'width 0.3s ease'
  },
  
  breakpoints: {
    mobile: '768px',
    tablet: '960px',
    desktop: '1200px'
  }
};

export type Theme = typeof theme;