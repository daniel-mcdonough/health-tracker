import express from 'express'
import { database } from '../database/init.js'
import { authenticateToken } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'

const router = express.Router()

// Get user settings
router.get('/settings', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase()
    
    db.get(
      'SELECT timezone, reminder_enabled, reminder_times, correlation_sensitivity, data_retention_days, dark_mode FROM user_settings WHERE user_id = ?',
      [req.userId],
      (err, settings) => {
        if (err) {
          console.error('Error fetching user settings:', err)
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch settings'
          })
        }
        
        // If no settings exist, return defaults
        if (!settings) {
          const defaultSettings = {
            timezone: 'America/New_York',
            reminder_enabled: true,
            reminder_times: ['09:00', '21:00'],
            correlation_sensitivity: 0.3,
            data_retention_days: 365,
            dark_mode: false
          }
          
          return res.json({
            success: true,
            data: defaultSettings
          })
        }
        
        // Parse reminder_times JSON
        let reminderTimes = []
        try {
          reminderTimes = (settings as any).reminder_times ? JSON.parse((settings as any).reminder_times) : ['09:00', '21:00']
        } catch (error) {
          console.error('Error parsing reminder times:', error)
          reminderTimes = ['09:00', '21:00']
        }
        
        const parsedSettings = {
          timezone: (settings as any).timezone || 'America/New_York',
          reminder_enabled: Boolean((settings as any).reminder_enabled),
          reminder_times: reminderTimes,
          correlation_sensitivity: (settings as any).correlation_sensitivity || 0.3,
          data_retention_days: (settings as any).data_retention_days || 365,
          dark_mode: Boolean((settings as any).dark_mode)
        }
        
        res.json({
          success: true,
          data: parsedSettings
        })
      }
    )
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    })
  }
})

// Update user settings
router.put('/settings', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { timezone, reminder_enabled, reminder_times, correlation_sensitivity, data_retention_days, dark_mode } = req.body
    
    const db = database.getDatabase()
    
    // Convert reminder_times to JSON string
    const reminderTimesJson = Array.isArray(reminder_times) ? JSON.stringify(reminder_times) : JSON.stringify(['09:00', '21:00'])
    
    // First, check if user settings already exist
    db.get('SELECT id FROM user_settings WHERE user_id = ?', [req.userId], (err, existingSettings) => {
      if (err) {
        console.error('Error checking existing settings:', err)
        return res.status(500).json({
          success: false,
          error: 'Failed to update settings'
        })
      }
      
      if (existingSettings) {
        // Update existing settings
        db.run(
          `UPDATE user_settings 
           SET timezone = ?, reminder_enabled = ?, reminder_times = ?, 
               correlation_sensitivity = ?, data_retention_days = ?, dark_mode = ?, 
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [
            timezone || 'America/New_York',
            reminder_enabled ? 1 : 0,
            reminderTimesJson,
            correlation_sensitivity || 0.3,
            data_retention_days || 365,
            dark_mode ? 1 : 0,
            req.userId
          ],
          function(err) {
            if (err) {
              console.error('Error updating settings:', err)
              return res.status(500).json({
                success: false,
                error: 'Failed to update settings'
              })
            }
            
            res.json({
              success: true,
              message: 'Settings updated successfully'
            })
          }
        )
      } else {
        // Insert new settings
        db.run(
          `INSERT INTO user_settings 
           (user_id, timezone, reminder_enabled, reminder_times, correlation_sensitivity, data_retention_days, dark_mode)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            req.userId,
            timezone || 'America/New_York',
            reminder_enabled ? 1 : 0,
            reminderTimesJson,
            correlation_sensitivity || 0.3,
            data_retention_days || 365,
            dark_mode ? 1 : 0
          ],
          function(err) {
            if (err) {
              console.error('Error creating settings:', err)
              return res.status(500).json({
                success: false,
                error: 'Failed to create settings'
              })
            }
            
            res.json({
              success: true,
              message: 'Settings created successfully'
            })
          }
        )
      }
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    })
  }
})

