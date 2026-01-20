import express from 'express'
import { database } from '../database/init.js'
import { authenticateToken } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'

const router = express.Router()

// Get all foods
router.get('/foods', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase()
    
    db.all('SELECT id, name, category, common_allergens as allergens FROM foods GROUP BY name, category ORDER BY name', (err, foods) => {
      if (err) {
        console.error('Error fetching foods:', err)
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch foods'
        })
      }
      
      if (!Array.isArray(foods)) {
        console.error('Foods query did not return an array:', foods)
        return res.status(500).json({
          success: false,
          error: 'Database query error'
        })
      }
      
      // Parse allergens JSON string to array
      const parsedFoods = foods.filter((food: any) => food && food.id && food.name).map((food: any) => {
        try {
          return {
            ...food,
            allergens: food.allergens ? (() => {
              try {
                return JSON.parse(food.allergens)
              } catch {
                // Fallback for comma-separated strings
                return food.allergens.split(',').filter((a: string) => a.length > 0)
              }
            })() : []
          }
        } catch (error) {
          console.error('Error processing food:', food, error)
          return null
        }
      }).filter(food => food !== null)
      
      res.json({
        success: true,
        data: parsedFoods
      })
    })
  } catch (error) {
    console.error('Error fetching foods:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch foods'
    })
  }
})

// Add a new food (simple or composed)
router.post('/foods', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { name, category, allergens, isComposed, ingredients } = req.body
    
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name and category are required'
      })
    }

    const db = database.getDatabase()
    const allergensStr = Array.isArray(allergens) ? JSON.stringify(allergens) : JSON.stringify([])
    const composed = isComposed || false
    
    db.run(
      'INSERT INTO foods (user_id, name, category, common_allergens, is_custom, is_composed) VALUES (?, ?, ?, ?, ?, ?)',
      [req.userId, name, category, allergensStr, true, composed],
      function(err) {
        if (err) {
          console.error('Error adding food:', err)
          return res.status(500).json({
            success: false,
            error: 'Failed to add food'
          })
        }

        const foodId = this.lastID

        // If it's a composed food, add ingredients
        if (composed && ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
          let ingredientsAdded = 0
          let hasError = false

          for (const ingredient of ingredients) {
            if (hasError) break
            
            db.run(
              'INSERT INTO food_ingredients (composed_food_id, ingredient_food_id, quantity, notes) VALUES (?, ?, ?, ?)',
              [foodId, ingredient.foodId, ingredient.quantity || '', ingredient.notes || ''],
              function(err) {
                if (err && !hasError) {
                  hasError = true
                  console.error('Error adding ingredient:', err)
                  return res.status(500).json({
                    success: false,
                    error: 'Failed to add ingredients'
                  })
                }
                
                ingredientsAdded++
                if (ingredientsAdded === ingredients.length && !hasError) {
                  // Get the newly inserted food with ingredients
                  fetchFoodWithIngredients(db, foodId, res)
                }
              }
            )
          }
        } else {
          // Simple food, just return it
          fetchFoodWithIngredients(db, foodId, res)
        }
      }
    )
  } catch (error) {
    console.error('Error adding food:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add food'
    })
  }
})

// Helper function to fetch food with ingredients
function fetchFoodWithIngredients(db: any, foodId: number, res: any) {
  db.get('SELECT id, name, category, common_allergens as allergens, is_composed FROM foods WHERE id = ?', [foodId], (err: any, newFood: any) => {
    if (err) {
      console.error('Error fetching new food:', err)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch new food'
      })
    }
    
    // Parse allergens for response
    if (newFood) {
      newFood.allergens = newFood.allergens ? (() => {
        try {
          return JSON.parse(newFood.allergens)
        } catch {
          return newFood.allergens.split(',').filter((a: string) => a.length > 0)
        }
      })() : []

      // If composed food, get ingredients
      if (newFood.is_composed) {
        db.all(
          `SELECT 
            fi.quantity, fi.notes,
            f.id as ingredientId, f.name as ingredientName, f.category as ingredientCategory
          FROM food_ingredients fi
          JOIN foods f ON fi.ingredient_food_id = f.id
          WHERE fi.composed_food_id = ?`,
          [foodId],
          (err: any, ingredients: any) => {
            if (err) {
              console.error('Error fetching ingredients:', err)
              newFood.ingredients = []
            } else {
              newFood.ingredients = ingredients || []
            }
            
            res.json({
              success: true,
              data: newFood
            })
          }
        )
      } else {
        res.json({
          success: true,
          data: newFood
        })
      }
    }
  })
}

