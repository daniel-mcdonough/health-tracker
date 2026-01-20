import express from 'express'
import { database } from '../database/init.js'
import { authenticateToken } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'

const router = express.Router()

// Export all user data as JSON
router.get('/export', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase()
    const userId = req.userId
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: userId,
      data: {
        symptomLogs: [] as any[],
        meals: [] as any[],
        bowelMovements: [] as any[],
        medicationLogs: [] as any[],
        sleepLogs: [] as any[],
        customFoods: [] as any[],
        customMedications: [] as any[],
        userSettings: null as any
      }
    }

    let completedQueries = 0
    const totalQueries = 8

    const checkComplete = () => {
      completedQueries++
      if (completedQueries === totalQueries) {
        // Set headers for file download
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="health-tracker-export-${new Date().toISOString().split('T')[0]}.json"`)
        res.json(exportData)
      }
    }

    // Export symptom logs with symptom details
    db.all(`
      SELECT 
        sl.id, sl.severity, sl.time, sl.notes, sl.logged_at, sl.date,
        s.name as symptom_name, sc.name as category_name
      FROM symptom_logs sl
      JOIN symptoms s ON sl.symptom_id = s.id
      JOIN symptom_categories sc ON s.category_id = sc.id
      WHERE sl.user_id = ?
      ORDER BY sl.date DESC, sl.time DESC
    `, [userId], (err, rows) => {
      if (err) {
        console.error('Error exporting symptom logs:', err)
        exportData.data.symptomLogs = []
      } else {
        exportData.data.symptomLogs = rows || []
      }
      checkComplete()
    })

    // Export meals with foods
    db.all(`
      SELECT 
        m.id, m.meal_type, m.meal_time, m.notes as meal_notes, m.date,
        f.name as food_name, f.category as food_category, f.common_allergens,
        mf.portion_size, mf.preparation_method
      FROM meals m
      LEFT JOIN meal_foods mf ON m.id = mf.meal_id
      LEFT JOIN foods f ON mf.food_id = f.id
      WHERE m.user_id = ?
      ORDER BY m.date DESC, m.meal_time DESC
    `, [userId], (err, rows) => {
      if (err) {
        console.error('Error exporting meals:', err)
        exportData.data.meals = []
      } else {
        // Group by meal
        const mealsMap = new Map()
        ;(rows || []).forEach((row: any) => {
          if (!mealsMap.has(row.id)) {
            mealsMap.set(row.id, {
              id: row.id,
              meal_type: row.meal_type,
              meal_time: row.meal_time,
              meal_notes: row.meal_notes,
              date: row.date,
              foods: []
            })
          }
          if (row.food_name) {
            mealsMap.get(row.id).foods.push({
              name: row.food_name,
              category: row.food_category,
              allergens: row.common_allergens,
              portion_size: row.portion_size,
              preparation_method: row.preparation_method
            })
          }
        })
        exportData.data.meals = Array.from(mealsMap.values())
      }
      checkComplete()
    })

    // Export bowel movements
    db.all(`
      SELECT *
      FROM bowel_movements
      WHERE user_id = ?
      ORDER BY date DESC, time DESC
    `, [userId], (err, rows) => {
      if (err) {
        console.error('Error exporting bowel movements:', err)
        exportData.data.bowelMovements = []
      } else {
        exportData.data.bowelMovements = rows || []
      }
      checkComplete()
    })

    // Export medication logs with medication details
    db.all(`
      SELECT 
        ml.id, ml.date, ml.time, ml.dosage_amount, ml.dosage_unit, 
        ml.dosage_form, ml.notes, ml.logged_at,
        m.name as medication_name, m.scientific_name, m.category
      FROM medication_logs ml
      JOIN medications m ON ml.medication_id = m.id
      WHERE ml.user_id = ?
      ORDER BY ml.date DESC, ml.time DESC
    `, [userId], (err, rows) => {
      if (err) {
        console.error('Error exporting medication logs:', err)
        exportData.data.medicationLogs = []
      } else {
        exportData.data.medicationLogs = rows || []
      }
      checkComplete()
    })

    // Export sleep logs
    db.all(`
      SELECT *
      FROM sleep_logs
      WHERE user_id = ?
      ORDER BY date DESC
    `, [userId], (err, rows) => {
      if (err) {
        console.error('Error exporting sleep logs:', err)
        exportData.data.sleepLogs = []
      } else {
        exportData.data.sleepLogs = rows || []
      }
      checkComplete()
    })

    // Export custom foods created by user
    db.all(`
      SELECT id, name, category, common_allergens, is_composed, created_at
      FROM foods
      WHERE user_id = ? AND is_custom = 1
      ORDER BY name
    `, [userId], (err, rows) => {
      if (err) {
        console.error('Error exporting custom foods:', err)
        exportData.data.customFoods = []
      } else {
        exportData.data.customFoods = rows || []
      }
      checkComplete()
    })

    // Export custom medications created by user
    db.all(`
      SELECT id, name, scientific_name, category, dosage_forms, created_at
      FROM medications
      WHERE user_id = ? AND is_custom = 1
      ORDER BY name
    `, [userId], (err, rows) => {
      if (err) {
        console.error('Error exporting custom medications:', err)
        exportData.data.customMedications = []
      } else {
        exportData.data.customMedications = rows || []
      }
      checkComplete()
    })

    // Export user settings (if they exist)
    db.get(`
      SELECT timezone, reminder_enabled, reminder_times, 
             correlation_sensitivity, data_retention_days, created_at, updated_at
      FROM user_settings
      WHERE user_id = ?
    `, [userId], (err, row) => {
      if (err) {
        console.error('Error exporting user settings:', err)
        exportData.data.userSettings = null
      } else {
        exportData.data.userSettings = row || null
      }
      checkComplete()
    })

  } catch (error) {
    console.error('Error exporting data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    })
  }
})

// Import health data from JSON
router.post('/import', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase()
    const userId = req.userId
    const importData = req.body
    
    // Validate import data structure
    if (!importData || !importData.data) {
      return res.status(400).json({
        success: false,
        error: 'Invalid import data format - missing data section'
      })
    }

    const { data } = importData
    const importOptions = {
      replaceData: req.body.replaceData === true,
      dryRun: req.body.dryRun === true
    }

    let importResults = {
      userSettings: { imported: 0, errors: 0 },
      customFoods: { imported: 0, errors: 0 },
      customMedications: { imported: 0, errors: 0 },
      meals: { imported: 0, errors: 0 },
      symptomLogs: { imported: 0, errors: 0 },
      bowelMovements: { imported: 0, errors: 0 },
      medicationLogs: { imported: 0, errors: 0 },
      sleepLogs: { imported: 0, errors: 0 },
      warnings: [] as string[]
    }

    let operationsCompleted = 0
    const totalOperations = 8 // Number of import operations
    let hasError = false

    const checkComplete = () => {
      operationsCompleted++
      if (operationsCompleted === totalOperations && !hasError) {
        res.json({
          success: true,
          message: importOptions.dryRun ? 'Import validation successful' : 'Data imported successfully',
          results: importResults
        })
      }
    }

    const handleError = (operation: string, error: any) => {
      if (!hasError) {
        hasError = true
        console.error(`Error during ${operation} import:`, error)
        res.status(500).json({
          success: false,
          error: `Failed to import ${operation}: ${error.message}`,
          results: importResults
        })
      }
    }

    // Helper to get symptom ID by name and category
    const getSymptomId = (symptomName: string, categoryName: string): Promise<number | null> => {
      return new Promise((resolve) => {
        db.get(`
          SELECT s.id FROM symptoms s
          JOIN symptom_categories sc ON s.category_id = sc.id
          WHERE s.name = ? AND sc.name = ? AND s.user_id = ?
        `, [symptomName, categoryName, userId], (err, row: any) => {
          if (err || !row) {
            resolve(null)
          } else {
            resolve(row.id)
          }
        })
      })
    }

    // Helper to get medication ID by name
    const getMedicationId = (medicationName: string): Promise<number | null> => {
      return new Promise((resolve) => {
        db.get(`
          SELECT id FROM medications 
          WHERE name = ? AND (user_id = ? OR user_id IS NULL)
          ORDER BY user_id DESC NULLS LAST
          LIMIT 1
        `, [medicationName, userId], (err, row: any) => {
          if (err || !row) {
            resolve(null)
          } else {
            resolve(row.id)
          }
        })
      })
    }

    // Helper to get food ID by name
    const getFoodId = (foodName: string): Promise<number | null> => {
      return new Promise((resolve) => {
        db.get(`
          SELECT id FROM foods 
          WHERE name = ? AND (user_id = ? OR user_id IS NULL)
          ORDER BY user_id DESC NULLS LAST
          LIMIT 1
        `, [foodName, userId], (err, row: any) => {
          if (err || !row) {
            resolve(null)
          } else {
            resolve(row.id)
          }
        })
      })
    }

    // 1. Import user settings
    const importUserSettings = () => {
      if (!data.userSettings) {
        importResults.userSettings = { imported: 0, errors: 0 }
        checkComplete()
        return
      }

      if (importOptions.dryRun) {
        importResults.userSettings.imported = 1
        checkComplete()
        return
      }

      const settings = data.userSettings
      db.run(`
        INSERT OR REPLACE INTO user_settings 
        (user_id, timezone, reminder_enabled, reminder_times, 
         correlation_sensitivity, data_retention_days, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        userId,
        settings.timezone || 'America/New_York',
        settings.reminder_enabled || 0,
        settings.reminder_times || '["09:00","21:00"]',
        settings.correlation_sensitivity || 0.3,
        settings.data_retention_days || 365
      ], function(err) {
        if (err) {
          handleError('user settings', err)
        } else {
          importResults.userSettings.imported = 1
          checkComplete()
        }
      })
    }

    // 2. Import custom foods
    const importCustomFoods = () => {
      const customFoods = data.customFoods || []
      if (customFoods.length === 0) {
        checkComplete()
        return
      }

      if (importOptions.dryRun) {
        importResults.customFoods.imported = customFoods.length
        checkComplete()
        return
      }

      let foodsProcessed = 0
      let foodImportError = false

      customFoods.forEach((food: any) => {
        if (foodImportError) return

        // Check if custom food already exists for this user
        db.get(`
          SELECT id FROM foods 
          WHERE user_id = ? AND name = ? AND is_custom = 1
        `, [userId, food.name], (err, existingFood: any) => {
          if (err && !foodImportError) {
            foodImportError = true
            handleError('custom foods', err)
            return
          }

          if (existingFood) {
            // Update existing custom food
            db.run(`
              UPDATE foods 
              SET category = ?, common_allergens = ?, is_composed = ?
              WHERE id = ?
            `, [
              food.category || 'custom',
              food.common_allergens || '[]',
              food.is_composed || 0,
              existingFood.id
            ], function(err) {
              if (err && !foodImportError) {
                foodImportError = true
                handleError('custom foods', err)
              } else if (!err) {
                importResults.customFoods.imported++
              }

              foodsProcessed++
              if (foodsProcessed === customFoods.length && !foodImportError) {
                checkComplete()
              }
            })
          } else {
            // Insert new custom food
            db.run(`
              INSERT INTO foods 
              (user_id, name, category, common_allergens, is_custom, is_composed, created_at)
              VALUES (?, ?, ?, ?, 1, ?, datetime('now'))
            `, [
              userId,
              food.name,
              food.category || 'custom',
              food.common_allergens || '[]',
              food.is_composed || 0
            ], function(err) {
              if (err && !foodImportError) {
                foodImportError = true
                handleError('custom foods', err)
              } else if (!err) {
                importResults.customFoods.imported++
              }

              foodsProcessed++
              if (foodsProcessed === customFoods.length && !foodImportError) {
                checkComplete()
              }
            })
          }
        })
      })
    }

    // 3. Import custom medications
    const importCustomMedications = () => {
      const customMeds = data.customMedications || []
      if (customMeds.length === 0) {
        checkComplete()
        return
      }

      if (importOptions.dryRun) {
        importResults.customMedications.imported = customMeds.length
        checkComplete()
        return
      }

      let medsProcessed = 0
      let medImportError = false

      customMeds.forEach((med: any) => {
        if (medImportError) return

        // Check if custom medication already exists for this user
        db.get(`
          SELECT id FROM medications 
          WHERE user_id = ? AND name = ? AND is_custom = 1
        `, [userId, med.name], (err, existingMed: any) => {
          if (err && !medImportError) {
            medImportError = true
            handleError('custom medications', err)
            return
          }

          if (existingMed) {
            // Update existing custom medication
            db.run(`
              UPDATE medications 
              SET scientific_name = ?, category = ?, dosage_forms = ?
              WHERE id = ?
            `, [
              med.scientific_name || med.name,
              med.category || 'other',
              med.dosage_forms || '["pill"]',
              existingMed.id
            ], function(err) {
              if (err && !medImportError) {
                medImportError = true
                handleError('custom medications', err)
              } else if (!err) {
                importResults.customMedications.imported++
              }

              medsProcessed++
              if (medsProcessed === customMeds.length && !medImportError) {
                checkComplete()
              }
            })
          } else {
            // Insert new custom medication
            db.run(`
              INSERT INTO medications 
              (user_id, name, scientific_name, category, dosage_forms, is_custom, created_at)
              VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
            `, [
              userId,
              med.name,
              med.scientific_name || med.name,
              med.category || 'other',
              med.dosage_forms || '["pill"]'
            ], function(err) {
              if (err && !medImportError) {
                medImportError = true
                handleError('custom medications', err)
              } else if (!err) {
                importResults.customMedications.imported++
              }

              medsProcessed++
              if (medsProcessed === customMeds.length && !medImportError) {
                checkComplete()
              }
            })
          }
        })
      })
    }

    // 4. Import meals
    const importMeals = async () => {
      const meals = data.meals || []
      if (meals.length === 0) {
        checkComplete()
        return
      }

      if (importOptions.dryRun) {
        importResults.meals.imported = meals.length
        checkComplete()
        return
      }

      let mealsProcessed = 0
      let mealImportError = false

      for (const meal of meals) {
        if (mealImportError) break

        // Check if meal already exists (same user, meal_time, date)
        db.get(`
          SELECT id FROM meals 
          WHERE user_id = ? AND meal_time = ? AND date = ?
        `, [userId, meal.meal_time, meal.date], async (err, existingMeal: any) => {
          if (err && !mealImportError) {
            mealImportError = true
            handleError('meals', err)
            return
          }

          let mealId: number

          if (existingMeal) {
            // Update existing meal
            db.run(`
              UPDATE meals 
              SET meal_type = ?, notes = ? 
              WHERE id = ?
            `, [
              meal.meal_type || 'snack',
              meal.meal_notes || '',
              existingMeal.id
            ], async (err) => {
              if (err && !mealImportError) {
                mealImportError = true
                handleError('meals', err)
                return
              }

              mealId = existingMeal.id

              // Clear existing meal_foods for this meal before adding new ones
              db.run(`DELETE FROM meal_foods WHERE meal_id = ?`, [mealId], async (err) => {
                if (err && !mealImportError) {
                  mealImportError = true
                  handleError('meal foods cleanup', err)
                  return
                }

                await processMealFoods(mealId, meal.foods || [])
              })
            })
          } else {
            // Insert new meal
            db.run(`
              INSERT INTO meals (user_id, meal_type, meal_time, date, notes, created_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [
              userId,
              meal.meal_type || 'snack',
              meal.meal_time,
              meal.date,
              meal.meal_notes || ''
            ], async function(err) {
              if (err && !mealImportError) {
                mealImportError = true
                handleError('meals', err)
                return
              }

              mealId = this.lastID
              await processMealFoods(mealId, meal.foods || [])
            })
          }

          // Helper function to process meal foods
          async function processMealFoods(mealId: number, foods: any[]) {
            if (foods.length === 0) {
              importResults.meals.imported++
              mealsProcessed++
              if (mealsProcessed === meals.length && !mealImportError) {
                checkComplete()
              }
              return
            }

            let foodsProcessed = 0
            for (const food of foods) {
              if (mealImportError) break

              try {
                const foodId = await getFoodId(food.name)
                if (!foodId) {
                  importResults.warnings.push(`Food '${food.name}' not found in database, skipping`)
                  foodsProcessed++
                  if (foodsProcessed === foods.length) {
                    importResults.meals.imported++
                    mealsProcessed++
                    if (mealsProcessed === meals.length && !mealImportError) {
                      checkComplete()
                    }
                  }
                  continue
                }

                db.run(`
                  INSERT INTO meal_foods 
                  (meal_id, food_id, portion_size, preparation_method, portion_grams)
                  VALUES (?, ?, ?, ?, NULL)
                `, [mealId, foodId, food.portion_size, food.preparation_method], (err) => {
                  if (err && !mealImportError) {
                    mealImportError = true
                    handleError('meal foods', err)
                    return
                  }

                  foodsProcessed++
                  if (foodsProcessed === foods.length && !mealImportError) {
                    importResults.meals.imported++
                    mealsProcessed++
                    if (mealsProcessed === meals.length) {
                      checkComplete()
                    }
                  }
                })
              } catch (error) {
                if (!mealImportError) {
                  mealImportError = true
                  handleError('meal foods lookup', error)
                }
              }
            }
          }
        })
      }
    }

    // 5. Import symptom logs
    const importSymptomLogs = async () => {
      const symptomLogs = data.symptomLogs || []
      if (symptomLogs.length === 0) {
        checkComplete()
        return
      }

      if (importOptions.dryRun) {
        importResults.symptomLogs.imported = symptomLogs.length
        checkComplete()
        return
      }

      let logsProcessed = 0
      let logImportError = false

      for (const log of symptomLogs) {
        if (logImportError) break

        try {
          const symptomId = await getSymptomId(log.symptom_name, log.category_name)
          if (!symptomId) {
            importResults.warnings.push(`Symptom '${log.symptom_name}' in category '${log.category_name}' not found, skipping`)
            logsProcessed++
            if (logsProcessed === symptomLogs.length) {
              checkComplete()
            }
            continue
          }

          db.run(`
            INSERT OR REPLACE INTO symptom_logs 
            (user_id, symptom_id, severity, time, date, notes, logged_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            userId,
            symptomId,
            log.severity,
            log.time,
            log.date,
            log.notes,
            log.logged_at || new Date().toISOString()
          ], (err) => {
            if (err && !logImportError) {
              logImportError = true
              handleError('symptom logs', err)
            } else if (!err) {
              importResults.symptomLogs.imported++
            }

            logsProcessed++
            if (logsProcessed === symptomLogs.length && !logImportError) {
              checkComplete()
            }
          })
        } catch (error) {
          if (!logImportError) {
            logImportError = true
            handleError('symptom logs lookup', error)
          }
        }
      }
    }

    // 6. Import bowel movements
    const importBowelMovements = () => {
      const bowelMovements = data.bowelMovements || []
      if (bowelMovements.length === 0) {
        checkComplete()
        return
      }

      if (importOptions.dryRun) {
        importResults.bowelMovements.imported = bowelMovements.length
        checkComplete()
        return
      }

      let movementsProcessed = 0
      let movementImportError = false

      bowelMovements.forEach((movement: any) => {
        if (movementImportError) return

        // Check if movement already exists (same user, date, time)
        db.get(`
          SELECT id FROM bowel_movements 
          WHERE user_id = ? AND date = ? AND time = ?
        `, [userId, movement.date, movement.time], (err, existingRow: any) => {
          if (err && !movementImportError) {
            movementImportError = true
            handleError('bowel movements', err)
            return
          }

          if (existingRow) {
            // Update existing record
            db.run(`
              UPDATE bowel_movements 
              SET bristol_scale = ?, color = ?, size = ?, urgency = ?, 
                  ease_of_passage = ?, blood_present = ?, mucus_present = ?, 
                  notes = ?, logged_at = ?
              WHERE id = ?
            `, [
              movement.bristol_scale,
              movement.color,
              movement.size,
              movement.urgency,
              movement.ease_of_passage,
              movement.blood_present || 0,
              movement.mucus_present || 0,
              movement.notes,
              movement.logged_at || new Date().toISOString(),
              existingRow.id
            ], (err) => {
              if (err && !movementImportError) {
                movementImportError = true
                handleError('bowel movements', err)
              } else if (!err) {
                importResults.bowelMovements.imported++
              }

              movementsProcessed++
              if (movementsProcessed === bowelMovements.length && !movementImportError) {
                checkComplete()
              }
            })
          } else {
            // Insert new record
            db.run(`
              INSERT INTO bowel_movements 
              (user_id, date, time, bristol_scale, color, size, urgency, 
               ease_of_passage, blood_present, mucus_present, notes, logged_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              userId,
              movement.date,
              movement.time,
              movement.bristol_scale,
              movement.color,
              movement.size,
              movement.urgency,
              movement.ease_of_passage,
              movement.blood_present || 0,
              movement.mucus_present || 0,
              movement.notes,
              movement.logged_at || new Date().toISOString()
            ], (err) => {
              if (err && !movementImportError) {
                movementImportError = true
                handleError('bowel movements', err)
              } else if (!err) {
                importResults.bowelMovements.imported++
              }

              movementsProcessed++
              if (movementsProcessed === bowelMovements.length && !movementImportError) {
                checkComplete()
              }
            })
          }
        })
      })
    }

    // 7. Import medication logs
    const importMedicationLogs = async () => {
      const medicationLogs = data.medicationLogs || []
      if (medicationLogs.length === 0) {
        checkComplete()
        return
      }

      if (importOptions.dryRun) {
        importResults.medicationLogs.imported = medicationLogs.length
        checkComplete()
        return
      }

      let logsProcessed = 0
      let logImportError = false

      for (const log of medicationLogs) {
        if (logImportError) break

        try {
          const medicationId = await getMedicationId(log.medication_name)
          if (!medicationId) {
            importResults.warnings.push(`Medication '${log.medication_name}' not found in database, skipping`)
            logsProcessed++
            if (logsProcessed === medicationLogs.length) {
              checkComplete()
            }
            continue
          }

          // Check if medication log already exists (same user, medication, date, time)
          db.get(`
            SELECT id FROM medication_logs 
            WHERE user_id = ? AND medication_id = ? AND date = ? AND time = ?
          `, [userId, medicationId, log.date, log.time], (err, existingRow: any) => {
            if (err && !logImportError) {
              logImportError = true
              handleError('medication logs', err)
              return
            }

            if (existingRow) {
              // Update existing record
              db.run(`
                UPDATE medication_logs 
                SET dosage_amount = ?, dosage_unit = ?, dosage_form = ?, 
                    notes = ?, logged_at = ?
                WHERE id = ?
              `, [
                log.dosage_amount,
                log.dosage_unit,
                log.dosage_form,
                log.notes,
                log.logged_at || new Date().toISOString(),
                existingRow.id
              ], (err) => {
                if (err && !logImportError) {
                  logImportError = true
                  handleError('medication logs', err)
                } else if (!err) {
                  importResults.medicationLogs.imported++
                }

                logsProcessed++
                if (logsProcessed === medicationLogs.length && !logImportError) {
                  checkComplete()
                }
              })
            } else {
              // Insert new record
              db.run(`
                INSERT INTO medication_logs 
                (user_id, medication_id, date, time, dosage_amount, dosage_unit, 
                 dosage_form, notes, logged_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                userId,
                medicationId,
                log.date,
                log.time,
                log.dosage_amount,
                log.dosage_unit,
                log.dosage_form,
                log.notes,
                log.logged_at || new Date().toISOString()
              ], (err) => {
                if (err && !logImportError) {
                  logImportError = true
                  handleError('medication logs', err)
                } else if (!err) {
                  importResults.medicationLogs.imported++
                }

                logsProcessed++
                if (logsProcessed === medicationLogs.length && !logImportError) {
                  checkComplete()
                }
              })
            }
          })
        } catch (error) {
          if (!logImportError) {
            logImportError = true
            handleError('medication logs lookup', error)
          }
        }
      }
    }

    // 8. Import sleep logs
    const importSleepLogs = () => {
      const sleepLogs = data.sleepLogs || []
      if (sleepLogs.length === 0) {
        checkComplete()
        return
      }

      if (importOptions.dryRun) {
        importResults.sleepLogs.imported = sleepLogs.length
        checkComplete()
        return
      }

      let logsProcessed = 0
      let logImportError = false

      sleepLogs.forEach((log: any) => {
        if (logImportError) return

        // Check if sleep log already exists (same user, date)
        db.get(`
          SELECT id FROM sleep_logs 
          WHERE user_id = ? AND date = ?
        `, [userId, log.date], (err, existingRow: any) => {
          if (err && !logImportError) {
            logImportError = true
            handleError('sleep logs', err)
            return
          }

          if (existingRow) {
            // Update existing record
            db.run(`
              UPDATE sleep_logs 
              SET went_to_bed_on_time = ?, dry_eye_severity = ?, disruption_cause = ?, 
                  difficulty_falling_asleep = ?, night_wakings = ?, morning_grogginess = ?, 
                  next_day_fatigue = ?, notes = ?, logged_at = ?
              WHERE id = ?
            `, [
              log.went_to_bed_on_time || 0,
              log.dry_eye_severity,
              log.disruption_cause,
              log.difficulty_falling_asleep || 0,
              log.night_wakings || 0,
              log.morning_grogginess,
              log.next_day_fatigue,
              log.notes,
              log.logged_at || new Date().toISOString(),
              existingRow.id
            ], (err) => {
              if (err && !logImportError) {
                logImportError = true
                handleError('sleep logs', err)
              } else if (!err) {
                importResults.sleepLogs.imported++
              }

              logsProcessed++
              if (logsProcessed === sleepLogs.length && !logImportError) {
                checkComplete()
              }
            })
          } else {
            // Insert new record
            db.run(`
              INSERT INTO sleep_logs 
              (user_id, date, went_to_bed_on_time, dry_eye_severity, disruption_cause, 
               difficulty_falling_asleep, night_wakings, morning_grogginess, 
               next_day_fatigue, notes, logged_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              userId,
              log.date,
              log.went_to_bed_on_time || 0,
              log.dry_eye_severity,
              log.disruption_cause,
              log.difficulty_falling_asleep || 0,
              log.night_wakings || 0,
              log.morning_grogginess,
              log.next_day_fatigue,
              log.notes,
              log.logged_at || new Date().toISOString()
            ], (err) => {
              if (err && !logImportError) {
                logImportError = true
                handleError('sleep logs', err)
              } else if (!err) {
                importResults.sleepLogs.imported++
              }

              logsProcessed++
              if (logsProcessed === sleepLogs.length && !logImportError) {
                checkComplete()
              }
            })
          }
        })
      })
    }

    // Execute imports in order
    setTimeout(() => importUserSettings(), 0)
    setTimeout(() => importCustomFoods(), 50)
    setTimeout(() => importCustomMedications(), 100)
    setTimeout(() => importMeals(), 150)
    setTimeout(() => importSymptomLogs(), 200)
    setTimeout(() => importBowelMovements(), 250)
    setTimeout(() => importMedicationLogs(), 300)
    setTimeout(() => importSleepLogs(), 350)

  } catch (error) {
    console.error('Error importing data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to import data: ' + (error instanceof Error ? error.message : String(error))
    })
  }
})

export default router