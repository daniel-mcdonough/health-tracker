# Development Patterns Guide

## Overview
This guide covers common development patterns, error handling, data validation, and best practices used throughout the Health Tracker application.

## Data Validation Patterns

### Input Validation
- **Required Fields**: Explicit null/undefined checks before database operations
- **Data Types**: Array validation for complex data structures (e.g., foods array in meal logging)
- **SQL Injection Protection**: All queries use parameterized statements with `?` placeholders
- **Enum Validation**: CHECK constraints in schema (e.g., bristol_scale 1-7, severity 1-10)
- **Foreign Key Validation**: Database enforces referential integrity with CASCADE deletes

### Output Processing
- **JSON Field Parsing**: Common pattern for allergens, dosage_forms, reminder_times fields
  ```javascript
  food.allergens = food.allergens ? (() => {
    try {
      return JSON.parse(food.allergens)
    } catch {
      // Fallback for comma-separated strings
      return food.allergens.split(',').filter(a => a.length > 0)
    }
  })() : []
  ```
- **Data Filtering**: Null results filtered out before sending responses
- **Array Validation**: Explicit `Array.isArray()` checks before processing
- **Consistent Response Format**: All successful responses use `{ success: true, data: ... }`

## Common Data Processing Patterns

### Async Counter Pattern
Used throughout the codebase for coordinating multiple async database operations, especially in export/import functionality:
```javascript
let itemsProcessed = 0
let hasError = false

for (const item of items) {
  if (hasError) break
  
  db.run(sql, params, function(err) {
    if (err && !hasError) {
      hasError = true
      return res.status(500).json({ success: false, error: 'Error message' })
    }
    
    itemsProcessed++
    if (itemsProcessed === items.length && !hasError) {
      // All items processed successfully
      res.json({ success: true, data: result })
    }
  })
}
```

### Date/Time Handling
- **Meal Times**: Combined date and time strings converted to DATETIME format
- **Time Extraction**: `strftime('%H:%M', meal_time)` to extract time portion
- **Date Ranges**: BETWEEN clauses for date filtering with inclusive ranges

## Error Handling Standards

### Consistent Error Response Format
```javascript
{
  success: false,
  error: 'Error message'
}
```

### Common Error Handling Pattern
```javascript
try {
  const db = database.getDatabase()
  // database operations
} catch (error) {
  console.error('Error description:', error)
  res.status(500).json({
    success: false,
    error: 'User-friendly error message'
  })
}
```

### Database Error Handling
```javascript
db.run(sql, params, function(err) {
  if (err) {
    console.error('Database operation failed:', err)
    return res.status(500).json({
      success: false,
      error: 'Operation failed'
    })
  }
  
  // Success handling
  res.json({
    success: true,
    data: { id: this.lastID }
  })
})
```

## Authentication Patterns

### Route Protection
```javascript
import { authenticateToken } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'

router.get('/protected-route', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.userId // Available after authentication
  // Route logic here
})
```

### JWT Token Validation
```javascript
// Middleware extracts userId from valid JWT tokens
// All routes can access req.userId for data isolation
// 30-day token expiration with automatic refresh on client
```

## Database Query Patterns

### Safe Parameter Binding
```javascript
// CORRECT - Use parameterized queries
db.run(
  'INSERT INTO table (field1, field2) VALUES (?, ?)',
  [value1, value2],
  callback
)

// INCORRECT - Never use string interpolation
db.run(`INSERT INTO table (field1) VALUES ('${userInput}')`, callback)
```

### Transaction Handling
```javascript
db.serialize(() => {
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Transaction failed' })
    }
    
    // Multiple operations
    db.run(sql1, params1, (err) => {
      if (err) {
        db.run('ROLLBACK')
        return res.status(500).json({ success: false, error: 'Operation failed' })
      }
      
      db.run(sql2, params2, (err) => {
        if (err) {
          db.run('ROLLBACK')
          return res.status(500).json({ success: false, error: 'Operation failed' })
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            return res.status(500).json({ success: false, error: 'Commit failed' })
          }
          res.json({ success: true, data: result })
        })
      })
    })
  })
})
```

### Complex Query Construction
```javascript
// Building queries with optional parameters
let whereClause = 'WHERE user_id = ?'
let params = [userId]

if (startDate) {
  whereClause += ' AND date >= ?'
  params.push(startDate)
}

if (endDate) {
  whereClause += ' AND date <= ?'
  params.push(endDate)
}

const sql = `SELECT * FROM table ${whereClause} ORDER BY date DESC`
db.all(sql, params, callback)
```

## JSON Field Processing

### Parsing with Fallbacks
```javascript
// Common pattern for JSON fields that might contain legacy comma-separated data
const parseJsonField = (field, defaultValue = []) => {
  if (!field) return defaultValue
  
  try {
    return JSON.parse(field)
  } catch {
    // Fallback for comma-separated strings
    return field.split(',').map(item => item.trim()).filter(item => item.length > 0)
  }
}

// Usage
medication.dosage_forms = parseJsonField(medication.dosage_forms, ['pill'])
```

### JSON Stringification
```javascript
// Ensure proper JSON storage
const jsonValue = JSON.stringify(arrayValue)
db.run('INSERT INTO table (json_field) VALUES (?)', [jsonValue], callback)
```

## Performance Optimization Patterns

### Query Result Caching
```javascript
// For data that doesn't change frequently
let cachedFoods = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCachedFoods(callback) {
  const now = Date.now()
  if (cachedFoods && (now - cacheTimestamp) < CACHE_DURATION) {
    return callback(null, cachedFoods)
  }
  
  db.all('SELECT * FROM foods', (err, rows) => {
    if (!err) {
      cachedFoods = rows
      cacheTimestamp = now
    }
    callback(err, rows)
  })
}
```

