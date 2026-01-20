import { useState, useEffect } from 'react'
import { Calendar, Clock, Plus, Save, Search, UtensilsCrossed, X, Edit2, Trash2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getCurrentLocalDate, getDateRange, parseDateSafely, formatDateForDisplay } from '../utils/dateUtils'

const FoodLog = () => {
  const [selectedDate, setSelectedDate] = useState(getCurrentLocalDate)
  const [mealTime, setMealTime] = useState(new Date().toTimeString().slice(0, 5))
  const [foods, setFoods] = useState([])
  const [meals, setMeals] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFoods, setSelectedFoods] = useState([])
  const [mealNotes, setMealNotes] = useState('')
  const [showCreateRecipe, setShowCreateRecipe] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [recipeIngredients, setRecipeIngredients] = useState([])
  const [bulkIngredients, setBulkIngredients] = useState('')
  
  // Edit meal state
  const [editingMeal, setEditingMeal] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editMealDate, setEditMealDate] = useState('')
  const [editMealTime, setEditMealTime] = useState('')
  const [editMealNotes, setEditMealNotes] = useState('')
  const [editSelectedFoods, setEditSelectedFoods] = useState([])
  
  // Delete meal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [mealToDelete, setMealToDelete] = useState(null)
  
  // Composed meal expansion state
  const [expandedComposed, setExpandedComposed] = useState({}) // { foodId: ingredients[] }
  const [loadingIngredients, setLoadingIngredients] = useState({}) // { foodId: boolean }
  
  const { authenticatedFetch } = useAuth()

  // Fetch foods from API
  useEffect(() => {
    fetchFoods()
  }, [])

  // Fetch meals when date changes
  useEffect(() => {
    fetchMeals()
  }, [selectedDate])

  const fetchFoods = async () => {
    try {
      const response = await authenticatedFetch('/api/foods')
      const data = await response.json()
      if (data.success) {
        setFoods(data.data)
      }
    } catch (error) {
      console.error('Error fetching foods:', error)
    }
  }

  const fetchMeals = async () => {
    try {
      // Calculate date range for past 7 days
      const { startDate: startDateStr, endDate: endDateStr } = getDateRange(selectedDate, 7)
      
      const response = await authenticatedFetch(`/api/meals?startDate=${startDateStr}&endDate=${endDateStr}`)
      const data = await response.json()
      if (data.success) {
        setMeals(data.data)
      }
    } catch (error) {
      console.error('Error fetching meals:', error)
    }
  }

  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    food.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addFoodToMeal = (food) => {
    if (!selectedFoods.find(f => f.id === food.id)) {
      setSelectedFoods(prev => [...prev, { 
        ...food, 
        portionSize: '1 serving',
        preparationMethod: 'as prepared'
      }])
    }
    setSearchTerm('')
  }

  const addIngredientToRecipe = (food) => {
    if (!recipeIngredients.find(f => f.id === food.id)) {
      setRecipeIngredients(prev => [...prev, { 
        ...food, 
        quantity: '1',
        notes: ''
      }])
    }
    setSearchTerm('')
  }

  const removeIngredientFromRecipe = (foodId) => {
    setRecipeIngredients(prev => prev.filter(f => f.id !== foodId))
  }

  const updateIngredientQuantity = (foodId, field, value) => {
    setRecipeIngredients(prev => prev.map(f => 
      f.id === foodId ? { ...f, [field]: value } : f
    ))
  }

  const removeFoodFromMeal = (foodId) => {
    setSelectedFoods(prev => prev.filter(f => f.id !== foodId))
  }

  const updateFoodPortion = (foodId, field, value) => {
    setSelectedFoods(prev => prev.map(f => 
      f.id === foodId ? { ...f, [field]: value } : f
    ))
  }

  const saveMeal = async () => {
    if (selectedFoods.length === 0) return

    try {
      const response = await authenticatedFetch('/api/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: selectedDate,
          time: mealTime,
          notes: mealNotes,
          foods: selectedFoods.map(f => ({
            id: f.id,
            portionSize: f.portionSize,
            preparationMethod: f.preparationMethod
          }))
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Refresh the meals list
        await fetchMeals()
        
        // Reset form
        setSelectedFoods([])
        setMealNotes('')
      } else {
        console.error('Error saving meal:', data.error)
        alert('Error saving meal: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving meal:', error)
      alert('Error saving meal. Please try again.')
    }
  }

  const processBulkIngredients = async () => {
    if (!bulkIngredients.trim()) return

    // Parse comma-separated ingredients
    const ingredientNames = bulkIngredients
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0)

    if (ingredientNames.length === 0) return

    const processedIngredients = []

    for (const ingredientName of ingredientNames) {
      // Check if ingredient already exists in foods
      let existingFood = foods.find(food => 
        food.name.toLowerCase() === ingredientName.toLowerCase()
      )

      if (!existingFood) {
        // Create new ingredient
        try {
          const response = await authenticatedFetch('/api/foods', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: ingredientName,
              category: 'ingredient',
              allergens: []
            })
          })
          const data = await response.json()
          
          if (data.success) {
            existingFood = data.data
            // Add to foods list
            setFoods(prev => [...prev, data.data])
          } else {
            console.error('Error creating ingredient:', data.error)
            continue
          }
        } catch (error) {
          console.error('Error creating ingredient:', error)
          continue
        }
      }

      // Add to recipe ingredients if not already added
      if (!recipeIngredients.find(ing => ing.id === existingFood.id)) {
        processedIngredients.push({
          ...existingFood,
          quantity: '1',
          notes: ''
        })
      }
    }

    // Add all processed ingredients to recipe
    setRecipeIngredients(prev => [...prev, ...processedIngredients])
    setBulkIngredients('')
  }

  const createRecipe = async () => {
    if (!recipeName.trim() || recipeIngredients.length === 0) return

    try {
      const response = await authenticatedFetch('/api/foods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: recipeName,
          category: 'composed',
          allergens: [],
          isComposed: true,
          ingredients: recipeIngredients.map(ingredient => ({
            foodId: ingredient.id,
            quantity: ingredient.quantity,
            notes: ingredient.notes
          }))
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Add the new recipe to foods list
        setFoods(prev => [...prev, data.data])
        
        // Reset recipe form
        setRecipeName('')
        setRecipeIngredients([])
        setBulkIngredients('')
        setShowCreateRecipe(false)
        
        alert('Recipe created successfully!')
      } else {
        console.error('Error creating recipe:', data.error)
        alert('Error creating recipe: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating recipe:', error)
      alert('Error creating recipe. Please try again.')
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      grain: 'bg-yellow-100 text-yellow-800',
      dairy: 'bg-blue-100 text-blue-800',
      protein: 'bg-red-100 text-red-800',
      vegetable: 'bg-green-100 text-green-800',
      fruit: 'bg-purple-100 text-purple-800',
      composed: 'bg-indigo-100 text-indigo-800',
      ingredient: 'bg-orange-100 text-orange-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const startEditMeal = (meal) => {
    setEditingMeal(meal)
    setEditMealDate(parseDateSafely(meal.date))
    setEditMealTime(meal.mealTime) // mealTime is already in HH:MM format
    setEditMealNotes(meal.notes || '')
    setEditSelectedFoods(meal.foods.map(food => ({
      ...food,
      portionSize: food.portionSize || '1 serving',
      preparationMethod: food.preparationMethod || 'as prepared'
    })))
    setShowEditModal(true)
  }

  const cancelEdit = () => {
    setEditingMeal(null)
    setShowEditModal(false)
    setEditMealDate('')
    setEditMealTime('')
    setEditMealNotes('')
    setEditSelectedFoods([])
  }

  const saveEditedMeal = async () => {
    if (editSelectedFoods.length === 0) return

    try {
      const response = await authenticatedFetch(`/api/meals/${editingMeal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: editMealDate,
          time: editMealTime,
          notes: editMealNotes,
          foods: editSelectedFoods.map(f => ({
            id: f.id,
            portionSize: f.portionSize,
            preparationMethod: f.preparationMethod
          }))
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Refresh the meals list
        await fetchMeals()
        cancelEdit()
        alert('Meal updated successfully!')
      } else {
        console.error('Error updating meal:', data.error)
        alert('Error updating meal: ' + data.error)
      }
    } catch (error) {
      console.error('Error updating meal:', error)
      alert('Error updating meal. Please try again.')
    }
  }

  const confirmDeleteMeal = (meal) => {
    setMealToDelete(meal)
    setShowDeleteConfirm(true)
  }

  const cancelDelete = () => {
    setMealToDelete(null)
    setShowDeleteConfirm(false)
  }

  const deleteMeal = async () => {
    if (!mealToDelete) return

    try {
      const response = await authenticatedFetch(`/api/meals/${mealToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        // Refresh the meals list
        await fetchMeals()
        cancelDelete()
        alert('Meal deleted successfully!')
      } else {
        console.error('Error deleting meal:', data.error)
        alert('Error deleting meal: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting meal:', error)
      alert('Error deleting meal. Please try again.')
    }
  }

  const addFoodToEditMeal = (food) => {
    if (!editSelectedFoods.find(f => f.id === food.id)) {
      setEditSelectedFoods(prev => [...prev, { 
        ...food, 
        portionSize: '1 serving',
        preparationMethod: 'as prepared'
      }])
    }
    setSearchTerm('')
  }

  const removeFoodFromEditMeal = (foodId) => {
    setEditSelectedFoods(prev => prev.filter(f => f.id !== foodId))
  }

  const updateEditFoodPortion = (foodId, field, value) => {
    setEditSelectedFoods(prev => prev.map(f => 
      f.id === foodId ? { ...f, [field]: value } : f
    ))
  }

  // Toggle composed meal ingredient expansion
  const toggleComposedIngredients = async (foodId) => {
    // If already expanded, collapse it
    if (expandedComposed[foodId]) {
      setExpandedComposed(prev => {
        const newState = { ...prev }
        delete newState[foodId]
        return newState
      })
      return
    }

    // If not expanded, fetch and expand
    setLoadingIngredients(prev => ({ ...prev, [foodId]: true }))
    
    try {
      const response = await authenticatedFetch(`/api/foods/${foodId}/ingredients`)
      const data = await response.json()
      
      if (data.success) {
        setExpandedComposed(prev => ({ ...prev, [foodId]: data.data }))
      } else {
        console.error('Error fetching ingredients:', data.error)
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error)
    } finally {
      setLoadingIngredients(prev => ({ ...prev, [foodId]: false }))
    }
  }

  // Group meals by date
  const mealsByDate = meals.reduce((acc, meal) => {
    const mealDate = parseDateSafely(meal.date)
    if (!acc[mealDate]) {
      acc[mealDate] = []
    }
    acc[mealDate].push(meal)
    return acc
  }, {})

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(mealsByDate).sort((a, b) => new Date(b) - new Date(a))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Food Log</h1>
          <p className="text-gray-600">Track your meals and ingredients</p>
        </div>
        <button
          onClick={() => setShowCreateRecipe(true)}
          className="btn-secondary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Recipe
        </button>
      </div>

      {/* Meal Setup */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Time
            </label>
            <input
              type="time"
              value={mealTime}
              onChange={(e) => setMealTime(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Add Foods */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">Add Foods</h2>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search foods..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Add custom food if not found */}
          {searchTerm && filteredFoods.length === 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">
                Food "{searchTerm}" not found. Add it with potential trigger info?
              </p>
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                  {['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'fish', 'shellfish', 'nightshades', 'citrus', 'lactose', 'sugar', 'caffeine', 'histamine', 'tyramine', 'sulfites', 'msg', 'fodmaps', 'spicy', 'acidic', 'fried', 'artificial_sweeteners', 'alcohol'].map(trigger => (
                    <label key={trigger} className="flex items-center text-xs">
                      <input 
                        type="checkbox" 
                        className="mr-1" 
                        id={`${searchTerm}-${trigger}`}
                      />
                      <span className="capitalize">{trigger.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    const checkedTriggers = ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'fish', 'shellfish', 'nightshades', 'citrus', 'lactose', 'sugar', 'caffeine', 'histamine', 'tyramine', 'sulfites', 'msg', 'fodmaps', 'spicy', 'acidic', 'fried', 'artificial_sweeteners', 'alcohol'].filter(trigger => 
                      document.getElementById(`${searchTerm}-${trigger}`)?.checked
                    )
                    try {
                      const response = await authenticatedFetch('/api/foods', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          name: searchTerm,
                          category: 'custom',
                          allergens: checkedTriggers
                        })
                      })
                      const data = await response.json()
                      if (data.success) {
                        setFoods(prev => [...prev, data.data])
                        addFoodToMeal(data.data)
                      }
                    } catch (error) {
                      console.error('Error adding custom food:', error)
                    }
                  }}
                  className="btn-primary btn-sm"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add "{searchTerm}" with Selected Triggers
                </button>
              </div>
            </div>
          )}

          {/* Food Results */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredFoods.map(food => (
              <div key={food.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">{food.name}</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getCategoryColor(food.category)}`}>
                      {food.category}
                    </span>
                  </div>
                  {food.allergens.length > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Triggers: {food.allergens.join(', ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => addFoodToMeal(food)}
                  className="btn-secondary btn-sm"
                  disabled={selectedFoods.find(f => f.id === food.id)}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Selected Foods */}
          {selectedFoods.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-3 dark:text-gray-100">Selected Foods</h3>
              <div className="space-y-3">
                {selectedFoods.map(food => (
                  <div key={food.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{food.name}</span>
                      <button
                        onClick={() => removeFoodFromMeal(food.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Portion size"
                        value={food.portionSize}
                        onChange={(e) => updateFoodPortion(food.id, 'portionSize', e.target.value)}
                        className="input-field text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Preparation"
                        value={food.preparationMethod}
                        onChange={(e) => updateFoodPortion(food.id, 'preparationMethod', e.target.value)}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meal Notes (optional)
                </label>
                <textarea
                  value={mealNotes}
                  onChange={(e) => setMealNotes(e.target.value)}
                  placeholder="Any notes about this meal..."
                  rows={2}
                  className="input-field"
                />
              </div>

              <button
                onClick={saveMeal}
                className="btn-primary w-full mt-4"
              >
                <Save className="w-4 h-4 mr-2 inline" />
                Save Meal
              </button>
            </div>
          )}
        </div>

        {/* Past 7 Days Meals */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">
            Meals from Past 7 Days
          </h2>
          
          {sortedDates.length === 0 ? (
            <div className="text-center py-8">
              <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No meals logged in the past 7 days</p>
            </div>
          ) : (
            <div className="space-y-6 max-h-[600px] overflow-y-auto">
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {formatDateForDisplay(date)}
                  </h3>
                  <div className="space-y-3">
                    {mealsByDate[date].map((meal) => (
                      <div key={meal.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">Meal</h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">{meal.mealTime}</span>
                            <button
                              onClick={() => startEditMeal(meal)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                              title="Edit meal"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmDeleteMeal(meal)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                              title="Delete meal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {meal.foods.map((food, index) => (
                            <div key={index}>
                              <div 
                                className={`flex items-center justify-between bg-white dark:bg-gray-700 rounded p-2 ${
                                  Boolean(food.isComposed) ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600' : ''
                                }`}
                                onClick={() => Boolean(food.isComposed) ? toggleComposedIngredients(food.id) : null}
                              >
                                <div className="flex items-center">
                                  {Boolean(food.isComposed) && (
                                    <div className="mr-2">
                                      {loadingIngredients[food.id] ? (
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                      ) : expandedComposed[food.id] ? (
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                      )}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{food.name}</span>
                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getCategoryColor(food.category)}`}>
                                      {food.category}
                                    </span>
                                    {Boolean(food.isComposed) && (
                                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                        (click to view ingredients)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {food.portionSize} • {food.preparationMethod}
                                </div>
                              </div>
                              
                              {/* Expanded ingredients */}
                              {Boolean(food.isComposed) && expandedComposed[food.id] && (
                                <div className="ml-6 mt-2 space-y-1">
                                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Ingredients:</p>
                                  {expandedComposed[food.id].map((ingredient, ingredientIndex) => (
                                    <div key={ingredientIndex} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded p-2 text-sm">
                                      <div>
                                        <span className="text-gray-800 dark:text-gray-200">{ingredient.ingredientName}</span>
                                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getCategoryColor(ingredient.ingredientCategory)}`}>
                                          {ingredient.ingredientCategory}
                                        </span>
                                        {ingredient.allergens.length > 0 && (
                                          <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                                            ({ingredient.allergens.join(', ')})
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-gray-600 dark:text-gray-400">
                                        {ingredient.quantity}
                                        {ingredient.notes && ` • ${ingredient.notes}`}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {meal.notes && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 italic">"{meal.notes}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Recipe Modal */}
      {showCreateRecipe && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Recipe</h3>
              <button
                onClick={() => {
                  setShowCreateRecipe(false)
                  setRecipeName('')
                  setRecipeIngredients([])
                  setBulkIngredients('')
                  setSearchTerm('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Recipe Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recipe Name</label>
                <input
                  type="text"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="e.g., Turkey Sandwich, Chicken Soup"
                  className="input-field"
                />
              </div>

              {/* Bulk Ingredient Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bulk Add Ingredients (comma-separated)
                </label>
                <div className="space-y-2">
                  <textarea
                    value={bulkIngredients}
                    onChange={(e) => setBulkIngredients(e.target.value)}
                    placeholder="e.g., bread, turkey, lettuce, tomato, mayonnaise"
                    rows={3}
                    className="input-field"
                  />
                  <button
                    onClick={processBulkIngredients}
                    disabled={!bulkIngredients.trim()}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Ingredients
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Ingredients */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 dark:text-gray-100">Search & Add Individual Ingredients</h4>
                  
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search ingredients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>

                  {/* Ingredient Results */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredFoods.filter(f => !f.is_composed).map(food => (
                      <div key={food.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium">{food.name}</span>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getCategoryColor(food.category)}`}>
                              {food.category}
                            </span>
                          </div>
                          {food.allergens.length > 0 && (
                            <p className="text-xs text-orange-600 mt-1">
                              Triggers: {food.allergens.join(', ')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => addIngredientToRecipe(food)}
                          className="btn-secondary btn-sm"
                          disabled={recipeIngredients.find(f => f.id === food.id)}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Ingredients */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 dark:text-gray-100">Recipe Ingredients</h4>
                  
                  {recipeIngredients.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No ingredients added yet</p>
                  ) : (
                    <div className="space-y-3">
                      {recipeIngredients.map(ingredient => (
                        <div key={ingredient.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{ingredient.name}</span>
                            <button
                              onClick={() => removeIngredientFromRecipe(ingredient.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Quantity"
                              value={ingredient.quantity}
                              onChange={(e) => updateIngredientQuantity(ingredient.id, 'quantity', e.target.value)}
                              className="input-field text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Notes (optional)"
                              value={ingredient.notes}
                              onChange={(e) => updateIngredientQuantity(ingredient.id, 'notes', e.target.value)}
                              className="input-field text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowCreateRecipe(false)
                    setRecipeName('')
                    setRecipeIngredients([])
                    setBulkIngredients('')
                    setSearchTerm('')
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={createRecipe}
                  disabled={!recipeName.trim() || recipeIngredients.length === 0}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Recipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Meal Modal */}
      {showEditModal && editingMeal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Meal</h3>
              <button
                onClick={cancelEdit}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={editMealDate}
                    onChange={(e) => setEditMealDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Time
                  </label>
                  <input
                    type="time"
                    value={editMealTime}
                    onChange={(e) => setEditMealTime(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Foods */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Add Foods</h4>
                  
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search foods..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>

                  {/* Food Results */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredFoods.map(food => (
                      <div key={food.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium">{food.name}</span>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getCategoryColor(food.category)}`}>
                              {food.category}
                            </span>
                          </div>
                          {food.allergens.length > 0 && (
                            <p className="text-xs text-orange-600 mt-1">
                              Triggers: {food.allergens.join(', ')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => addFoodToEditMeal(food)}
                          className="btn-secondary btn-sm"
                          disabled={editSelectedFoods.find(f => f.id === food.id)}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Foods */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Selected Foods</h4>
                  
                  {editSelectedFoods.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No foods selected</p>
                  ) : (
                    <div className="space-y-3">
                      {editSelectedFoods.map(food => (
                        <div key={food.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{food.name}</span>
                            <button
                              onClick={() => removeFoodFromEditMeal(food.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Portion size"
                              value={food.portionSize}
                              onChange={(e) => updateEditFoodPortion(food.id, 'portionSize', e.target.value)}
                              className="input-field text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Preparation"
                              value={food.preparationMethod}
                              onChange={(e) => updateEditFoodPortion(food.id, 'preparationMethod', e.target.value)}
                              className="input-field text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Meal Notes (optional)
                </label>
                <textarea
                  value={editMealNotes}
                  onChange={(e) => setEditMealNotes(e.target.value)}
                  placeholder="Any notes about this meal..."
                  rows={2}
                  className="input-field"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-600">
                <button
                  onClick={cancelEdit}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditedMeal}
                  disabled={editSelectedFoods.length === 0}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update Meal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && mealToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6 mr-2" />
              <h3 className="text-lg font-semibold">Delete Meal</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Are you sure you want to delete this meal from {new Date(mealToDelete.date).toLocaleDateString()}?
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Foods in this meal:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  {mealToDelete.foods.map((food, index) => (
                    <li key={index}>• {food.name} ({food.portionSize})</li>
                  ))}
                </ul>
              </div>
              
              <p className="text-sm text-red-600 dark:text-red-400 mt-3">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={deleteMeal}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              >
                Delete Meal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FoodLog