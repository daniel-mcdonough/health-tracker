import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, Legend } from 'recharts'
import { TrendingUp, AlertTriangle, Calendar, Filter, Activity } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const Analysis = () => {
  const [timeRange, setTimeRange] = useState('7days')
  const [selectedSymptom, setSelectedSymptom] = useState('all')
  const [correlations, setCorrelations] = useState([])
  const [symptomTrends, setSymptomTrends] = useState([])
  const [topTriggers, setTopTriggers] = useState([])
  const [recentSymptoms, setRecentSymptoms] = useState({})
  const [hiddenSymptoms, setHiddenSymptoms] = useState(new Set())
  const { authenticatedFetch } = useAuth()

  // Fetch real data from API
  useEffect(() => {
    fetchAnalysisData()
  }, [timeRange, selectedSymptom])

  const fetchAnalysisData = async () => {
    try {
      // Fetch correlations
      const correlationsResponse = await authenticatedFetch('/api/analysis/correlations?minConfidence=0.3&limit=10')
      const correlationsData = await correlationsResponse.json()
      
      if (correlationsData.success) {
        const formattedCorrelations = correlationsData.data.map(c => ({
          foodName: c.foodName,
          symptomName: c.symptomName,
          correlationScore: c.correlationScore,
          confidenceLevel: c.confidenceLevel,
          sampleSize: c.sampleSize,
          category: getCorrelationStrength(c.correlationScore)
        }))
        setCorrelations(formattedCorrelations)
      } else {
        setCorrelations([])
      }

      // Fetch trends
      const trendsResponse = await authenticatedFetch('/api/analysis/trends?days=7')
      const trendsData = await trendsResponse.json()
      
      if (trendsData.success && trendsData.data.length > 0) {
        setSymptomTrends(trendsData.data)
      } else {
        setSymptomTrends([])
      }

      // Fetch insights for top triggers
      const insightsResponse = await authenticatedFetch('/api/analysis/insights')
      const insightsData = await insightsResponse.json()
      
      if (insightsData.success) {
        const triggers = insightsData.data.topTriggers.map(t => ({
          food: t.foodName,
          avgSeverity: t.correlationScore * 10, // Convert to 0-10 scale
          frequency: t.sampleSize,
          lastOccurrence: 'Recent'
        }))
        setTopTriggers(triggers)
      } else {
        setTopTriggers([])
      }

      // Fetch recent symptoms
      const recentResponse = await authenticatedFetch('/api/analysis/recent-symptoms')
      const recentData = await recentResponse.json()
      
      if (recentData.success) {
        setRecentSymptoms(recentData.data)
        // Recent symptoms data loaded
      } else {
        setRecentSymptoms({})
      }

    } catch (error) {
      console.error('Error fetching analysis data:', error)
      // Set empty arrays on error
      setCorrelations([])
      setSymptomTrends([])
      setTopTriggers([])
      setRecentSymptoms({})
    }
  }

  const getCorrelationStrength = (score) => {
    const abs = Math.abs(score)
    if (abs > 0.7) return score > 0 ? 'Strong Trigger' : 'Strong Benefit'
    if (abs > 0.5) return score > 0 ? 'Likely Trigger' : 'Likely Benefit'
    if (abs > 0.3) return score > 0 ? 'Possible Trigger' : 'Possible Benefit'
    return 'Weak Correlation'
  }

  const getCorrelationColor = (score) => {
    if (score > 0.7) return 'text-red-600 bg-red-50'
    if (score > 0.5) return 'text-orange-600 bg-orange-50'
    if (score > 0.3) return 'text-yellow-600 bg-yellow-50'
    if (score < -0.3) return 'text-green-600 bg-green-50'
    return 'text-gray-600 bg-gray-50'
  }

  // Get all unique symptom names from the trend data
  const getSymptomNamesFromData = (data) => {
    if (!data || data.length === 0) return []
    const symptomNames = new Set()
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'date') {
          symptomNames.add(key)
        }
      })
    })
    return Array.from(symptomNames)
  }

  // Generate colors for symptoms
  const getSymptomColor = (symptomName, index) => {
    const colors = [
      '#F59E0B', // yellow/orange
      '#EF4444', // red
      '#10B981', // green
      '#8B5CF6', // purple
      '#3B82F6', // blue
      '#F97316', // orange
      '#EC4899', // pink
      '#6B7280'  // gray
    ]
    return colors[index % colors.length]
  }

  // Get all unique symptom names from recent symptoms data
  const getRecentSymptomNames = (data) => {
    if (!data || !data.chartData || data.chartData.length === 0) return []
    const symptomNames = new Set()
    data.chartData.forEach(item => {
      if (item.symptomName) {
        symptomNames.add(item.symptomName)
      }
    })
    return Array.from(symptomNames)
  }

  // Get color for a symptom from recent symptoms data - using same colors as Symptom Trends
  const getRecentSymptomColor = (symptomName, data, index) => {
    // Use specific colors that match the Symptom Trends chart
    const symptomColorMap = {
      'Acid Reflux': 'rgb(139, 92, 246)',
      'Fatigue': 'rgb(107, 114, 128)', 
      'Right Upper Quadrant Pain': 'rgb(245, 158, 11)',
      'Dry Eye': 'rgb(59, 130, 246)'
    }
    
    // First check for specific symptom mapping
    if (symptomColorMap[symptomName]) {
      return symptomColorMap[symptomName]
    }
    
    // Fallback to the same color sequence as Symptom Trends
    const colors = [
      '#F59E0B', // yellow/orange
      '#EF4444', // red
      '#10B981', // green
      '#8B5CF6', // purple
      '#3B82F6', // blue
      '#F97316', // orange
      '#EC4899', // pink
      '#6B7280'  // gray
    ]
    return colors[index % colors.length]
  }

  // Handle legend click to toggle symptom visibility
  const handleLegendClick = (dataKey) => {
    setHiddenSymptoms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey)
      } else {
        newSet.add(dataKey)
      }
      return newSet
    })
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analysis</h1>
          <p className="text-gray-600">Discover patterns and correlations in your health data</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input-field"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 3 months</option>
              <option value="365days">Last year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Focus Symptom</label>
            <select
              value={selectedSymptom}
              onChange={(e) => setSelectedSymptom(e.target.value)}
              className="input-field"
            >
              <option value="all">All Symptoms</option>
              <option value="bloating">Bloating</option>
              <option value="stomachpain">Stomach Pain</option>
              <option value="fatigue">Fatigue</option>
              <option value="headache">Headache</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="card">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Top Trigger</p>
              {topTriggers.length > 0 ? (
                <>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{topTriggers[0].food}</p>
                  <p className="text-sm text-red-600">{Math.abs(topTriggers[0].avgSeverity * 10).toFixed(0)}% correlation</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-gray-400">No data</p>
                  <p className="text-sm text-gray-400">Track meals to see triggers</p>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Weekly Trend</p>
              {symptomTrends.length > 0 ? (
                <>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">Data Available</p>
                  <p className="text-sm text-blue-600">View chart below</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-gray-400">No data</p>
                  <p className="text-sm text-gray-400">Log symptoms to see trends</p>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Data Points</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{correlations.length}</p>
              <p className="text-sm text-green-600">correlations found</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Symptom Entries Chart - Full Width */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recent Symptom Entries (Past 3 Days)
        </h2>
        {!recentSymptoms.chartData || recentSymptoms.chartData.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Recent Symptoms
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No symptoms logged in the past 3 days. Start tracking to see your recent patterns here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            {recentSymptoms.summary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Entries</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {recentSymptoms.summary.totalEntries}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Severity</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {recentSymptoms.summary.avgSeverity}/10
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Most Frequent</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                    {recentSymptoms.summary.mostFrequent[0]?.name || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Chart */}
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={(() => {
                // Transform data to have a unique property for each symptom
                const allTimestamps = [...new Set(recentSymptoms.chartData.map(item => 
                  new Date(`${item.date} ${item.time}`).getTime()
                ))].sort((a, b) => a - b);
                
                return allTimestamps.map(timestamp => {
                  const dataPoint = { timestamp };
                  const entries = recentSymptoms.chartData.filter(item => 
                    new Date(`${item.date} ${item.time}`).getTime() === timestamp
                  );
                  
                  entries.forEach(entry => {
                    dataPoint[entry.symptomName] = entry.severity;
                    dataPoint[`${entry.symptomName}_data`] = entry; // Store full data for tooltip
                  });
                  
                  return dataPoint;
                });
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(timestamp) => {
                    const date = new Date(timestamp);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
                           ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  domain={[0, 10]} 
                  label={{ value: 'Severity', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  labelFormatter={(timestamp) => {
                    const date = new Date(timestamp);
                    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + 
                           ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  }}
                  formatter={(value, name, props) => {
                    if (value === undefined || value === null) return null;
                    const fullData = props.payload[`${name}_data`];
                    if (fullData && fullData.notes) {
                      return [`${value}/10 - ${fullData.notes}`, name];
                    }
                    return [`${value}/10`, name];
                  }}
                  content={(props) => {
                    const { active, payload, label } = props;
                    if (!active || !payload || payload.length === 0) return null;
                    
                    const date = new Date(label);
                    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + 
                                   ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    
                    const validPayload = payload.filter(p => p.value !== undefined && p.value !== null);
                    
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{dateStr}</p>
                        {validPayload.map((entry, index) => {
                          const fullData = entry.payload[`${entry.name}_data`];
                          return (
                            <div key={index} className="text-sm">
                              <span style={{ color: entry.color }}>{entry.name}: </span>
                              <span className="text-gray-700 dark:text-gray-300">{entry.value}/10</span>
                              {fullData && fullData.notes && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Note: {fullData.notes}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                  onClick={(e) => handleLegendClick(e.dataKey)}
                  onMouseEnter={(e) => { e.target.style.cursor = 'pointer' }}
                  onMouseLeave={(e) => { e.target.style.cursor = 'default' }}
                  formatter={(value) => (
                    <span style={{ 
                      textDecoration: hiddenSymptoms.has(value) ? 'line-through' : 'none',
                      opacity: hiddenSymptoms.has(value) ? 0.5 : 1
                    }}>
                      {value}
                    </span>
                  )}
                />
                {getRecentSymptomNames(recentSymptoms).map((symptomName, index) => (
                  <Line
                    key={symptomName}
                    type="monotone"
                    dataKey={symptomName}
                    name={symptomName}
                    stroke={getRecentSymptomColor(symptomName, recentSymptoms, index)}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                    hide={hiddenSymptoms.has(symptomName)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Food-Symptom Correlations */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Food-Symptom Correlations</h2>
          {correlations.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Not Enough Data Yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
                To generate meaningful correlations, we need at least:
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• 3+ different foods logged</li>
                  <li>• 3+ different symptoms logged</li>
                  <li>• 5+ days of consistent tracking</li>
                  <li>• Multiple meals and symptoms per day</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Keep logging your meals and symptoms daily to start seeing patterns!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {correlations.map((correlation, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{correlation.foodName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">→ {correlation.symptomName}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCorrelationColor(correlation.correlationScore)}`}>
                        {Math.abs(correlation.correlationScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>{getCorrelationStrength(correlation.correlationScore)}</span>
                    <span>{(correlation.confidenceLevel * 100).toFixed(0)}% confidence • {correlation.sampleSize} samples</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Symptom Trends Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Symptom Trends</h2>
          {symptomTrends.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Trend Data Available
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Start logging symptoms daily to see trends over time.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Trends show how your symptoms change day by day.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={symptomTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <YAxis domain={[0, 10]} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value, name) => [`${value}/10`, name]}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                {getSymptomNamesFromData(symptomTrends).map((symptomName, index) => (
                  <Line 
                    key={symptomName}
                    type="monotone" 
                    dataKey={symptomName} 
                    stroke={getSymptomColor(symptomName, index)} 
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Triggers List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Most Common Triggers</h2>
        {topTriggers.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Triggers Identified Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Continue tracking meals and symptoms to identify potential trigger foods.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Food
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Occurrence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {topTriggers.map((trigger, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {trigger.food}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        trigger.avgSeverity > 7 ? 'bg-red-100 text-red-800' :
                        trigger.avgSeverity > 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {trigger.avgSeverity.toFixed(1)}/10
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {trigger.frequency} times
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {trigger.lastOccurrence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Export Data</h2>
        <p className="text-gray-600 mb-4">
          Export your health data and analysis results to share with healthcare providers or for further analysis.
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary">
            Export as CSV
          </button>
          <button className="btn-secondary">
            Export as PDF Report
          </button>
          <button className="btn-secondary">
            Export Raw Data
          </button>
        </div>
      </div>
    </div>
  )
}

export default Analysis