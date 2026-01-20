import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, Calendar, Activity, Play, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const ExperimentalAnalysis = () => {
  const [mlResults, setMlResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastRun, setLastRun] = useState(null)
  const [hasResults, setHasResults] = useState(false)
  const { authenticatedFetch } = useAuth()

  // Check for cached results on load
  useEffect(() => {
    fetchCachedResults()
  }, [])

  const fetchCachedResults = async () => {
    try {
      const response = await authenticatedFetch('/api/ml-analysis/results')
      const data = await response.json()
      
      if (data.success && data.data.results.length > 0) {
        setMlResults(data.data.results)
        setHasResults(true)
        setLastRun(new Date().toISOString())
      } else {
        setHasResults(false)
      }
    } catch (error) {
      console.error('Error fetching cached results:', error)
      setHasResults(false)
    }
  }

  const runMLAnalysis = async () => {
    setIsLoading(true)
    try {
      const response = await authenticatedFetch('/api/ml-analysis/run', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setMlResults(data.data.results)
        setLastRun(data.data.timestamp)
        setHasResults(true)
      } else {
        console.error('ML Analysis error:', data.error)
        alert('Error running ML analysis: ' + data.error)
      }
    } catch (error) {
      console.error('Error running ML analysis:', error)
      alert('Error running ML analysis. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatAccuracy = (accuracy) => {
    return (accuracy * 100).toFixed(1) + '%'
  }

  const formatImportance = (importance) => {
    return importance.toFixed(6)
  }

  const formatCoefficient = (coef) => {
    return Math.abs(coef).toFixed(6)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Experimental ML Analysis</h1>
          <p className="text-gray-600 dark:text-gray-400">Machine learning analysis of food exposures and symptom correlations</p>
        </div>
      </div>

      {/* Status Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Analysis Status</h2>
          <button
            onClick={runMLAnalysis}
            disabled={isLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Analysis...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run ML Analysis
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? 'Running...' : hasResults ? 'Complete' : 'Not Run'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Symptoms Analyzed</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {mlResults.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Run</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {lastRun ? new Date(lastRun).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Info */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Analysis Details</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Categorizes foods into: gluten, dairy, caffeine, fried, acidic/nightshades, histamine, soy, sugar</li>
            <li>• Tracks medications: magnesium citrate, H1/H2 antihistamines, pseudoephedrine</li>
            <li>• Creates exposure lag buckets: 0-6h, 6-12h, 12-24h, 24-48h prior to symptoms</li>
            <li>• Uses correlation-based analysis with real test metrics (accuracy, precision, recall, PR-AUC)</li>
            <li>• Shows top 3 most correlated features per symptom with class balance validation</li>
          </ul>
        </div>
      </div>

      {/* Results */}
      {hasResults && !isLoading && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">ML Analysis Results</h2>
          
          {mlResults.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Insufficient Data
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Not enough data to train models. Need more meals, symptoms, and medications logged.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {mlResults.map((result, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{result.symptom}</h3>
                    <div className="flex space-x-2 text-xs">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                        Test Acc: {formatAccuracy(result.test_accuracy)}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full">
                        Baseline: {formatAccuracy(result.baseline_accuracy)}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                        Precision: {formatAccuracy(result.test_precision)}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                        Recall: {formatAccuracy(result.test_recall)}
                      </span>
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                        PR-AUC: {formatAccuracy(result.pr_auc)}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Feature
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Correlation Importance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Correlation Coefficient
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {result.feature_importance.map((feature, featureIndex) => (
                          <tr key={featureIndex}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {feature.pretty_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatImportance(feature.correlation_importance)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <span className={feature.correlation_coef >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                                {feature.correlation_coef >= 0 ? '+' : ''}{feature.correlation_coef.toFixed(6)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!hasResults && !isLoading && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Getting Started</h2>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              To run ML analysis, you need sufficient data logged in your health tracker:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
              <li>Multiple meals with different foods over several days</li>
              <li>Symptom logs with severity ratings (especially severity ≥ 7)</li>
              <li>Medication logs if you take any of the tracked medications</li>
              <li>At least 10+ data points to train meaningful models</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400">
              The analysis will create hourly exposure flags for different food categories and medications, 
              then train machine learning models to predict symptom severity based on exposure timing.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExperimentalAnalysis