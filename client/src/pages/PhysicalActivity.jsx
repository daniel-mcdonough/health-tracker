import { useState, useEffect } from 'react'
import { Activity, Plus, X, Edit2, Trash2, Clock, Flame, MapPin, TrendingUp } from 'lucide-react'

const PhysicalActivity = () => {
  const [activities, setActivities] = useState([])
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCustomActivityModal, setShowCustomActivityModal] = useState(false)
  const [editingLog, setEditingLog] = useState(null)
  const [stats, setStats] = useState(null)
  
  const [formData, setFormData] = useState({
    activity_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: new Date().toTimeString().slice(0, 5),
    duration_minutes: 30,
    intensity: 'moderate',
    calories_burned: '',
    distance_km: '',
    notes: ''
  })

  const [customActivityData, setCustomActivityData] = useState({
    name: '',
    category: 'other',
    met_value: ''
  })

  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  const intensityColors = {
    light: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    vigorous: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  const categoryIcons = {
    cardio: '🏃',
    strength: '💪',
    flexibility: '🧘',
    sports: '⚽',
    recreation: '🚴',
    other: '🏋️'
  }

  useEffect(() => {
    fetchActivities()
    fetchLogs()
    fetchStats()
  }, [dateRange])

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/physical-activity/activities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setActivities(data.data)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/physical-activity/logs?start_date=${dateRange.start}&end_date=${dateRange.end}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setLogs(data.data)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/physical-activity/stats?start_date=${dateRange.start}&end_date=${dateRange.end}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const method = editingLog ? 'PUT' : 'POST'
      const url = editingLog 
        ? `/api/physical-activity/logs/${editingLog.id}`
        : `/api/physical-activity/logs`
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      if (data.success) {
        setShowAddModal(false)
        setEditingLog(null)
        setFormData({
          activity_id: '',
          date: new Date().toISOString().split('T')[0],
          start_time: new Date().toTimeString().slice(0, 5),
          duration_minutes: 30,
          intensity: 'moderate',
          calories_burned: '',
          distance_km: '',
          notes: ''
        })
        fetchLogs()
        fetchStats()
      } else {
        alert(data.error || 'Failed to save activity')
      }
    } catch (error) {
      console.error('Error saving activity:', error)
      alert('Failed to save activity')
    }
  }

  const handleCreateCustomActivity = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/physical-activity/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(customActivityData)
      })
      
      const data = await response.json()
      if (data.success) {
        setShowCustomActivityModal(false)
        setCustomActivityData({ name: '', category: 'other', met_value: '' })
        fetchActivities()
      } else {
        alert(data.error || 'Failed to create custom activity')
      }
    } catch (error) {
      console.error('Error creating custom activity:', error)
      alert('Failed to create custom activity')
    }
  }

  const handleEdit = (log) => {
    setEditingLog(log)
    setFormData({
      activity_id: log.activity_id,
      date: log.date,
      start_time: log.start_time,
      duration_minutes: log.duration_minutes,
      intensity: log.intensity || 'moderate',
      calories_burned: log.calories_burned || '',
      distance_km: log.distance_km || '',
      notes: log.notes || ''
    })
    setShowAddModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this activity log?')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/physical-activity/logs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        fetchLogs()
        fetchStats()
      } else {
        alert(data.error || 'Failed to delete activity')
      }
    } catch (error) {
      console.error('Error deleting activity:', error)
      alert('Failed to delete activity')
    }
  }

  const groupLogsByDate = () => {
    const grouped = {}
    logs.forEach(log => {
      if (!grouped[log.date]) {
        grouped[log.date] = []
      }
      grouped[log.date].push(log)
    })
    return grouped
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Activity className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          Physical Activity
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track your workouts and physical activities</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Days</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.active_days || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatDuration(stats.total_minutes || 0)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Calories</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Math.round(stats.total_calories || 0)}
                </p>
              </div>
              <Flame className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Distance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(stats.total_distance || 0).toFixed(1)} km
                </p>
              </div>
              <MapPin className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span className="self-center text-gray-500 dark:text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowCustomActivityModal(true)}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Custom Activity
            </button>
            <button
              onClick={() => {
                setEditingLog(null)
                setFormData({
                  activity_id: '',
                  date: new Date().toISOString().split('T')[0],
                  start_time: new Date().toTimeString().slice(0, 5),
                  duration_minutes: 30,
                  intensity: 'moderate',
                  calories_burned: '',
                  distance_km: '',
                  notes: ''
                })
                setShowAddModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Log Activity
            </button>
          </div>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : Object.keys(groupLogsByDate()).length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No activities logged for this period</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Log Your First Activity
            </button>
          </div>
        ) : (
          Object.entries(groupLogsByDate())
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .map(([date, dayLogs]) => (
              <div key={date} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {dayLogs.map(log => (
                    <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{categoryIcons[log.category] || '🏃'}</span>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                {log.activity_name}
                              </h4>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {log.start_time} • {formatDuration(log.duration_minutes)}
                                </span>
                                {log.intensity && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${intensityColors[log.intensity]}`}>
                                    {log.intensity}
                                  </span>
                                )}
                                {log.calories_burned && (
                                  <span className="flex items-center gap-1">
                                    <Flame className="w-4 h-4 text-orange-500" />
                                    {log.calories_burned} cal
                                  </span>
                                )}
                                {log.distance_km && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4 text-purple-500" />
                                    {log.distance_km} km
                                  </span>
                                )}
                              </div>
                              {log.notes && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{log.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(log)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Add/Edit Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingLog ? 'Edit Activity' : 'Log Activity'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingLog(null)
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Activity
                </label>
                <select
                  value={formData.activity_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, activity_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                  disabled={editingLog}
                >
                  <option value="">Select an activity</option>
                  {Object.entries(
                    activities.reduce((acc, activity) => {
                      if (!acc[activity.category]) acc[activity.category] = []
                      acc[activity.category].push(activity)
                      return acc
                    }, {})
                  ).map(([category, categoryActivities]) => (
                    <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                      {categoryActivities.map(activity => (
                        <option key={activity.id} value={activity.id}>
                          {activity.name} {activity.is_custom ? '(custom)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                    disabled={editingLog}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                    disabled={editingLog}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Intensity
                  </label>
                  <select
                    value={formData.intensity}
                    onChange={(e) => setFormData(prev => ({ ...prev, intensity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="vigorous">Vigorous</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Calories Burned (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.calories_burned}
                    onChange={(e) => setFormData(prev => ({ ...prev, calories_burned: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Distance (km, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.distance_km}
                    onChange={(e) => setFormData(prev => ({ ...prev, distance_km: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingLog(null)
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingLog ? 'Update' : 'Log Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Activity Modal */}
      {showCustomActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Create Custom Activity
              </h2>
              <button
                onClick={() => setShowCustomActivityModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomActivity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Activity Name
                </label>
                <input
                  type="text"
                  value={customActivityData.name}
                  onChange={(e) => setCustomActivityData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={customActivityData.category}
                  onChange={(e) => setCustomActivityData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="cardio">Cardio</option>
                  <option value="strength">Strength</option>
                  <option value="flexibility">Flexibility</option>
                  <option value="sports">Sports</option>
                  <option value="recreation">Recreation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  MET Value (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={customActivityData.met_value}
                  onChange={(e) => setCustomActivityData(prev => ({ ...prev, met_value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Metabolic Equivalent of Task"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Used for calorie calculation (e.g., Walking = 3.5, Running = 8.0)
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCustomActivityModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhysicalActivity