import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(undefined)

const THEME_KEY = 'knowrizon-theme'
const THEME_MIGRATION_KEY = 'knowrizon-theme-default-v2'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const isMigrated = localStorage.getItem(THEME_MIGRATION_KEY)
      if (!isMigrated) {
        // Enforce default to 'light' mode on initial load
        localStorage.setItem(THEME_MIGRATION_KEY, 'true')
        localStorage.setItem(THEME_KEY, 'light')
        return 'light'
      }
      const stored = localStorage.getItem(THEME_KEY)
      if (stored === 'light' || stored === 'dark') {
        return stored
      }
    }
    // Default to 'light' mode as primary
    return 'light'
  })

  useEffect(() => {
    // Apply theme class to document element
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      root.setAttribute('data-theme', 'dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
      root.setAttribute('data-theme', 'light')
      root.style.colorScheme = 'light'
    }
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, theme)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  const isDark = theme === 'dark'

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export { THEME_KEY }