### Batch Operations
```javascript
// Process multiple items efficiently
const batchSize = 100
const batches = []

for (let i = 0; i < items.length; i += batchSize) {
  batches.push(items.slice(i, i + batchSize))
}

let batchesProcessed = 0
batches.forEach(batch => {
  processBatch(batch, () => {
    batchesProcessed++
    if (batchesProcessed === batches.length) {
      // All batches complete
      res.json({ success: true })
    }
  })
})
```

## Frontend Integration Patterns

### Theme Management
```javascript
// Database-backed theme persistence with localStorage fallback
const updateTheme = async (darkMode) => {
  try {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ dark_mode: darkMode })
    })
  } catch (error) {
    // Fallback to localStorage if database update fails
    localStorage.setItem('darkMode', darkMode.toString())
  }
}
```

### Dark Mode Implementation
```javascript
// Comprehensive dark mode support pattern
const DarkModeComponent = () => {
  return (
    <div className="card">
      {/* Light/dark text */}
      <h2 className="text-gray-900 dark:text-gray-100">Heading</h2>
      
      {/* Light/dark backgrounds */}
      <div className="bg-white dark:bg-gray-800">
        {/* Light/dark borders */}
        <div className="border-gray-200 dark:border-gray-700">
          {/* Light/dark secondary text */}
          <p className="text-gray-600 dark:text-gray-400">Description</p>
          
          {/* Interactive states */}
          <button className="hover:bg-gray-50 dark:hover:bg-gray-700">
            Button
          </button>
        </div>
      </div>
    </div>
  )
}
```

### CRUD Operation Patterns
```javascript
// Standard edit/delete modal pattern used across all log types
const LogComponent = () => {
  const [editingLog, setEditingLog] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [logToDelete, setLogToDelete] = useState(null)

  const startEditLog = (log) => {
    setEditingLog({
      id: log.id,
      // Map database fields to form state
      ...mapDatabaseToForm(log)
    })
    setShowEditModal(true)
  }

  const saveEditedLog = async () => {
    const response = await authenticatedFetch(`/api/endpoint/${editingLog.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingLog)
    })
    
    if (response.ok) {
      await fetchLogs() // Refresh data
      setShowEditModal(false)
      setEditingLog(null)
    }
  }

  const confirmDeleteLog = (log) => {
    setLogToDelete(log)
    setShowDeleteConfirm(true)
  }

  const deleteLog = async () => {
    const response = await authenticatedFetch(`/api/endpoint/${logToDelete.id}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      await fetchLogs() // Refresh data
      setShowDeleteConfirm(false)
      setLogToDelete(null)
    }
  }
}
```

### Date Range Fetching Pattern
```javascript
// Standard 7-day data fetching pattern
import { getDateRange } from '../utils/dateUtils'

const fetchLogs = async () => {
  const { startDate, endDate } = getDateRange(getCurrentLocalDate(), 7)
  
  const response = await authenticatedFetch(
    `/api/endpoint?startDate=${startDate}&endDate=${endDate}`
  )
  const data = await response.json()
  
  if (data.success) {
    setLogs(data.data)
  }
}
```

### Form Data Validation
```javascript
// Client-side validation before API calls
const validateSleepData = (data) => {
  const errors = []
  
  if (!data.date) errors.push('Date is required')
  if (data.dryEyeSeverity && (data.dryEyeSeverity < 1 || data.dryEyeSeverity > 10)) {
    errors.push('Dry eye severity must be between 1-10')
  }
  if (data.disruptionCause && !['dry_eye', 'digestive', 'pain', 'anxiety', 'other', 'none'].includes(data.disruptionCause)) {
    errors.push('Invalid disruption cause')
  }
  
  return errors
}
```

## Common Gotchas

### Database Operations
- **JSON Fields**: Always parse JSON fields with try/catch and fallback handling
- **Async Coordination**: Use counter pattern for multiple async operations
- **Array Validation**: Check `Array.isArray()` before processing database results
- **Date Handling**: Combine separate date/time inputs into DATETIME format
- **Foreign Keys**: Remember they're enabled - cascading deletes will occur
- **User ID**: Always use `req.userId` from JWT token for data isolation
- **Prepared Statements**: Required for security - never string interpolate SQL
- **Error Responses**: Always include `success: false` and descriptive error messages

### Import/Export Operations
- **Large Datasets**: Use streaming for large exports to prevent memory issues
- **Data Integrity**: Validate foreign key relationships during import
- **Merge Logic**: Design import to update existing records rather than fail
- **Progress Tracking**: Provide detailed results with success/error counts
- **Dry Run Mode**: Always support validation-only mode for safety

### Sleep Tracking Specific
- **Behavioral Filtering**: Use `went_to_bed_on_time` to separate voluntary vs involuntary factors
- **Correlation Analysis**: Require minimum sample sizes for statistical validity
- **Data Granularity**: One record per day with comprehensive daily metrics
- **Enum Validation**: Strictly validate `disruption_cause` values
- **Range Validation**: Enforce 1-10 scales for severity measurements

## Best Practices Summary

1. **Security**: Always use parameterized queries and validate inputs
2. **Error Handling**: Provide consistent, user-friendly error messages
3. **Data Validation**: Validate both client-side and server-side
4. **Performance**: Use indexes, caching, and batch operations appropriately
5. **Maintainability**: Follow consistent patterns and document complex logic
6. **Testing**: Write comprehensive tests for critical data operations
7. **Monitoring**: Log errors with sufficient detail for debugging
8. **Documentation**: Keep API documentation current with implementation