// Log a meal
router.post('/meals', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { date, time, notes, foods } = req.body
    
    if (!date || !time || !foods || !Array.isArray(foods) || foods.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Date, time, and foods are required'
      })
    }

    const db = database.getDatabase()
    
    // Combine date and time for meal_time
    const mealTime = `${date} ${time}:00`
    
    // Insert meal with 'snack' as default meal type since we removed meal type selection
    db.run(
      'INSERT INTO meals (user_id, meal_type, meal_time, notes, date) VALUES (?, ?, ?, ?, ?)',
      [req.userId, 'snack', mealTime, notes || '', date],
      function(err) {
        if (err) {
          console.error('Error logging meal:', err)
          return res.status(500).json({
            success: false,
            error: 'Failed to log meal'
          })
        }

        const mealId = this.lastID
        let foodsInserted = 0
        let hasError = false

        if (foods.length === 0) {
          return res.json({
            success: true,
            data: { id: mealId }
          })
        }

        // Insert meal foods
        for (const food of foods) {
          if (hasError) break
          
          db.run(
            'INSERT INTO meal_foods (meal_id, food_id, portion_size, preparation_method) VALUES (?, ?, ?, ?)',
            [mealId, food.id, food.portionSize || '1 serving', food.preparationMethod || 'as prepared'],
            function(err) {
              if (err && !hasError) {
                hasError = true
                console.error('Error inserting meal food:', err)
                return res.status(500).json({
                  success: false,
                  error: 'Failed to log meal foods'
                })
              }
              
              foodsInserted++
              if (foodsInserted === foods.length && !hasError) {
                res.json({
                  success: true,
                  data: { id: mealId }
                })
              }
            }
          )
        }
      }
    )
  } catch (error) {
    console.error('Error logging meal:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to log meal'  
    })
  }
})

