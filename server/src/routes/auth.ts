import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { generateToken } from '../middleware/auth.js'

const router = express.Router()

// Function to get user credentials (lazy-loaded)
const getSingleUser = () => {
  return {
    id: 1,
    username: process.env.AUTH_USERNAME || 'user',
    passwordHash: process.env.AUTH_PASSWORD_HASH || ''
  }
}

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const SINGLE_USER = getSingleUser(); // Get credentials when needed

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      })
    }

    // Check if password hash is configured
    if (!SINGLE_USER.passwordHash) {
      return res.status(500).json({
        success: false,
        error: 'Authentication not configured. Please set AUTH_PASSWORD_HASH environment variable.'
      })
    }

    // Check username
    if (username !== SINGLE_USER.username) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, SINGLE_USER.passwordHash)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Generate token
    const token = generateToken(SINGLE_USER.id)

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: SINGLE_USER.id,
          username: SINGLE_USER.username
        }
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Verify token endpoint
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' })
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const SINGLE_USER = getSingleUser(); // Get credentials when needed
    res.json({
      success: true,
      data: {
        user: {
          id: SINGLE_USER.id,
          username: SINGLE_USER.username
        }
      }
    })
  } catch (error) {
    res.status(403).json({ success: false, error: 'Invalid token' })
  }
})

// Logout endpoint (client-side will remove token)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  })
})

export default router