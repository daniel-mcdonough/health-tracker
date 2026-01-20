import { useState, useEffect } from 'react'
import { Calendar, Clock, Plus, Save, Search, Pill, X, Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getCurrentLocalDate, getDateRange, formatDateForDisplay } from '../utils/dateUtils'

const MedicationLog = () => {
  const [selectedDate, setSelectedDate] = useState(getCurrentLocalDate)
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5))
  const [medications, setMedications] = useState([])
  const [medicationLogs, setMedicationLogs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMedication, setSelectedMedication] = useState(null)
  const [dosageAmount, setDosageAmount] = useState('1')
  const [dosageUnit, setDosageUnit] = useState('pills')
  const [dosageForm, setDosageForm] = useState('pill')
  const [notes, setNotes] = useState('')
  const [editingLog, setEditingLog] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [logToDelete, setLogToDelete] = useState(null)
  const { authenticatedFetch } = useAuth()

  // Fetch medications from API
  useEffect(() => {
    fetchMedications()
  }, [])

  // Fetch medication logs for the past 7 days
  useEffect(() => {
    fetchMedicationLogs()
  }, [selectedDate])

  const fetchMedications = async () => {
    try {
      const response = await authenticatedFetch('/api/medications')
      const data = await response.json()
      if (data.success) {
        setMedications(data.data)
      }
    } catch (error) {
      console.error('Error fetching medications:', error)
    }
  }

  const fetchMedicationLogs = async () => {
    try {
      // Fetch past 7 days
      const { startDate: startDateStr, endDate: endDateStr } = getDateRange(selectedDate, 7)

      const response = await authenticatedFetch(`/api/medications/logs?startDate=${startDateStr}&endDate=${endDateStr}`)
      const data = await response.json()
      if (data.success) {
        setMedicationLogs(data.data)
      }
    } catch (error) {
      console.error('Error fetching medication logs:', error)
    }
  }

  const filteredMedications = medications.filter(medication =>
    medication.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medication.scientific_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medication.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addCustomMedication = async () => {
    if (!searchTerm.trim()) return

    try {
      const response = await authenticatedFetch('/api/medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: searchTerm,
          scientificName: searchTerm,
          category: 'other',
          dosageForms: ['pill', 'liquid']
        })
      })
      const data = await response.json()
      if (data.success) {
        setMedications(prev => [...prev, data.data])
        setSelectedMedication(data.data)
        setSearchTerm('')
      }
    } catch (error) {
      console.error('Error adding custom medication:', error)
    }
  }

  const selectMedication = (medication) => {
    setSelectedMedication(medication)
    setDosageForm(medication.dosageForms[0] || 'pill')
    
    // Set appropriate default unit based on form
    if (medication.dosageForms.includes('liquid')) {
      setDosageUnit('ml')
    } else {
      setDosageUnit('pills')
    }
    
    setSearchTerm('')
  }

  const logMedication = async () => {
    if (!selectedMedication || !dosageAmount) return

    try {
      const response = await authenticatedFetch('/api/medications/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medicationId: selectedMedication.id,
          date: selectedDate,
          time: selectedTime,
          dosageAmount: parseFloat(dosageAmount),
          dosageUnit: dosageUnit,
          dosageForm: dosageForm,
          notes: notes
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Refresh the medication logs
        await fetchMedicationLogs()
        
        // Reset form
        setSelectedMedication(null)
        setDosageAmount('1')
        setDosageUnit('pills')
        setDosageForm('pill')
        setNotes('')
      } else {
        console.error('Error logging medication:', data.error)
        alert('Error logging medication: ' + data.error)
      }
    } catch (error) {
      console.error('Error logging medication:', error)
      alert('Error logging medication. Please try again.')
    }
  }

  const startEditLog = (log) => {
    // First find the medication object to populate dosage forms
    const medication = medications.find(med => med.id === log.medicationId || med.name === log.medicationName)
    
    setEditingLog({
      id: log.id,
      medicationId: log.medicationId || medication?.id,
      medication: medication,
      dosageAmount: log.dosageAmount.toString(),
      dosageUnit: log.dosageUnit,
      dosageForm: log.dosageForm,
      notes: log.notes || '',
      date: log.date,
      time: log.time
    })
    setShowEditModal(true)
  }

  const saveEditedLog = async () => {
    if (!editingLog.medicationId || !editingLog.dosageAmount) return

    try {
      const response = await authenticatedFetch(`/api/medications/logs/${editingLog.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medicationId: editingLog.medicationId,
          date: editingLog.date,
          time: editingLog.time,
          dosageAmount: parseFloat(editingLog.dosageAmount),
          dosageUnit: editingLog.dosageUnit,
          dosageForm: editingLog.dosageForm,
          notes: editingLog.notes
        })
      })

      const data = await response.json()
      if (data.success) {
        await fetchMedicationLogs()
        setShowEditModal(false)
        setEditingLog(null)
      } else {
        console.error('Error updating medication log:', data.error)
        alert('Error updating medication log: ' + data.error)
      }
    } catch (error) {
      console.error('Error updating medication log:', error)
      alert('Error updating medication log. Please try again.')
    }
  }

  const confirmDeleteLog = (log) => {
    setLogToDelete(log)
    setShowDeleteConfirm(true)
  }

  const deleteLog = async () => {
    if (!logToDelete) return

    try {
      const response = await authenticatedFetch(`/api/medications/logs/${logToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        await fetchMedicationLogs()
        setShowDeleteConfirm(false)
        setLogToDelete(null)
      } else {
        console.error('Error deleting medication log:', data.error)
        alert('Error deleting medication log: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting medication log:', error)
      alert('Error deleting medication log. Please try again.')
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      antihistamine_h1: 'bg-blue-100 text-blue-800',
      antihistamine_h2: 'bg-green-100 text-green-800',
      supplement: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const getCategoryLabel = (category) => {
    const labels = {
      antihistamine_h1: 'H1 Antihistamine',
      antihistamine_h2: 'H2 Antihistamine',
      supplement: 'Supplement',
      other: 'Other'
    }
    return labels[category] || 'Other'
  }

  const getUnitOptions = (form) => {
    if (form === 'liquid') {
      return [
        { value: 'ml', label: 'ml' },
        { value: 'tsp', label: 'tsp' },
        { value: 'tbsp', label: 'tbsp' }
      ]
    } else {
      return [
        { value: 'pills', label: 'pills' },
        { value: 'capsules', label: 'capsules' },
        { value: 'mg', label: 'mg' },
        { value: 'g', label: 'g' }
      ]
    }
  }

  // Group logs by date
  const logsByDate = medicationLogs.reduce((acc, log) => {
    if (!acc[log.date]) {
      acc[log.date] = []
    }
    acc[log.date].push(log)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Medication Log</h1>
          <p className="text-gray-600">Track your medication intake and dosages</p>
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
        {/* Log New Medication */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">Log Medication</h2>
          
          {!selectedMedication ? (
            <div className="space-y-4">
              {/* Search Medications */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search medications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>

              {/* Add custom medication if not found */}
              {searchTerm && filteredMedications.length === 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 mb-2">
                    Medication "{searchTerm}" not found. Add it as a custom medication?
                  </p>
                  <button
                    onClick={addCustomMedication}
                    className="btn-primary btn-sm"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add "{searchTerm}"
                  </button>
                </div>
              )}

              {/* Medication Results */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredMedications.map(medication => (
                  <div key={medication.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900">
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium">{medication.name}</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getCategoryColor(medication.category)}`}>
                          {getCategoryLabel(medication.category)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{medication.scientific_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Forms: {medication.dosageForms.join(', ')}
                      </p>
                    </div>
                    <button
                      onClick={() => selectMedication(medication)}
                      className="btn-secondary btn-sm"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Medication */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">{selectedMedication.name}</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getCategoryColor(selectedMedication.category)}`}>
                      {getCategoryLabel(selectedMedication.category)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{selectedMedication.scientific_name}</p>
                </div>
                <button
                  onClick={() => setSelectedMedication(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dosage Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Form</label>
                <select
                  value={dosageForm}
                  onChange={(e) => {
                    setDosageForm(e.target.value)
                    // Update default unit when form changes
                    if (e.target.value === 'liquid') {
                      setDosageUnit('ml')
                    } else {
                      setDosageUnit('pills')
                    }
                  }}
                  className="input-field"
                >
                  {selectedMedication.dosageForms.map(form => (
                    <option key={form} value={form}>{form}</option>
                  ))}
                </select>
              </div>

              {/* Dosage Amount and Unit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={dosageAmount}
                    onChange={(e) => setDosageAmount(e.target.value)}
                    className="input-field"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit</label>
                  <select
                    value={dosageUnit}
                    onChange={(e) => setDosageUnit(e.target.value)}
                    className="input-field"
                  >
                    {getUnitOptions(dosageForm).map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="input-field"
                />
              </div>

              <button
                onClick={logMedication}
                className="btn-primary w-full"
              >
                <Save className="w-4 h-4 mr-2 inline" />
                Log Medication
              </button>
            </div>
          )}
        </div>

        {/* Past 7 Days Logs */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">
            Past 7 Days
          </h2>
          
          {Object.keys(logsByDate).length === 0 ? (
            <div className="text-center py-8">
              <Pill className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No medications logged in the past 7 days</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(logsByDate)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, logs]) => (
                <div key={date} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                  <h3 className="font-medium text-gray-900 mb-3 dark:text-gray-100">
                    {formatDateForDisplay(date)}
                  </h3>
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium">{log.medicationName}</span>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getCategoryColor(log.category)}`}>
                              {getCategoryLabel(log.category)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">{log.time}</span>
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
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <p>{log.dosageAmount} {log.dosageUnit} ({log.dosageForm})</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{log.scientificName}</p>
                          {log.notes && (
                            <p className="text-xs text-gray-700 dark:text-gray-300 italic mt-1">"{log.notes}"</p>
                          )}
                        </div>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Medication Log</h3>
            
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
              </div>

              {/* Medication Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Medication</label>
                <select
                  value={editingLog.medicationId}
                  onChange={(e) => {
                    const selectedMed = medications.find(med => med.id === parseInt(e.target.value))
                    setEditingLog(prev => ({ 
                      ...prev, 
                      medicationId: parseInt(e.target.value),
                      medication: selectedMed,
                      dosageForm: selectedMed?.dosageForms[0] || 'pill'
                    }))
                  }}
                  className="input-field"
                >
                  {medications.map(medication => (
                    <option key={medication.id} value={medication.id}>
                      {medication.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dosage Form */}
              {editingLog.medication && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Form</label>
                  <select
                    value={editingLog.dosageForm}
                    onChange={(e) => {
                      setEditingLog(prev => ({ ...prev, dosageForm: e.target.value }))
                    }}
                    className="input-field"
                  >
                    {editingLog.medication.dosageForms.map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dosage Amount and Unit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={editingLog.dosageAmount}
                    onChange={(e) => setEditingLog(prev => ({ ...prev, dosageAmount: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit</label>
                  <select
                    value={editingLog.dosageUnit}
                    onChange={(e) => setEditingLog(prev => ({ ...prev, dosageUnit: e.target.value }))}
                    className="input-field"
                  >
                    {getUnitOptions(editingLog.dosageForm).map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={editingLog.notes}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
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
                disabled={!editingLog.medicationId || !editingLog.dosageAmount}
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Delete Medication Log</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this medication log for <strong>{logToDelete.medicationName}</strong> from {formatDateForDisplay(logToDelete.date)} at {logToDelete.time}? This action cannot be undone.
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

export default MedicationLog