import express from 'express'
import { database } from '../database/init.js'
import { authenticateToken } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'

const router = express.Router()

// Get all medications
router.get('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase()
    
    db.all('SELECT id, name, scientific_name, category, dosage_forms FROM medications GROUP BY name, category ORDER BY name', (err, medications) => {
      if (err) {
        console.error('Error fetching medications:', err)
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch medications'
        })
      }
      
      if (!Array.isArray(medications)) {
        return res.status(500).json({
          success: false,
          error: 'Database query error'
        })
      }
      
      // Parse dosage forms JSON string to array
      const parsedMedications = medications.filter((med: any) => med && med.id).map((med: any) => {
        try {
          return {
            ...med,
            dosageForms: med.dosage_forms ? (() => {
              try {
                return JSON.parse(med.dosage_forms)
              } catch {
                return med.dosage_forms.split(',').filter((f: string) => f.length > 0)
              }
            })() : []
          }
        } catch (error) {
          console.error('Error processing medication:', med, error)
          return null
        }
      }).filter(med => med !== null)
      
      res.json({
        success: true,
        data: parsedMedications
      })
    })
  } catch (error) {
    console.error('Error fetching medications:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medications'
    })
  }
})

// Add a new medication
router.post('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { name, scientificName, category, dosageForms } = req.body
    
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name and category are required'
      })
    }

    const db = database.getDatabase()
    const dosageFormsStr = Array.isArray(dosageForms) ? JSON.stringify(dosageForms) : JSON.stringify(['pill'])
    
    db.run(
      'INSERT INTO medications (user_id, name, scientific_name, category, dosage_forms, is_custom) VALUES (?, ?, ?, ?, ?, ?)',
      [req.userId, name, scientificName || name, category, dosageFormsStr, true],
      function(err) {
        if (err) {
          console.error('Error adding medication:', err)
          return res.status(500).json({
            success: false,
            error: 'Failed to add medication'
          })
        }

        // Get the newly inserted medication
        db.get('SELECT id, name, scientific_name, category, dosage_forms FROM medications WHERE id = ?', [this.lastID], (err, newMedication) => {
          if (err) {
            console.error('Error fetching new medication:', err)
            return res.status(500).json({
              success: false,
              error: 'Failed to fetch new medication'
            })
          }
          
          // Parse dosage forms for response
          if (newMedication) {
            (newMedication as any).dosageForms = (newMedication as any).dosage_forms ? (() => {
              try {
                return JSON.parse((newMedication as any).dosage_forms)
              } catch {
                return (newMedication as any).dosage_forms.split(',').filter((f: string) => f.length > 0)
              }
            })() : []
          }
          
          res.json({
            success: true,
            data: newMedication
          })
        })
      }
    )
  } catch (error) {
    console.error('Error adding medication:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add medication'
    })
  }
})

// Log medication intake
router.post('/logs', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { medicationId, date, time, dosageAmount, dosageUnit, dosageForm, notes } = req.body
    
    if (!medicationId || !date || !time || !dosageAmount || !dosageUnit || !dosageForm) {
      return res.status(400).json({
        success: false,
        error: 'Medication ID, date, time, dosage amount, unit, and form are required'
      })
    }

    const db = database.getDatabase()
    
    db.run(
      'INSERT INTO medication_logs (user_id, medication_id, date, time, dosage_amount, dosage_unit, dosage_form, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, medicationId, date, time, dosageAmount, dosageUnit, dosageForm, notes || null],
      function(err) {
        if (err) {
          console.error('Error logging medication:', err)
          return res.status(500).json({
            success: false,
            error: 'Failed to log medication'
          })
        }

        res.json({
          success: true,
          data: { id: this.lastID }
        })
      }
    )
  } catch (error) {
    console.error('Error logging medication:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to log medication'  
    })
  }
})

// Get medication logs for a date range
router.get('/logs', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate } = req.query
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      })
    }

    const db = database.getDatabase()
    
    db.all(
      `SELECT 
        ml.id,
        ml.date,
        ml.time,
        ml.dosage_amount as dosageAmount,
        ml.dosage_unit as dosageUnit,
        ml.dosage_form as dosageForm,
        ml.notes,
        m.name as medicationName,
        m.scientific_name as scientificName,
        m.category
      FROM medication_logs ml
      JOIN medications m ON ml.medication_id = m.id
      WHERE ml.user_id = ? AND ml.date BETWEEN ? AND ?
      ORDER BY ml.date DESC, ml.time DESC`,
      [req.userId, startDate, endDate],
      (err, logs) => {
        if (err) {
          console.error('Error fetching medication logs:', err)
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch medication logs'
          })
        }

        if (!Array.isArray(logs)) {
          return res.status(500).json({
            success: false,
            error: 'Database query error'
          })
        }

        res.json({
          success: true,
          data: logs
        })
      }
    )
  } catch (error) {
    console.error('Error fetching medication logs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medication logs'
    })
  }
})

// Update medication log
router.put('/logs/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { medicationId, date, time, dosageAmount, dosageUnit, dosageForm, notes } = req.body
    
    if (!medicationId || !date || !time || !dosageAmount || !dosageUnit || !dosageForm) {
      return res.status(400).json({
        success: false,
        error: 'Medication ID, date, time, dosage amount, unit, and form are required'
      })
    }

    const db = database.getDatabase()
    
    // First verify the log belongs to the user
    db.get(
      'SELECT id FROM medication_logs WHERE id = ? AND user_id = ?',
      [id, req.userId],
      (err, log) => {
        if (err) {
          console.error('Error checking medication log ownership:', err)
          return res.status(500).json({
            success: false,
            error: 'Database error'
          })
        }

        if (!log) {
          return res.status(404).json({
            success: false,
            error: 'Medication log not found'
          })
        }

        // Update the medication log
        db.run(
          'UPDATE medication_logs SET medication_id = ?, date = ?, time = ?, dosage_amount = ?, dosage_unit = ?, dosage_form = ?, notes = ? WHERE id = ? AND user_id = ?',
          [medicationId, date, time, dosageAmount, dosageUnit, dosageForm, notes || null, id, req.userId],
          function(err) {
            if (err) {
              console.error('Error updating medication log:', err)
              return res.status(500).json({
                success: false,
                error: 'Failed to update medication log'
              })
            }

            res.json({
              success: true,
              data: { id: parseInt(id) }
            })
          }
        )
      }
    )
  } catch (error) {
    console.error('Error updating medication log:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update medication log'
    })
  }
})

// Delete medication log
router.delete('/logs/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const db = database.getDatabase()

    // First verify the log belongs to the user
    db.get(
      'SELECT id FROM medication_logs WHERE id = ? AND user_id = ?',
      [id, req.userId],
      (err, log) => {
        if (err) {
          console.error('Error checking medication log ownership:', err)
          return res.status(500).json({
            success: false,
            error: 'Database error'
          })
        }

        if (!log) {
          return res.status(404).json({
            success: false,
            error: 'Medication log not found'
          })
        }

        // Delete the medication log
        db.run(
          'DELETE FROM medication_logs WHERE id = ? AND user_id = ?',
          [id, req.userId],
          function(err) {
            if (err) {
              console.error('Error deleting medication log:', err)
              return res.status(500).json({
                success: false,
                error: 'Failed to delete medication log'
              })
            }

            res.json({
              success: true,
              message: 'Medication log deleted successfully'
            })
          }
        )
      }
    )
  } catch (error) {
    console.error('Error deleting medication log:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete medication log'
    })
  }
})

export default router