import { useState, useEffect } from 'react'
import { Calendar, Clock, Plus, Save, AlertCircle, Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getCurrentLocalDate, getDateRange, formatDateForDisplay } from '../utils/dateUtils'

const SymptomLog = () => {
  const [selectedDate, setSelectedDate] = useState(getCurrentLocalDate)
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5))
  const [symptoms, setSymptoms] = useState([])
  const [symptomLogs, setSymptomLogs] = useState([])
  const [newLog, setNewLog] = useState({
    symptomId: '',
    severity: 5,
    notes: ''
  })
  const [editingLog, setEditingLog] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [logToDelete, setLogToDelete] = useState(null)
  const { authenticatedFetch } = useAuth()

  // Fetch symptoms from API
  useEffect(() => {
    fetchSymptoms()
  }, [])

  // Fetch symptom logs when date changes
  useEffect(() => {
    fetchSymptomLogs()
  }, [selectedDate])

  const fetchSymptoms = async () => {
    try {
      const response = await authenticatedFetch('/api/symptoms')
      const data = await response.json()
      if (data.success) {
        setSymptoms(data.data)
      }
    } catch (error) {
      console.error('Error fetching symptoms:', error)
    }
  }

  const fetchSymptomLogs = async () => {
    try {
      // Calculate date range for past 7 days
      const { startDate: startDateStr, endDate: endDateStr } = getDateRange(selectedDate, 7)
      
      const response = await authenticatedFetch(`/api/symptoms/logs?startDate=${startDateStr}&endDate=${endDateStr}`)
      const data = await response.json()
      if (data.success) {
        setSymptomLogs(data.data)
      }
    } catch (error) {
      console.error('Error fetching symptom logs:', error)
    }
  }

  const handleAddLog = async () => {
    if (!newLog.symptomId) return

    try {
      const response = await authenticatedFetch('/api/symptoms/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symptomId: parseInt(newLog.symptomId),
          severity: newLog.severity,
          time: selectedTime,
          notes: newLog.notes,
          date: selectedDate
        })
      })

      const data = await response.json()
      if (data.success) {
        // Refresh the symptom logs
        await fetchSymptomLogs()
        // Reset form
        setNewLog({ symptomId: '', severity: 5, notes: '' })
      } else {
        console.error('Error logging symptom:', data.error)
        alert('Error logging symptom: ' + data.error)
      }
    } catch (error) {
      console.error('Error logging symptom:', error)
      alert('Error logging symptom. Please try again.')
    }
  }

  const startEditLog = (log) => {
    setEditingLog({
      id: log.id,
      symptomId: log.symptomId,
      severity: log.severity,
      notes: log.notes || '',
      date: log.date.split('T')[0],
      time: log.time
    })
    setShowEditModal(true)
  }

  const saveEditedLog = async () => {
    if (!editingLog.symptomId) return

    try {
      const response = await authenticatedFetch(`/api/symptoms/logs/${editingLog.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symptomId: parseInt(editingLog.symptomId),
          severity: editingLog.severity,
          time: editingLog.time,
          notes: editingLog.notes,
          date: editingLog.date
        })
      })

      const data = await response.json()
      if (data.success) {
        await fetchSymptomLogs()
        setShowEditModal(false)
        setEditingLog(null)
      } else {
        console.error('Error updating symptom log:', data.error)
        alert('Error updating symptom log: ' + data.error)
      }
    } catch (error) {
      console.error('Error updating symptom log:', error)
      alert('Error updating symptom log. Please try again.')
    }
  }

  const confirmDeleteLog = (log) => {
    setLogToDelete(log)
    setShowDeleteConfirm(true)
  }

  const deleteLog = async () => {
    if (!logToDelete) return

    try {
      const response = await authenticatedFetch(`/api/symptoms/logs/${logToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        await fetchSymptomLogs()
        setShowDeleteConfirm(false)
        setLogToDelete(null)
      } else {
        console.error('Error deleting symptom log:', data.error)
        alert('Error deleting symptom log: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting symptom log:', error)
      alert('Error deleting symptom log. Please try again.')
    }
  }

  const getSeverityColor = (severity) => {
    if (severity <= 3) return 'text-green-600 bg-green-50'
    if (severity <= 6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const groupedSymptoms = symptoms.reduce((acc, symptom) => {
    if (!acc[symptom.category]) {
      acc[symptom.category] = []
    }
    acc[symptom.category].push(symptom)
    return acc
  }, {})

  // Group symptom logs by date
  const logsByDate = symptomLogs.reduce((acc, log) => {
    const logDate = log.date.split('T')[0]
    if (!acc[logDate]) {
      acc[logDate] = []
    }
    acc[logDate].push(log)
    return acc
  }, {})

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(logsByDate).sort((a, b) => new Date(b) - new Date(a))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Symptom Log</h1>
          <p className="text-gray-600">Track how you're feeling throughout the day</p>
        </div>
      </div>

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
        {/* Add New Symptom Log */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">Log New Symptom</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Symptom
              </label>
              <select
                value={newLog.symptomId}
                onChange={(e) => setNewLog(prev => ({ ...prev, symptomId: e.target.value }))}
                className="input-field"
              >
                <option value="">Choose a symptom...</option>
                {Object.entries(groupedSymptoms).map(([category, categorySymptoms]) => (
                  <optgroup key={category} label={category}>
                    {categorySymptoms.map(symptom => (
                      <option key={symptom.id} value={symptom.id}>
                        {symptom.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Severity: {newLog.severity}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={newLog.severity}
                onChange={(e) => setNewLog(prev => ({ ...prev, severity: parseInt(e.target.value) }))}
                className="severity-slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Mild</span>
                <span>Moderate</span>
                <span>Severe</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={newLog.notes}
                onChange={(e) => setNewLog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional details..."
                rows={3}
                className="input-field"
              />
            </div>

            <button
              onClick={handleAddLog}
              disabled={!newLog.symptomId}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2 inline" />
              Log Symptom
            </button>
          </div>
        </div>

        {/* Past 7 Days Logs */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">
            Symptoms from Past 7 Days
          </h2>
          
          {sortedDates.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No symptoms logged in the past 7 days</p>
            </div>
          ) : (
            <div className="space-y-6 max-h-[600px] overflow-y-auto">
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {formatDateForDisplay(date)}
                  </h3>
                  <div className="space-y-3">
                    {logsByDate[date].map((log) => (
                      <div key={log.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-3"
                              style={{ backgroundColor: log.categoryColor }}
                            ></div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{log.symptomName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">{log.time}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                              {log.severity}/10
                            </span>
                            <button
                              onClick={() => startEditLog(log)}
                              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                              title="Edit log"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmDeleteLog(log)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete log"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{log.category}</p>
                        {log.notes && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">"{log.notes}"</p>
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

      {/* Edit Modal */}
      {showEditModal && editingLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Symptom Log</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={editingLog.date}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, date: e.target.value }))}
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
                  value={editingLog.time}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, time: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Symptom
                </label>
                <select
                  value={editingLog.symptomId}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, symptomId: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Choose a symptom...</option>
                  {Object.entries(groupedSymptoms).map(([category, categorySymptoms]) => (
                    <optgroup key={category} label={category}>
                      {categorySymptoms.map(symptom => (
                        <option key={symptom.id} value={symptom.id}>
                          {symptom.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Severity: {editingLog.severity}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editingLog.severity}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, severity: parseInt(e.target.value) }))}
                  className="severity-slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Mild</span>
                  <span>Moderate</span>
                  <span>Severe</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={editingLog.notes}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional details..."
                  rows={3}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingLog(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedLog}
                disabled={!editingLog.symptomId}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2 inline" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && logToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Delete Symptom Log</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this symptom log for <strong>{logToDelete.symptomName}</strong> on {formatDateForDisplay(logToDelete.date.split('T')[0])} at {logToDelete.time}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setLogToDelete(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteLog}
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

export default SymptomLog