// Get meals for a date range
router.get('/meals', authenticateToken, (req: AuthenticatedRequest, res) => {
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
        m.id,
        m.date,
        strftime('%H:%M', m.meal_time) as mealTime,
        m.notes
      FROM meals m
      WHERE m.user_id = ? AND m.date BETWEEN ? AND ?
      ORDER BY m.date DESC, m.meal_time DESC`,
      [req.userId, startDate, endDate],
      (err, meals) => {
        if (err) {
          console.error('Error fetching meals:', err)
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch meals'
          })
        }

        if (!Array.isArray(meals)) {
          return res.status(500).json({
            success: false,
            error: 'Database query error'
          })
        }

        if (meals.length === 0) {
          return res.json({
            success: true,
            data: []
          })
        }

        // Get foods for each meal
        const mealsWithFoods: any[] = []
        let mealsProcessed = 0

        for (const meal of (meals as any[])) {
          db.all(
            `SELECT 
              f.id,
              f.name,
              f.category,
              f.common_allergens as allergens,
              f.is_composed as isComposed,
              mf.portion_size as portionSize,
              mf.preparation_method as preparationMethod
            FROM meal_foods mf
            JOIN foods f ON mf.food_id = f.id
            WHERE mf.meal_id = ?`,
            [meal.id],
            (err, foods) => {
              if (err) {
                console.error('Error fetching meal foods:', err)
                return res.status(500).json({
                  success: false,
                  error: 'Failed to fetch meal foods'
                })
              }

              // Parse allergens for each food
              const parsedFoods = (foods || []).map((food: any) => ({
                ...food,
                allergens: food.allergens ? (() => {
                  try {
                    return JSON.parse(food.allergens)
                  } catch {
                    return food.allergens.split(',').filter((a: string) => a.length > 0)
                  }
                })() : []
              }))

              mealsWithFoods.push({
                ...meal,
                foods: parsedFoods
              })

              mealsProcessed++
              if (mealsProcessed === meals.length) {
                // Sort by date and time again since async processing might change order
                mealsWithFoods.sort((a, b) => {
                  if (a.date !== b.date) {
                    return b.date.localeCompare(a.date)
                  }
                  return b.mealTime.localeCompare(a.mealTime)
                })

                res.json({
                  success: true,
                  data: mealsWithFoods
                })
              }
            }
          )
        }
      }
    )
  } catch (error) {
    console.error('Error fetching meals:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meals'
    })
  }
})

/**
 * Update a meal
 * PUT /meals/:id
 */
router.put('/meals/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { date, time, notes, foods } = req.body

    if (!date || !time || !foods) {
      return res.status(400).json({
        success: false,
        error: 'Date, time, and foods are required'
      })
    }

    const db = database.getDatabase()
    const mealTime = `${date} ${time}:00`

    // First verify the meal belongs to the user
    db.get(
      'SELECT id FROM meals WHERE id = ? AND user_id = ?',
      [id, req.userId],
      (err, meal) => {
        if (err) {
          console.error('Error checking meal ownership:', err)
          return res.status(500).json({
            success: false,
            error: 'Database error'
          })
        }

        if (!meal) {
          return res.status(404).json({
            success: false,
            error: 'Meal not found'
          })
        }

        // Update the meal
        db.run(
          'UPDATE meals SET meal_time = ?, notes = ?, date = ? WHERE id = ? AND user_id = ?',
          [mealTime, notes || '', date, id, req.userId],
          function(err) {
            if (err) {
              console.error('Error updating meal:', err)
              return res.status(500).json({
                success: false,
                error: 'Failed to update meal'
              })
            }

            // Delete existing meal foods
            db.run(
              'DELETE FROM meal_foods WHERE meal_id = ?',
              [id],
              function(err) {
                if (err) {
                  console.error('Error deleting old meal foods:', err)
                  return res.status(500).json({
                    success: false,
                    error: 'Failed to update meal'
                  })
                }

                // Insert new meal foods
                let foodsInserted = 0
                let hasError = false

                if (foods.length === 0) {
                  return res.json({
                    success: true,
                    data: { id: parseInt(id) }
                  })
                }

                for (const food of foods) {
                  if (hasError) break
                  
                  db.run(
                    'INSERT INTO meal_foods (meal_id, food_id, portion_size, preparation_method) VALUES (?, ?, ?, ?)',
                    [id, food.id, food.portionSize || '1 serving', food.preparationMethod || 'as prepared'],
                    function(err) {
                      if (err && !hasError) {
                        hasError = true
                        console.error('Error inserting updated meal food:', err)
                        return res.status(500).json({
                          success: false,
                          error: 'Failed to update meal foods'
                        })
                      }

                      foodsInserted++
                      if (foodsInserted === foods.length && !hasError) {
                        res.json({
                          success: true,
                          data: { id: parseInt(id) }
                        })
                      }
                    }
                  )
                }
              }
            )
          }
        )
      }
    )
  } catch (error) {
    console.error('Error updating meal:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update meal'
    })
  }
})

/**
 * Delete a meal
 * DELETE /meals/:id
 */
router.delete('/meals/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const db = database.getDatabase()

    // First verify the meal belongs to the user
    db.get(
      'SELECT id FROM meals WHERE id = ? AND user_id = ?',
      [id, req.userId],
      (err, meal) => {
        if (err) {
          console.error('Error checking meal ownership:', err)
          return res.status(500).json({
            success: false,
            error: 'Database error'
          })
        }

        if (!meal) {
          return res.status(404).json({
            success: false,
            error: 'Meal not found'
          })
        }

        // Delete meal foods first (foreign key constraint)
        db.run(
          'DELETE FROM meal_foods WHERE meal_id = ?',
          [id],
          function(err) {
            if (err) {
              console.error('Error deleting meal foods:', err)
              return res.status(500).json({
                success: false,
                error: 'Failed to delete meal'
              })
            }

            // Delete the meal
            db.run(
              'DELETE FROM meals WHERE id = ? AND user_id = ?',
              [id, req.userId],
              function(err) {
                if (err) {
                  console.error('Error deleting meal:', err)
                  return res.status(500).json({
                    success: false,
                    error: 'Failed to delete meal'
                  })
                }

                res.json({
                  success: true,
                  message: 'Meal deleted successfully'
                })
              }
            )
          }
        )
      }
    )
  } catch (error) {
    console.error('Error deleting meal:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete meal'
    })
  }
})

// Get ingredients for a composed food
router.get('/foods/:id/ingredients', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const db = database.getDatabase()
    
    // First verify the food belongs to the user and is composed
    db.get(
      'SELECT id, name, is_composed FROM foods WHERE id = ? AND user_id = ?',
      [id, req.userId],
      (err, food: any) => {
        if (err) {
          console.error('Error checking food:', err)
          return res.status(500).json({
            success: false,
            error: 'Database error'
          })
        }
        
        if (!food) {
          return res.status(404).json({
            success: false,
            error: 'Food not found'
          })
        }
        
        if (!food.is_composed) {
          return res.status(400).json({
            success: false,
            error: 'Food is not a composed meal'
          })
        }
        
        // Get ingredients
        db.all(
          `SELECT 
            fi.quantity, fi.notes,
            f.id as ingredientId, f.name as ingredientName, f.category as ingredientCategory,
            f.common_allergens as allergens
          FROM food_ingredients fi
          JOIN foods f ON fi.ingredient_food_id = f.id
          WHERE fi.composed_food_id = ?`,
          [id],
          (err, ingredients) => {
            if (err) {
              console.error('Error fetching ingredients:', err)
              return res.status(500).json({
                success: false,
                error: 'Failed to fetch ingredients'
              })
            }
            
            // Parse allergens for each ingredient
            const parsedIngredients = (ingredients || []).map((ingredient: any) => ({
              ...ingredient,
              allergens: ingredient.allergens ? (() => {
                try {
                  return JSON.parse(ingredient.allergens)
                } catch {
                  return ingredient.allergens.split(',').filter((a: string) => a.length > 0)
                }
              })() : []
            }))
            
            res.json({
              success: true,
              data: parsedIngredients
            })
          }
        )
      }
    )
  } catch (error) {
    console.error('Error fetching ingredients:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredients'
    })
  }
})

export default router