import { useState, useEffect } from 'react'
import { Plus, TrendingUp, Calendar, AlertCircle, RefreshCw, Activity, Pill, Moon, Dumbbell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCurrentLocalDate } from '../utils/dateUtils'

const Dashboard = () => {
  const [todaysLogs, setTodaysLogs] = useState({
    symptoms: [],
    meals: [],
    bowelMovements: [],
    date: getCurrentLocalDate()
  })

  const [overallStats, setOverallStats] = useState({
    totalDays: 0,
    totalMeals: 0,
    totalSymptomLogs: 0,
    totalMedicationLogs: 0,
    totalBowelMovements: 0,
    totalSleepLogs: 0,
    totalPhysicalActivityLogs: 0,
    firstEntryDate: null,
    lastEntryDate: null
  })

  const [quickStats, setQuickStats] = useState({
    symptomsToday: 0,
    mealsToday: 0,
    bowelMovementsToday: 0,
    averageSeverity: 0,
    weeklyTrend: 'stable'
  })
  const [isLoading, setIsLoading] = useState(false)
  const { authenticatedFetch } = useAuth()

  // Fetch data on load
  useEffect(() => {
    fetchTodaysData()
    fetchOverallStats()
  }, [])

  const fetchTodaysData = async () => {
    setIsLoading(true)
    const today = getCurrentLocalDate()
    
    try {
      // Fetch today's symptom logs
      const symptomsResponse = await authenticatedFetch(`/api/symptoms/logs?startDate=${today}&endDate=${today}`)
      const symptomsData = await symptomsResponse.json()
      
      // Fetch today's bowel movements
      const bowelResponse = await authenticatedFetch(`/api/bowel-movements?startDate=${today}&endDate=${today}`)
      const bowelData = await bowelResponse.json()

      if (symptomsData.success) {
        const symptoms = symptomsData.data.map(s => ({
          name: s.symptomName,
          category: s.category,
          severity: s.severity,
          time: s.time
        }))
        
        const avgSeverity = symptoms.length > 0 
          ? symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length 
          : 0

        setTodaysLogs(prev => ({ ...prev, symptoms }))
        setQuickStats(prev => ({ 
          ...prev, 
          symptomsToday: symptoms.length,
          averageSeverity: Math.round(avgSeverity * 10) / 10
        }))
      }

      if (bowelData.success) {
        setTodaysLogs(prev => ({ ...prev, bowelMovements: bowelData.data }))
        setQuickStats(prev => ({ 
          ...prev, 
          bowelMovementsToday: bowelData.data.length
        }))
      }

      // Fetch today's meals
      const mealsResponse = await authenticatedFetch(`/api/meals?startDate=${today}&endDate=${today}`)
      const mealsData = await mealsResponse.json()
      
      if (mealsData.success) {
        const meals = mealsData.data.map(m => ({
          time: m.mealTime,
          foods: m.foods.map(f => f.name)
        }))
        
        setTodaysLogs(prev => ({ ...prev, meals }))
        setQuickStats(prev => ({ ...prev, mealsToday: meals.length }))
      }

    } catch (error) {
      console.error('Error fetching today\'s data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOverallStats = async () => {
    try {
      const response = await authenticatedFetch('/api/data/stats')
      const data = await response.json()
      
      if (data.success) {
        setOverallStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching overall statistics:', error)
    }
  }

  const categoryColors = {
    'Digestive': 'bg-yellow-500',
    'Energy': 'bg-green-500', 
    'Mood': 'bg-purple-500',
    'Pain': 'bg-red-500',
    'Sleep': 'bg-blue-500'
  }

  const QuickActionCard = ({ title, description, icon: Icon, to, color = "bg-blue-600" }) => (
    <Link to={to} className="block">
      <div className="card hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="flex items-center h-full">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  )

  const StatCard = ({ title, value, subtitle, icon: Icon, trend }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex items-center space-x-2">
          {trend && (
            <span className={`text-sm ${trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-gray-500'}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            </span>
          )}
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600">Track your daily health and wellness</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchTodaysData}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-sm text-gray-500">
            Today: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Overall Statistics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Days"
            value={overallStats.totalDays}
            subtitle="with data"
            icon={Calendar}
          />
          <StatCard
            title="Total Meals"
            value={overallStats.totalMeals}
            subtitle="logged"
            icon={Calendar}
          />
          <StatCard
            title="Symptom Logs"
            value={overallStats.totalSymptomLogs}
            subtitle="total"
            icon={AlertCircle}
          />
          <StatCard
            title="Medications"
            value={overallStats.totalMedicationLogs}
            subtitle="logged"
            icon={Pill}
          />
          <StatCard
            title="Sleep Logs"
            value={overallStats.totalSleepLogs}
            subtitle="recorded"
            icon={Moon}
          />
          <StatCard
            title="Activity Logs"
            value={overallStats.totalPhysicalActivityLogs}
            subtitle="sessions"
            icon={Dumbbell}
          />
        </div>
      </div>

      {/* Today's Quick Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Today's Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Symptoms Today"
            value={quickStats.symptomsToday}
            icon={AlertCircle}
            trend={quickStats.symptomsToday > 3 ? 'up' : quickStats.symptomsToday > 0 ? 'stable' : 'down'}
          />
          <StatCard
            title="Meals Today"
            value={quickStats.mealsToday}
            subtitle="logged"
            icon={Calendar}
          />
          <StatCard
            title="Bowel Movements"
            value={quickStats.bowelMovementsToday}
            subtitle="today"
            icon={Calendar}
          />
          <StatCard
            title="Avg Severity"
            value={quickStats.averageSeverity || 0}
            subtitle="1-10 scale"
            icon={TrendingUp}
            trend={quickStats.averageSeverity > 6 ? 'up' : quickStats.averageSeverity > 3 ? 'stable' : 'down'}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 dark:text-gray-100">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <QuickActionCard
            title="Log Symptoms"
            description="Record how you're feeling"
            icon={Plus}
            to="/symptoms"
            color="bg-red-500"
          />
          <QuickActionCard
            title="Add Meal"
            description="Track what you ate"
            icon={Plus}
            to="/food"
            color="bg-green-500"
          />
          <QuickActionCard
            title="Log Medication"
            description="Track medication intake"
            icon={Plus}
            to="/medications"
            color="bg-blue-500"
          />
          <QuickActionCard
            title="Log Activity"
            description="Track physical exercise"
            icon={Dumbbell}
            to="/physical-activity"
            color="bg-orange-500"
          />
          <QuickActionCard
            title="View Analysis"
            description="See correlations"
            icon={TrendingUp}
            to="/analysis"
            color="bg-purple-500"
          />
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Symptoms */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 dark:text-gray-100">Today's Symptoms</h3>
          {todaysLogs.symptoms.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No symptoms logged today</p>
              <Link to="/symptoms" className="btn-primary mt-2 inline-block">
                Log Symptoms
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysLogs.symptoms.map((symptom, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${categoryColors[symptom.category] || 'bg-gray-400'} mr-3`}></div>
                    <span className="font-medium">{symptom.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{symptom.time}</span>
                    <span className="font-semibold">{symptom.severity}/10</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Meals */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 dark:text-gray-100">Today's Meals</h3>
          {todaysLogs.meals.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No meals logged today</p>
              <Link to="/food" className="btn-primary mt-2 inline-block">
                Log Meal
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysLogs.meals.map((meal, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Meal</span>
                    <span className="text-sm text-gray-500">{meal.time}</span>
                  </div>
                  <p className="text-sm text-gray-600">{meal.foods.join(', ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard