import { useState, useEffect } from 'react'
import { Calendar, Clock, Save, AlertCircle, Info, Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getCurrentLocalDate, formatDateForDisplay } from '../utils/dateUtils'

const BowelLog = () => {
  const [selectedDate, setSelectedDate] = useState(getCurrentLocalDate)
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5))
  const [bowelMovements, setBowelMovements] = useState([])
  const [newMovement, setNewMovement] = useState({
    bristolScale: 4,
    color: 'brown',
    size: 'medium',
    urgency: '',
    easeOfPassage: '',
    bloodPresent: false,
    mucusPresent: false,
    notes: ''
  })
  const [editingMovement, setEditingMovement] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [movementToDelete, setMovementToDelete] = useState(null)
  const [showBristolChart, setShowBristolChart] = useState(false)
  const { authenticatedFetch } = useAuth()

  // Bristol Stool Scale data
  const bristolScale = [
    { type: 1, description: 'Separate hard lumps, difficult to pass', consistency: 'Very Hard' },
    { type: 2, description: 'Lumpy and sausage-like', consistency: 'Hard' },
    { type: 3, description: 'A sausage shape with cracks in the surface', consistency: 'Normal' },
    { type: 4, description: 'Like a smooth, soft sausage or snake', consistency: 'Normal' },
    { type: 5, description: 'Soft blobs with clear-cut edges', consistency: 'Soft' },
    { type: 6, description: 'Mushy consistency with ragged edges', consistency: 'Loose' },
    { type: 7, description: 'Liquid consistency with no solid pieces', consistency: 'Watery' }
  ]

  const colorOptions = [
    { value: 'brown', label: 'Brown', color: '#8B4513' },
    { value: 'yellow', label: 'Yellow', color: '#FFD700' },
    { value: 'green', label: 'Green', color: '#228B22' },
    { value: 'black', label: 'Black', color: '#2F2F2F' },
    { value: 'red', label: 'Red', color: '#DC143C' },
    { value: 'pale', label: 'Pale/Light', color: '#F5F5DC' },
    { value: 'clay', label: 'Clay-colored', color: '#D2B48C' }
  ]

  const sizeOptions = [
    { value: 'small', label: 'Small', description: 'Less than usual' },
    { value: 'medium', label: 'Medium', description: 'Normal amount' },
    { value: 'large', label: 'Large', description: 'More than usual' }
  ]

  // Fetch bowel movements for past 7 days
  useEffect(() => {
    fetchBowelMovements()
  }, [])

  const fetchBowelMovements = async () => {
    try {
      // Calculate date range for past 7 days
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      const startDateStr = startDate.toISOString().split('T')[0]

      const response = await authenticatedFetch(`/api/bowel-movements?startDate=${startDateStr}&endDate=${endDate}`)
      const data = await response.json()
      
      if (data.success) {
        setBowelMovements(data.data)
      }
    } catch (error) {
      console.error('Error fetching bowel movements:', error)
    }
  }

  const handleSubmit = async () => {
    if (!newMovement.bristolScale) return

    try {
      const response = await authenticatedFetch('/api/bowel-movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          bristolScale: newMovement.bristolScale,
          color: newMovement.color,
          size: newMovement.size,
          urgency: newMovement.urgency ? parseInt(newMovement.urgency) : null,
          easeOfPassage: newMovement.easeOfPassage ? parseInt(newMovement.easeOfPassage) : null,
          bloodPresent: newMovement.bloodPresent,
          mucusPresent: newMovement.mucusPresent,
          notes: newMovement.notes
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Refresh the bowel movements list
        await fetchBowelMovements()
        
        // Reset form
        setNewMovement({
          bristolScale: 4,
          color: 'brown',
          size: 'medium',
          urgency: '',
          easeOfPassage: '',
          bloodPresent: false,
          mucusPresent: false,
          notes: ''
        })
      } else {
        console.error('Error logging bowel movement:', data.error)
        alert('Error logging bowel movement: ' + data.error)
      }
    } catch (error) {
      console.error('Error logging bowel movement:', error)
      alert('Error logging bowel movement. Please try again.')
    }
  }

  const startEditMovement = (movement) => {
    setEditingMovement({
      id: movement.id,
      bristolScale: movement.bristolScale,
      color: movement.color,
      size: movement.size,
      urgency: movement.urgency || '',
      easeOfPassage: movement.easeOfPassage || '',
      bloodPresent: movement.bloodPresent,
      mucusPresent: movement.mucusPresent,
      notes: movement.notes || '',
      date: movement.date,
      time: movement.time
    })
    setShowEditModal(true)
  }

  const saveEditedMovement = async () => {
    if (!editingMovement.bristolScale) return

    try {
      const response = await authenticatedFetch(`/api/bowel-movements/${editingMovement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: editingMovement.date,
          time: editingMovement.time,
          bristolScale: editingMovement.bristolScale,
          color: editingMovement.color,
          size: editingMovement.size,
          urgency: editingMovement.urgency ? parseInt(editingMovement.urgency) : null,
          easeOfPassage: editingMovement.easeOfPassage ? parseInt(editingMovement.easeOfPassage) : null,
          bloodPresent: editingMovement.bloodPresent,
          mucusPresent: editingMovement.mucusPresent,
          notes: editingMovement.notes
        })
      })

      const data = await response.json()
      if (data.success) {
        await fetchBowelMovements()
        setShowEditModal(false)
        setEditingMovement(null)
      } else {
        console.error('Error updating bowel movement:', data.error)
        alert('Error updating bowel movement: ' + data.error)
      }
    } catch (error) {
      console.error('Error updating bowel movement:', error)
      alert('Error updating bowel movement. Please try again.')
    }
  }

  const confirmDeleteMovement = (movement) => {
    setMovementToDelete(movement)
    setShowDeleteConfirm(true)
  }

  const deleteMovement = async () => {
    if (!movementToDelete) return

    try {
      const response = await authenticatedFetch(`/api/bowel-movements/${movementToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        await fetchBowelMovements()
        setShowDeleteConfirm(false)
        setMovementToDelete(null)
      } else {
        console.error('Error deleting bowel movement:', data.error)
        alert('Error deleting bowel movement: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting bowel movement:', error)
      alert('Error deleting bowel movement. Please try again.')
    }
  }

  const getBristolColor = (scale) => {
    if (scale <= 2) return 'text-red-600 bg-red-50'
    if (scale <= 4) return 'text-green-600 bg-green-50'
    if (scale <= 6) return 'text-yellow-600 bg-yellow-50'
    return 'text-orange-600 bg-orange-50'
  }

  const getColorDisplay = (colorValue) => {
    const colorOption = colorOptions.find(c => c.value === colorValue)
    return colorOption ? { ...colorOption } : { value: colorValue, label: colorValue, color: '#666' }
  }

  // Sort movements by date and time (most recent first)
  const sortedMovements = bowelMovements.sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${a.time}`)
    const dateTimeB = new Date(`${b.date}T${b.time}`)
    return dateTimeB - dateTimeA
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bowel Movement Log</h1>
          <p className="text-gray-600">Track bowel movements for digestive health insights</p>
        </div>
        <button
          onClick={() => setShowBristolChart(!showBristolChart)}
          className="btn-secondary"
        >
          <Info className="w-4 h-4 mr-2" />
          Bristol Scale Reference
        </button>
      </div>

      {/* Bristol Stool Scale Reference */}
      {showBristolChart && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">Bristol Stool Scale</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bristolScale.map((item) => (
              <div key={item.type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg text-gray-900 dark:text-gray-100">Type {item.type}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBristolColor(item.type)}`}>
                    {item.consistency}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date and Time Selection */}
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
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Add New Bowel Movement */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">Log New Movement</h2>
          
          <div className="space-y-4">
            {/* Bristol Scale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bristol Stool Scale (Type {newMovement.bristolScale})
              </label>
              <input
                type="range"
                min="1"
                max="7"
                value={newMovement.bristolScale}
                onChange={(e) => setNewMovement(prev => ({ ...prev, bristolScale: parseInt(e.target.value) }))}
                className="severity-slider w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Hard</span>
                <span>Normal</span>
                <span>Loose</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {bristolScale.find(b => b.type === newMovement.bristolScale)?.description}
              </p>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setNewMovement(prev => ({ ...prev, color: color.value }))}
                    className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                      newMovement.color === color.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div 
                      className="w-4 h-4 rounded-full mx-auto mb-1 border"
                      style={{ backgroundColor: color.color }}
                    ></div>
                    {color.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Size</label>
              <div className="grid grid-cols-3 gap-2">
                {sizeOptions.map(size => (
                  <button
                    key={size.value}
                    onClick={() => setNewMovement(prev => ({ ...prev, size: size.value }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      newMovement.size === size.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{size.label}</div>
                    <div className="text-xs text-gray-500">{size.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Urgency (1-5)
                </label>
                <select
                  value={newMovement.urgency}
                  onChange={(e) => setNewMovement(prev => ({ ...prev, urgency: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Not specified</option>
                  <option value="1">1 - No urgency</option>
                  <option value="2">2 - Slight urgency</option>
                  <option value="3">3 - Moderate urgency</option>
                  <option value="4">4 - Strong urgency</option>
                  <option value="5">5 - Extreme urgency</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ease of Passage (1-5)
                </label>
                <select
                  value={newMovement.easeOfPassage}
                  onChange={(e) => setNewMovement(prev => ({ ...prev, easeOfPassage: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Not specified</option>
                  <option value="1">1 - Very difficult</option>
                  <option value="2">2 - Difficult</option>
                  <option value="3">3 - Normal</option>
                  <option value="4">4 - Easy</option>
                  <option value="5">5 - Very easy</option>
                </select>
              </div>
            </div>

            {/* Warning indicators */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newMovement.bloodPresent}
                  onChange={(e) => setNewMovement(prev => ({ ...prev, bloodPresent: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-red-600">Blood present</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newMovement.mucusPresent}
                  onChange={(e) => setNewMovement(prev => ({ ...prev, mucusPresent: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-yellow-600">Mucus present</span>
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={newMovement.notes}
                onChange={(e) => setNewMovement(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional observations..."
                rows={3}
                className="input-field"
              />
            </div>

            <button
              onClick={handleSubmit}
              className="btn-primary w-full"
            >
              <Save className="w-4 h-4 mr-2 inline" />
              Log Movement
            </button>
          </div>
        </div>

        {/* Past 7 Days Logs */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">
            Past 7 Days
          </h2>
          
          {sortedMovements.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No movements logged in the past 7 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedMovements.map((movement) => {
                const colorDisplay = getColorDisplay(movement.color)
                return (
                  <div key={movement.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatDateForDisplay(movement.date, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        <span className="text-gray-500 ml-2">{movement.time}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {movement.bloodPresent && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                            Blood
                          </span>
                        )}
                        {movement.mucusPresent && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            Mucus
                          </span>
                        )}
                        <button
                          onClick={() => startEditMovement(movement)}
                          className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit movement"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDeleteMovement(movement)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete movement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Bristol Scale</span>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getBristolColor(movement.bristolScale)}`}>
                          Type {movement.bristolScale}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Color</span>
                        <div className="flex items-center mt-1">
                          <div 
                            className="w-3 h-3 rounded-full mr-2 border"
                            style={{ backgroundColor: colorDisplay.color }}
                          ></div>
                          <span className="text-sm text-gray-900 dark:text-gray-100">{colorDisplay.label}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Size</span>
                        <div className="text-sm capitalize text-gray-900 dark:text-gray-100">{movement.size}</div>
                      </div>
                    </div>

                    {(movement.urgency || movement.easeOfPassage) && (
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        {movement.urgency && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Urgency: </span>
                            <span className="text-gray-900 dark:text-gray-100">{movement.urgency}/5</span>
                          </div>
                        )}
                        {movement.easeOfPassage && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Ease: </span>
                            <span className="text-gray-900 dark:text-gray-100">{movement.easeOfPassage}/5</span>
                          </div>
                        )}
                      </div>
                    )}

                    {movement.notes && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{movement.notes}"</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingMovement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Bowel Movement</h3>
            
            <div className="space-y-4">
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={editingMovement.date}
                    onChange={(e) => setEditingMovement(prev => ({ ...prev, date: e.target.value }))}
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
                    value={editingMovement.time}
                    onChange={(e) => setEditingMovement(prev => ({ ...prev, time: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Bristol Scale */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bristol Stool Scale (Type {editingMovement.bristolScale})
                </label>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={editingMovement.bristolScale}
                  onChange={(e) => setEditingMovement(prev => ({ ...prev, bristolScale: parseInt(e.target.value) }))}
                  className="severity-slider w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Hard</span>
                  <span>Normal</span>
                  <span>Loose</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {bristolScale.find(b => b.type === editingMovement.bristolScale)?.description}
                </p>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setEditingMovement(prev => ({ ...prev, color: color.value }))}
                      className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                        editingMovement.color === color.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full mx-auto mb-1 border"
                        style={{ backgroundColor: color.color }}
                      ></div>
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {sizeOptions.map(size => (
                    <button
                      key={size.value}
                      onClick={() => setEditingMovement(prev => ({ ...prev, size: size.value }))}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        editingMovement.size === size.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{size.label}</div>
                      <div className="text-xs text-gray-500">{size.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Urgency (1-5)
                  </label>
                  <select
                    value={editingMovement.urgency}
                    onChange={(e) => setEditingMovement(prev => ({ ...prev, urgency: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Not specified</option>
                    <option value="1">1 - No urgency</option>
                    <option value="2">2 - Slight urgency</option>
                    <option value="3">3 - Moderate urgency</option>
                    <option value="4">4 - Strong urgency</option>
                    <option value="5">5 - Extreme urgency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ease of Passage (1-5)
                  </label>
                  <select
                    value={editingMovement.easeOfPassage}
                    onChange={(e) => setEditingMovement(prev => ({ ...prev, easeOfPassage: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Not specified</option>
                    <option value="1">1 - Very difficult</option>
                    <option value="2">2 - Difficult</option>
                    <option value="3">3 - Normal</option>
                    <option value="4">4 - Easy</option>
                    <option value="5">5 - Very easy</option>
                  </select>
                </div>
              </div>

              {/* Warning indicators */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingMovement.bloodPresent}
                    onChange={(e) => setEditingMovement(prev => ({ ...prev, bloodPresent: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-red-600">Blood present</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingMovement.mucusPresent}
                    onChange={(e) => setEditingMovement(prev => ({ ...prev, mucusPresent: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-yellow-600">Mucus present</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={editingMovement.notes}
                  onChange={(e) => setEditingMovement(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional observations..."
                  rows={3}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingMovement(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedMovement}
                className="btn-primary"
              >
                <Save className="w-4 h-4 mr-2 inline" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && movementToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Delete Bowel Movement</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this bowel movement from {formatDateForDisplay(movementToDelete.date, { year: 'numeric', month: 'short', day: 'numeric' })} at {movementToDelete.time}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setMovementToDelete(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteMovement}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2 inline" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BowelLog