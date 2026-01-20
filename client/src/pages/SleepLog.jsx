import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { CalendarIcon, MoonIcon, EyeIcon, ZapIcon, AlertCircleIcon, Edit2, Trash2, Save } from 'lucide-react'
import { getCurrentLocalDate, createLocalDate, formatLocalDate, getDateRange } from '../utils/dateUtils'

const SleepLog = () => {
  const [formData, setFormData] = useState({
    date: getCurrentLocalDate(),
    wentToBedOnTime: false,
    dryEyeSeverity: 5,
    disruptionCause: '',
    difficultyFallingAsleep: false,
    nightWakings: 0,
    morningGrogginess: 5,
    nextDayFatigue: 5,
    notes: ''
  })
  
  const [recentLogs, setRecentLogs] = useState([])
  const [insights, setInsights] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingLog, setEditingLog] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [logToDelete, setLogToDelete] = useState(null)
  const { authenticatedFetch } = useAuth()

  useEffect(() => {
    fetchRecentLogs()
    fetchInsights()
  }, [])

  const fetchRecentLogs = async () => {
    try {
      // Get past 7 days
      const { startDate: startDateStr, endDate: endDateStr } = getDateRange(getCurrentLocalDate(), 7)
      
      const response = await authenticatedFetch(`/api/sleep/logs?startDate=${startDateStr}&endDate=${endDateStr}`)
      const data = await response.json()
      if (data.success) {
        setRecentLogs(data.data)
      }
    } catch (error) {
      console.error('Error fetching sleep logs:', error)
    }
  }

  const fetchInsights = async () => {
    try {
      const response = await authenticatedFetch('/api/sleep/insights')
      const data = await response.json()
      if (data.success) {
        setInsights(data.data)
      }
    } catch (error) {
      console.error('Error fetching insights:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await authenticatedFetch('/api/sleep/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: formData.date,
          wentToBedOnTime: formData.wentToBedOnTime,
          dryEyeSeverity: parseInt(formData.dryEyeSeverity),
          disruptionCause: formData.disruptionCause || null,
          difficultyFallingAsleep: formData.difficultyFallingAsleep,
          nightWakings: parseInt(formData.nightWakings),
          morningGrogginess: parseInt(formData.morningGrogginess),
          nextDayFatigue: parseInt(formData.nextDayFatigue),
          notes: formData.notes || null
        })
      })
      
      const data = await response.json()
      if (data.success) {
        // Reset form to next day
        const nextDay = new Date()
        nextDay.setDate(nextDay.getDate() + 1)
        setFormData({
          date: nextDay.toISOString().split('T')[0],
          wentToBedOnTime: false,
          dryEyeSeverity: 5,
          disruptionCause: '',
          difficultyFallingAsleep: false,
          nightWakings: 0,
          morningGrogginess: 5,
          nextDayFatigue: 5,
          notes: ''
        })
        
        // Refresh data
        fetchRecentLogs()
        fetchInsights()
      } else {
        console.error('Error logging sleep:', data.error)
      }
    } catch (error) {
      console.error('Error submitting sleep log:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEditLog = (log) => {
    setEditingLog({
      id: log.id,
      date: log.date,
      wentToBedOnTime: log.went_to_bed_on_time,
      dryEyeSeverity: log.dry_eye_severity,
      disruptionCause: log.disruption_cause || '',
      difficultyFallingAsleep: log.difficulty_falling_asleep,
      nightWakings: log.night_wakings,
      morningGrogginess: log.morning_grogginess,
      nextDayFatigue: log.next_day_fatigue,
      notes: log.notes || ''
    })
    setShowEditModal(true)
  }

  const saveEditedLog = async () => {
    if (!editingLog) return

    setIsSubmitting(true)
    try {
      const response = await authenticatedFetch(`/api/sleep/logs/${editingLog.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: editingLog.date,
          wentToBedOnTime: editingLog.wentToBedOnTime,
          dryEyeSeverity: parseInt(editingLog.dryEyeSeverity),
          disruptionCause: editingLog.disruptionCause || null,
          difficultyFallingAsleep: editingLog.difficultyFallingAsleep,
          nightWakings: parseInt(editingLog.nightWakings),
          morningGrogginess: parseInt(editingLog.morningGrogginess),
          nextDayFatigue: parseInt(editingLog.nextDayFatigue),
          notes: editingLog.notes || null
        })
      })

      const data = await response.json()
      if (data.success) {
        await fetchRecentLogs()
        await fetchInsights()
        setShowEditModal(false)
        setEditingLog(null)
      } else {
        console.error('Error updating sleep log:', data.error)
        alert('Error updating sleep log: ' + data.error)
      }
    } catch (error) {
      console.error('Error updating sleep log:', error)
      alert('Error updating sleep log. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDeleteLog = (log) => {
    setLogToDelete(log)
    setShowDeleteConfirm(true)
  }

  const deleteLog = async () => {
    if (!logToDelete) return

    try {
      const response = await authenticatedFetch(`/api/sleep/logs/${logToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        await fetchRecentLogs()
        await fetchInsights()
        setShowDeleteConfirm(false)
        setLogToDelete(null)
      } else {
        console.error('Error deleting sleep log:', data.error)
        alert('Error deleting sleep log: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting sleep log:', error)
      alert('Error deleting sleep log. Please try again.')
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getSeverityColor = (severity) => {
    if (severity <= 3) return 'text-green-600'
    if (severity <= 5) return 'text-yellow-600'
    if (severity <= 7) return 'text-orange-600'
    return 'text-red-600'
  }

  const formatDate = (dateStr) => {
    return createLocalDate(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sleep Log</h1>
          <p className="text-gray-600">Track sleep factors that food can influence</p>
        </div>
        <MoonIcon className="w-8 h-8 text-blue-500" />
      </div>

      {/* Quick Insights */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center">
              <EyeIcon className="w-6 h-6 text-orange-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Avg Dry Eye</p>
                <p className={`text-xl font-bold ${getSeverityColor(insights.averageDryEyeSeverity || 5)}`}>
                  {insights.averageDryEyeSeverity?.toFixed(1) || 'No data'}/10
                </p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <CalendarIcon className="w-6 h-6 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Days Tracked</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{insights.daysTracked}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <AlertCircleIcon className="w-6 h-6 text-red-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Main Disruptor</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                  {insights.disruptionCauses[0]?.disruption_cause || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sleep Log Form */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Log Sleep Data</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date (night you slept)
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="input-field"
                required
              />
            </div>

            {/* Went to bed on time */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.wentToBedOnTime}
                  onChange={(e) => handleInputChange('wentToBedOnTime', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Went to bed on time (not voluntary late night)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Only check if you tried to sleep at a reasonable time
              </p>
            </div>

            {/* Dry Eye Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dry Eye Severity: {formData.dryEyeSeverity}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.dryEyeSeverity}
                onChange={(e) => handleInputChange('dryEyeSeverity', e.target.value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Better than usual</span>
                <span>Normal baseline (5)</span>
                <span>Worse than usual</span>
              </div>
            </div>

            {/* Primary Disruption Cause */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Primary sleep disruption
              </label>
              <select
                value={formData.disruptionCause}
                onChange={(e) => handleInputChange('disruptionCause', e.target.value)}
                className="input-field"
              >
                <option value="">Select primary cause</option>
                <option value="dry_eye">Dry eye</option>
                <option value="digestive">Digestive issues</option>
                <option value="pain">Pain</option>
                <option value="anxiety">Anxiety/stress</option>
                <option value="other">Other</option>
                <option value="none">None (slept well)</option>
              </select>
            </div>

            {/* Additional factors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Extra night wakings
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.nightWakings}
                  onChange={(e) => handleInputChange('nightWakings', e.target.value)}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">Beyond normal dry eye</p>
              </div>

              <div>
                <label className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    checked={formData.difficultyFallingAsleep}
                    onChange={(e) => handleInputChange('difficultyFallingAsleep', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Hard to fall asleep</span>
                </label>
              </div>
            </div>

            {/* Morning measures */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Morning grogginess: {formData.morningGrogginess}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.morningGrogginess}
                  onChange={(e) => handleInputChange('morningGrogginess', e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Next day fatigue: {formData.nextDayFatigue}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.nextDayFatigue}
                  onChange={(e) => handleInputChange('nextDayFatigue', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="input-field"
                rows="2"
                placeholder="Any specific observations about what might have affected sleep..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? 'Logging...' : 'Log Sleep Data'}
            </button>
          </form>
        </div>

        {/* Recent Logs */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Past 7 Days</h2>
          
          {recentLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No sleep data logged yet. Start tracking to see patterns!
            </p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(log.date)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-500">
                        {log.went_to_bed_on_time ? '✓ On time' : '⏰ Late night'}
                      </div>
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
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Dry Eye: </span>
                      <span className={getSeverityColor(log.dry_eye_severity)}>
                        {log.dry_eye_severity}/10
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Fatigue: </span>
                      <span className={getSeverityColor(log.next_day_fatigue)}>
                        {log.next_day_fatigue}/10
                      </span>
                    </div>
                  </div>
                  
                  {log.disruption_cause && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Primary issue: <span className="capitalize">{log.disruption_cause.replace('_', ' ')}</span>
                    </div>
                  )}
                  
                  {log.notes && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                      "{log.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Insights */}
      {insights && insights.insights.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Sleep Insights</h2>
          <div className="space-y-2">
            {insights.insights.map((insight, index) => (
              <div key={index} className="flex items-start">
                <ZapIcon className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Sleep Log</h3>
            
            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date (night you slept)
                </label>
                <input
                  type="date"
                  value={editingLog.date}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, date: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              {/* Went to bed on time */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingLog.wentToBedOnTime}
                    onChange={(e) => setEditingLog(prev => ({ ...prev, wentToBedOnTime: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Went to bed on time (not voluntary late night)
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Only check if you tried to sleep at a reasonable time
                </p>
              </div>

              {/* Dry Eye Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dry Eye Severity: {editingLog.dryEyeSeverity}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editingLog.dryEyeSeverity}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, dryEyeSeverity: e.target.value }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Better than usual</span>
                  <span>Normal baseline (5)</span>
                  <span>Worse than usual</span>
                </div>
              </div>

              {/* Primary Disruption Cause */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Primary sleep disruption
                </label>
                <select
                  value={editingLog.disruptionCause}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, disruptionCause: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Select primary cause</option>
                  <option value="dry_eye">Dry eye</option>
                  <option value="digestive">Digestive issues</option>
                  <option value="pain">Pain</option>
                  <option value="anxiety">Anxiety/stress</option>
                  <option value="other">Other</option>
                  <option value="none">None (slept well)</option>
                </select>
              </div>

              {/* Additional factors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Extra night wakings
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editingLog.nightWakings}
                    onChange={(e) => setEditingLog(prev => ({ ...prev, nightWakings: e.target.value }))}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">Beyond normal dry eye</p>
                </div>

                <div>
                  <label className="flex items-center mt-6">
                    <input
                      type="checkbox"
                      checked={editingLog.difficultyFallingAsleep}
                      onChange={(e) => setEditingLog(prev => ({ ...prev, difficultyFallingAsleep: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Hard to fall asleep</span>
                  </label>
                </div>
              </div>

              {/* Morning measures */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Morning grogginess: {editingLog.morningGrogginess}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={editingLog.morningGrogginess}
                    onChange={(e) => setEditingLog(prev => ({ ...prev, morningGrogginess: e.target.value }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Next day fatigue: {editingLog.nextDayFatigue}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={editingLog.nextDayFatigue}
                    onChange={(e) => setEditingLog(prev => ({ ...prev, nextDayFatigue: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={editingLog.notes}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-field"
                  rows="2"
                  placeholder="Any specific observations about what might have affected sleep..."
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
                disabled={isSubmitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2 inline" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && logToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Delete Sleep Log</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this sleep log from {formatDate(logToDelete.date)}? This action cannot be undone.
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

export default SleepLog