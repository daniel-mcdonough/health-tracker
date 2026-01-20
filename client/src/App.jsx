import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SymptomLog from './pages/SymptomLog'
import FoodLog from './pages/FoodLog'
import BowelLog from './pages/BowelLog'
import MedicationLog from './pages/MedicationLog'
import SleepLog from './pages/SleepLog'
import PhysicalActivity from './pages/PhysicalActivity'
import Analysis from './pages/Analysis'
import ExperimentalAnalysis from './pages/ExperimentalAnalysis'
import Settings from './pages/Settings'

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/symptoms" element={<SymptomLog />} />
                <Route path="/food" element={<FoodLog />} />
                <Route path="/bowel" element={<BowelLog />} />
                <Route path="/medications" element={<MedicationLog />} />
                <Route path="/sleep" element={<SleepLog />} />
                <Route path="/physical-activity" element={<PhysicalActivity />} />
                <Route path="/analysis" element={<Analysis />} />
                <Route path="/experimental" element={<ExperimentalAnalysis />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App