// Get data statistics
router.get('/data/stats', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase()
    
    // Get statistics for different data types
    const queries = [
      // Count total days with data (distinct dates across all tables)
      `SELECT COUNT(DISTINCT date) as totalDays FROM (
        SELECT date FROM meals WHERE user_id = ?
        UNION
        SELECT date FROM symptom_logs WHERE user_id = ?
        UNION
        SELECT date FROM medication_logs WHERE user_id = ?
        UNION
        SELECT date FROM bowel_movements WHERE user_id = ?
        UNION
        SELECT date FROM sleep_logs WHERE user_id = ?
        UNION
        SELECT date FROM physical_activity_logs WHERE user_id = ?
      )`,
      // Count total meals
      `SELECT COUNT(*) as totalMeals FROM meals WHERE user_id = ?`,
      // Count total symptom logs
      `SELECT COUNT(*) as totalSymptomLogs FROM symptom_logs WHERE user_id = ?`,
      // Count total medication logs
      `SELECT COUNT(*) as totalMedicationLogs FROM medication_logs WHERE user_id = ?`,
      // Count total bowel movement logs
      `SELECT COUNT(*) as totalBowelMovements FROM bowel_movements WHERE user_id = ?`,
      // Count total sleep logs
      `SELECT COUNT(*) as totalSleepLogs FROM sleep_logs WHERE user_id = ?`,
      // Count total physical activity logs
      `SELECT COUNT(*) as totalPhysicalActivityLogs FROM physical_activity_logs WHERE user_id = ?`,
      // Get date range
      `SELECT 
        MIN(earliestDate) as firstEntryDate,
        MAX(latestDate) as lastEntryDate
       FROM (
        SELECT MIN(date) as earliestDate, MAX(date) as latestDate FROM meals WHERE user_id = ?
        UNION ALL
        SELECT MIN(date) as earliestDate, MAX(date) as latestDate FROM symptom_logs WHERE user_id = ?
        UNION ALL
        SELECT MIN(date) as earliestDate, MAX(date) as latestDate FROM medication_logs WHERE user_id = ?
        UNION ALL
        SELECT MIN(date) as earliestDate, MAX(date) as latestDate FROM bowel_movements WHERE user_id = ?
        UNION ALL
        SELECT MIN(date) as earliestDate, MAX(date) as latestDate FROM sleep_logs WHERE user_id = ?
        UNION ALL
        SELECT MIN(date) as earliestDate, MAX(date) as latestDate FROM physical_activity_logs WHERE user_id = ?
       )`
    ]
    
    let completedQueries = 0
    const results: any = {
      totalDays: 0,
      totalMeals: 0,
      totalSymptomLogs: 0,
      totalMedicationLogs: 0,
      totalBowelMovements: 0,
      totalSleepLogs: 0,
      totalPhysicalActivityLogs: 0,
      firstEntryDate: null,
      lastEntryDate: null
    }
    let hasError = false
    
    // Execute all queries
    queries.forEach((query, index) => {
      const params = Array(query.split('?').length - 1).fill(req.userId)
      
      db.get(query, params, (err, result) => {
        if (err && !hasError) {
          hasError = true
          console.error('Error fetching data statistics:', err)
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch data statistics'
          })
        }
        
        // Store results by query index
        if (result) {
          switch (index) {
            case 0:
              (results as any).totalDays = (result as any).totalDays || 0
              break
            case 1:
              (results as any).totalMeals = (result as any).totalMeals || 0
              break
            case 2:
              (results as any).totalSymptomLogs = (result as any).totalSymptomLogs || 0
              break
            case 3:
              (results as any).totalMedicationLogs = (result as any).totalMedicationLogs || 0
              break
            case 4:
              (results as any).totalBowelMovements = (result as any).totalBowelMovements || 0
              break
            case 5:
              (results as any).totalSleepLogs = (result as any).totalSleepLogs || 0
              break
            case 6:
              (results as any).totalPhysicalActivityLogs = (result as any).totalPhysicalActivityLogs || 0
              break
            case 7:
              (results as any).firstEntryDate = (result as any).firstEntryDate;
              (results as any).lastEntryDate = (result as any).lastEntryDate;
              break
          }
        }
        
        completedQueries++
        if (completedQueries === queries.length && !hasError) {
          res.json({
            success: true,
            data: results
          })
        }
      })
    })
  } catch (error) {
    console.error('Error fetching data statistics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data statistics'
    })
  }
})

