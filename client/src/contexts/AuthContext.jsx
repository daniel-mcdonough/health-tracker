import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true
  })

  // Check for existing token on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken')
      
      if (!token) {
        setAuth({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false
        })
        return
      }

      try {
        // Verify token with backend
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          
          if (data.success) {
            setAuth({
              isAuthenticated: true,
              user: data.data.user,
              token: token,
              loading: false
            })
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('authToken')
            setAuth({
              isAuthenticated: false,
              user: null,
              token: null,
              loading: false
            })
          }
        } else {
          // Network error or server error, remove token to be safe
          localStorage.removeItem('authToken')
          setAuth({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false
          })
        }
      } catch (error) {
        console.error('Auth verification error:', error)
        // Network error, don't remove token but set as unauthenticated for now
        setAuth({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false
        })
      }
    }

    checkAuth()
  }, [])

  const login = ({ token, user }) => {
    localStorage.setItem('authToken', token)
    setAuth({
      isAuthenticated: true,
      user: user,
      token: token,
      loading: false
    })
  }

  const logout = async () => {
    try {
      // Call logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage and state regardless of API call result
      localStorage.removeItem('authToken')
      setAuth({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false
      })
    }
  }

  // Create authenticated fetch function
  const authenticatedFetch = async (url, options = {}) => {
    const token = auth.token || localStorage.getItem('authToken')
    
    const authenticatedOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    }

    const response = await fetch(url, authenticatedOptions)
    
    // If unauthorized, logout the user
    if (response.status === 401 || response.status === 403) {
      logout()
      throw new Error('Authentication required')
    }

    return response
  }

  const value = {
    ...auth,
    login,
    logout,
    authenticatedFetch
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext