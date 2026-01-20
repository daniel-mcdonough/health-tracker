import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const { authenticatedFetch, isAuthenticated } = useAuth()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load theme preference on authentication
  useEffect(() => {
    if (isAuthenticated) {
      loadThemePreference()
    } else {
      // When logged out, check localStorage for guest preference
      const savedTheme = localStorage.getItem('darkMode')
      setIsDarkMode(savedTheme === 'true')
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const loadThemePreference = async () => {
    try {
      const response = await authenticatedFetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setIsDarkMode(data.data.dark_mode || false)
        }
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error)
      // Fallback to localStorage
      const savedTheme = localStorage.getItem('darkMode')
      setIsDarkMode(savedTheme === 'true')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    
    // Always save to localStorage for guest users
    localStorage.setItem('darkMode', newDarkMode.toString())
    
    // If authenticated, also save to backend
    if (isAuthenticated) {
      try {
        const response = await authenticatedFetch('/api/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dark_mode: newDarkMode
          })
        })
        
        if (!response.ok) {
          console.error('Failed to save dark mode preference to server')
        }
      } catch (error) {
        console.error('Error saving dark mode preference:', error)
      }
    }
  }

  const value = {
    isDarkMode,
    toggleDarkMode,
    isLoading
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}