// Clean up old data based on retention settings
router.delete('/data/cleanup', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase()
    const { retentionDays: customRetentionDays } = req.body
    
    // Determine retention days - use custom if provided, otherwise fall back to user settings
    const processCleanup = (retentionDays: number) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0] // YYYY-MM-DD format
        
      // Tables to clean up with their date columns
      const cleanupQueries = [
        'DELETE FROM meals WHERE user_id = ? AND date < ?',
        'DELETE FROM symptom_logs WHERE user_id = ? AND date < ?',
        'DELETE FROM medication_logs WHERE user_id = ? AND date < ?',
        'DELETE FROM bowel_movements WHERE user_id = ? AND date < ?'
      ]
      
      let completedQueries = 0
      let totalRowsDeleted = 0
      let hasError = false
      
      db.serialize(() => {
        cleanupQueries.forEach(query => {
          db.run(query, [req.userId, cutoffDateStr], function(err) {
            if (err && !hasError) {
              hasError = true
              console.error('Error during data cleanup:', err)
              return res.status(500).json({
                success: false,
                error: 'Failed to cleanup data'
              })
            }
            
            totalRowsDeleted += this.changes
            completedQueries++
            
            if (completedQueries === cleanupQueries.length && !hasError) {
              res.json({
                success: true,
                message: `Cleaned up ${totalRowsDeleted} old records (older than ${retentionDays} days)`,
                data: {
                  rowsDeleted: totalRowsDeleted,
                  retentionDays: retentionDays,
                  cutoffDate: cutoffDateStr
                }
              })
            }
          })
        })
      })
    }
    
    // Check if custom retention days provided and valid
    if (customRetentionDays && typeof customRetentionDays === 'number' && customRetentionDays >= 7 && customRetentionDays <= 3650) {
      processCleanup(customRetentionDays)
    } else {
      // Fall back to user settings
      db.get(
        'SELECT data_retention_days FROM user_settings WHERE user_id = ?',
        [req.userId],
        (err, settings) => {
          if (err) {
            console.error('Error fetching user settings for cleanup:', err)
            return res.status(500).json({
              success: false,
              error: 'Failed to fetch retention settings'
            })
          }
          
          // Default to 365 days if no setting exists
          const retentionDays = (settings as any)?.data_retention_days || 365
          processCleanup(retentionDays)
        }
      )
    }
  } catch (error) {
    console.error('Error during data cleanup:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup data'
    })
  }
})

// Clear all user data
router.delete('/data/clear-all', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase()
    
    // Define all tables with user_id column to clear
    const clearQueries = [
      'DELETE FROM symptom_logs WHERE user_id = ?',
      'DELETE FROM medication_logs WHERE user_id = ?',
      'DELETE FROM bowel_movements WHERE user_id = ?',
      'DELETE FROM sleep_logs WHERE user_id = ?',
      'DELETE FROM food_symptom_correlations WHERE user_id = ?',
      'DELETE FROM meal_foods WHERE meal_id IN (SELECT id FROM meals WHERE user_id = ?)',
      'DELETE FROM meals WHERE user_id = ?',
      'DELETE FROM foods WHERE user_id = ? AND is_custom = 1',
      'DELETE FROM medications WHERE user_id = ? AND is_custom = 1',
      'DELETE FROM symptoms WHERE user_id = ?',
      'DELETE FROM symptom_categories WHERE user_id = ?'
    ]
    
    let totalRowsDeleted = 0
    let completedQueries = 0
    let hasError = false
    
    db.serialize(() => {
      clearQueries.forEach(query => {
        db.run(query, [req.userId], function(err) {
          if (err && !hasError) {
            hasError = true
            console.error('Error during data clearing:', err)
            return res.status(500).json({
              success: false,
              error: 'Failed to clear all data'
            })
          }
          
          totalRowsDeleted += this.changes
          completedQueries++
          
          if (completedQueries === clearQueries.length && !hasError) {
            res.json({
              success: true,
              message: `Successfully cleared all user data (${totalRowsDeleted} records deleted)`,
              data: {
                rowsDeleted: totalRowsDeleted
              }
            })
          }
        })
      })
    })
  } catch (error) {
    console.error('Error during data clearing:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clear all data'
    })
  }
})

export default router