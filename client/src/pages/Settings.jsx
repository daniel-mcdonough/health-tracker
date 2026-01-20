import { useState, useEffect } from 'react'
import { Save, Database, Shield, Plus, X, Download, Upload, Moon, Sun, Trash2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const Settings = () => {
  const { authenticatedFetch } = useAuth()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [settings, setSettings] = useState({
    timezone: 'America/New_York',
    correlationSensitivity: 0.3,
    dataRetentionDays: 365
  })
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const [showImportResults, setShowImportResults] = useState(false)
  const [pendingImportData, setPendingImportData] = useState(null)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dataStats, setDataStats] = useState(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)
  const [cleanupRetentionDays, setCleanupRetentionDays] = useState(365)
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)

  const [customSymptoms, setCustomSymptoms] = useState([
    { id: 1, name: 'Custom Symptom 1', category: 'Pain' },
    { id: 2, name: 'Custom Symptom 2', category: 'Digestive' }
  ])

  const [newSymptom, setNewSymptom] = useState({ name: '', category: 'Digestive' })

  // Load settings from backend on component mount
  useEffect(() => {
    loadSettings()
    loadDataStats()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await authenticatedFetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSettings({
            timezone: data.data.timezone || 'America/New_York',
            correlationSensitivity: data.data.correlation_sensitivity || 0.3,
            dataRetentionDays: data.data.data_retention_days || 365
          })
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDataStats = async () => {
    setIsLoadingStats(true)
    try {
      const response = await authenticatedFetch('/api/data/stats')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDataStats(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading data statistics:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleCleanupData = async () => {
    if (isCleaningUp) return
    
    setIsCleaningUp(true)
    try {
      const response = await authenticatedFetch('/api/data/cleanup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retentionDays: cleanupRetentionDays
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Successfully cleaned up ${result.data.rowsDeleted} records older than ${cleanupRetentionDays} days`)
        loadDataStats() // Reload stats after cleanup
        setShowCleanupConfirm(false)
      } else {
        throw new Error('Failed to cleanup data')
      }
    } catch (error) {
      console.error('Error cleaning up data:', error)
      alert('Failed to cleanup data. Please try again.')
    } finally {
      setIsCleaningUp(false)
    }
  }

  const handleClearAllData = async () => {
    if (isClearingAll) return
    
    setIsClearingAll(true)
    try {
      const response = await authenticatedFetch('/api/data/clear-all', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Successfully cleared all data (${result.data.rowsDeleted} records deleted)`)
        loadDataStats() // Reload stats after clearing
        setShowClearAllConfirm(false)
      } else {
        throw new Error('Failed to clear all data')
      }
    } catch (error) {
      console.error('Error clearing all data:', error)
      alert('Failed to clear all data. Please try again.')
    } finally {
      setIsClearingAll(false)
    }
  }

  const updateSetting = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev }
      const keys = path.split('.')
      let current = newSettings
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newSettings
    })
  }


  const addCustomSymptom = () => {
    if (newSymptom.name.trim()) {
      setCustomSymptoms(prev => [
        ...prev,
        { id: Date.now(), name: newSymptom.name, category: newSymptom.category }
      ])
      setNewSymptom({ name: '', category: 'Digestive' })
    }
  }

  const removeCustomSymptom = (id) => {
    setCustomSymptoms(prev => prev.filter(s => s.id !== id))
  }

  const saveSettings = async () => {
    if (isSaving) return
    
    setIsSaving(true)
    try {
      const response = await authenticatedFetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timezone: settings.timezone,
          correlation_sensitivity: settings.correlationSensitivity,
          data_retention_days: settings.dataRetentionDays
        })
      })
      
      if (response.ok) {
        alert('Settings saved successfully!')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const exportData = async () => {
    if (isExporting) return
    
    setIsExporting(true)
    try {
      const response = await authenticatedFetch('/api/export')
      
      if (!response.ok) {
        throw new Error('Failed to export data')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `health-tracker-export-${new Date().toISOString().split('T')[0]}.json`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      alert('Data exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      alert('Please select a valid JSON file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result)
        
        // Validate that it looks like a health tracker export
        if (!importData.data || typeof importData.data !== 'object') {
          throw new Error('Invalid health tracker export format')
        }
        
        setPendingImportData(importData)
        setShowImportConfirm(true)
      } catch (error) {
        console.error('Error parsing JSON file:', error)
        alert('Invalid JSON file. Please check the file format and try again.')
      }
    }
    reader.readAsText(file)
    
    // Reset file input
    event.target.value = ''
  }

  const performImport = async (importData) => {
    if (isImporting) return
    
    setIsImporting(true)
    setImportResults(null)
    setShowImportResults(false)
    
    try {
      const response = await authenticatedFetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to import data')
      }
      
      if (result.success) {
        setImportResults(result)
        setShowImportResults(true)
        
        // Reload data stats after successful import
        loadDataStats()
        
        // Show success message
        const totalImported = Object.values(result.results || {})
          .filter(item => typeof item === 'object' && item.imported !== undefined)
          .reduce((sum, item) => sum + item.imported, 0)
        
        alert(`Data imported successfully! ${totalImported} records imported.`)
      } else {
        throw new Error(result.error || 'Import failed')
      }
      
    } catch (error) {
      console.error('Error importing data:', error)
      alert(`Failed to import data: ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  const triggerFileSelect = () => {
    document.getElementById('import-file-input').click()
  }

  const confirmImport = () => {
    if (pendingImportData) {
      pendingImportData.dryRun = false // Set to false for actual import
      performImport(pendingImportData)
      setShowImportConfirm(false)
      setPendingImportData(null)
    }
  }

  const cancelImport = () => {
    setShowImportConfirm(false)
    setPendingImportData(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-600">Customize your health tracking experience</p>
        </div>
        <button 
          onClick={saveSettings} 
          disabled={isSaving}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2 inline" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* General Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center dark:text-gray-100">
          <Shield className="w-5 h-5 mr-2" />
          General Settings
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => updateSetting('timezone', e.target.value)}
              className="input-field"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="UTC">UTC</option>
            </select>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Correlation Sensitivity
            </label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={settings.correlationSensitivity}
              onChange={(e) => updateSetting('correlationSensitivity', parseFloat(e.target.value))}
              className="severity-slider"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Less sensitive</span>
              <span>{(settings.correlationSensitivity * 100).toFixed(0)}%</span>
              <span>More sensitive</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Minimum correlation strength to show in analysis
            </p>
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center dark:text-gray-100">
          {isDarkMode ? <Moon className="w-5 h-5 mr-2" /> : <Sun className="w-5 h-5 mr-2" />}
          Appearance
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Dark Mode
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Toggle between light and dark themes
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Custom Symptoms */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center dark:text-gray-100">
          <Database className="w-5 h-5 mr-2" />
          Custom Symptoms
        </h2>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Symptom name"
              value={newSymptom.name}
              onChange={(e) => setNewSymptom(prev => ({ ...prev, name: e.target.value }))}
              className="input-field flex-1"
            />
            <select
              value={newSymptom.category}
              onChange={(e) => setNewSymptom(prev => ({ ...prev, category: e.target.value }))}
              className="input-field"
            >
              <option value="Digestive">Digestive</option>
              <option value="Energy">Energy</option>
              <option value="Mood">Mood</option>
              <option value="Pain">Pain</option>
              <option value="Sleep">Sleep</option>
            </select>
            <button onClick={addCustomSymptom} className="btn-primary">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {customSymptoms.map(symptom => (
              <div key={symptom.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{symptom.name}</span>
                  <span className="ml-2 text-sm text-gray-500">({symptom.category})</span>
                </div>
                <button
                  onClick={() => removeCustomSymptom(symptom.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2" />
          Data Management
        </h2>
        
        {/* Data Statistics */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Your Data Summary</h3>
          {isLoadingStats ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading statistics...</div>
          ) : dataStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{dataStats.totalDays}</div>
                <div className="text-gray-600 dark:text-gray-300">Days of Data</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">{dataStats.totalMeals}</div>
                <div className="text-gray-600 dark:text-gray-300">Meals Logged</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">{dataStats.totalSymptomLogs}</div>
                <div className="text-gray-600 dark:text-gray-300">Symptom Entries</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">{dataStats.totalMedicationLogs}</div>
                <div className="text-gray-600 dark:text-gray-300">Medication Logs</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">Unable to load statistics</div>
          )}
        </div>

        {/* Export and Cleanup Actions */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={exportData}
              disabled={isExporting}
              className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export All Data'}
            </button>
            <button 
              onClick={triggerFileSelect}
              disabled={isImporting}
              className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImporting ? 'Importing...' : 'Import Data'}
            </button>
            <input
              id="import-file-input"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => setShowCleanupConfirm(true)}
              className="text-red-600 hover:text-red-800 font-medium flex items-center px-3 py-2 rounded border border-red-200 hover:border-red-300 dark:border-red-800 dark:hover:border-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clean Up Old Data
            </button>
            <button 
              onClick={() => setShowClearAllConfirm(true)}
              className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 font-medium flex items-center px-3 py-2 rounded border border-red-300 hover:border-red-400 dark:bg-red-900/20 dark:border-red-800 dark:hover:border-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Clear All Data
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Export your data as JSON for backup or analysis. Clean up removes data older than your retention settings. Clear All Data permanently removes all your tracking data.
          </p>
        </div>

        {/* Import Results Display */}
        {showImportResults && importResults && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-green-800 dark:text-green-200">
                Import Results
              </h3>
              <button
                onClick={() => setShowImportResults(false)}
                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-green-700 dark:text-green-300">
              <p className="mb-3">{importResults.message}</p>
              
              {importResults.results && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {Object.entries(importResults.results).map(([key, value]) => {
                    if (typeof value === 'object' && value.imported !== undefined) {
                      return (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                          <span className="font-medium">{value.imported} imported</span>
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              )}
              
              {importResults.results && importResults.results.warnings && importResults.results.warnings.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Warnings:</h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    {importResults.results.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Import Confirmation Dialog */}
        {showImportConfirm && pendingImportData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center text-blue-600 dark:text-blue-400 mb-4">
                <Upload className="w-6 h-6 mr-2" />
                <h3 className="text-lg font-semibold">Confirm Data Import</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Are you sure you want to import health data? This will merge with your existing data.
                </p>
                
                {pendingImportData.exportedAt && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Export Date: {new Date(pendingImportData.exportedAt).toLocaleString()}
                  </p>
                )}
                
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> Existing records with the same date/time will be updated with the imported data. 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelImport}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmImport}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Import Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cleanup Confirmation Dialog */}
        {showCleanupConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center text-red-600 dark:text-red-400 mb-4">
                <AlertTriangle className="w-6 h-6 mr-2" />
                <h3 className="text-lg font-semibold">Confirm Data Cleanup</h3>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Keep data from the last:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="7"
                    max="3650"
                    value={cleanupRetentionDays}
                    onChange={(e) => setCleanupRetentionDays(Math.max(7, Math.min(3650, parseInt(e.target.value) || 365)))}
                    className="input-field w-24"
                  />
                  <span className="text-gray-700 dark:text-gray-300">days</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Data older than {cleanupRetentionDays} days will be permanently deleted
                </p>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                This action cannot be undone. Are you sure you want to continue?
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCleanupConfirm(false)
                    setCleanupRetentionDays(365) // Reset to default
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCleanupData}
                  disabled={isCleaningUp}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCleaningUp ? 'Cleaning...' : 'Yes, Clean Up Data'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear All Data Confirmation Dialog */}
        {showClearAllConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold">Clear All Data</h3>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                This will permanently delete <strong>ALL</strong> of your health tracking data including:
              </p>
              
              <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 pl-4 space-y-1">
                <li>• All symptom logs</li>
                <li>• All meals and food logs</li>
                <li>• All medication logs</li>
                <li>• All bowel movement logs</li>
                <li>• All sleep logs</li>
                <li>• All custom foods and medications</li>
                <li>• All correlation data</li>
              </ul>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-6">
                <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                  ⚠️ This action cannot be undone. Make sure you have exported your data first if you want to keep a backup.
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowClearAllConfirm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAllData}
                  disabled={isClearingAll}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClearingAll ? 'Clearing...' : 'Yes, Clear All Data'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Build Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2" />
          Build Information
        </h2>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Build ID:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">
              {import.meta.env.VITE_BUILD_ID || `dev-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}`}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400">Build Date:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">
              {import.meta.env.VITE_BUILD_DATE ? new Date(import.meta.env.VITE_BUILD_DATE).toLocaleString() : new Date().toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings