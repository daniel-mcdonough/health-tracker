import { Link, useLocation } from 'react-router-dom'
import { Activity, Heart, UtensilsCrossed, BarChart3, Settings, Menu, X, Droplets, LogOut, Pill, Moon, Zap, Dumbbell } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const Layout = ({ children }) => {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Activity },
    { name: 'Symptoms', href: '/symptoms', icon: Heart },
    { name: 'Food Log', href: '/food', icon: UtensilsCrossed },
    { name: 'Bowel Log', href: '/bowel', icon: Droplets },
    { name: 'Medications', href: '/medications', icon: Pill },
    { name: 'Sleep Log', href: '/sleep', icon: Moon },
    { name: 'Physical Activity', href: '/physical-activity', icon: Dumbbell },
    { name: 'Analysis', href: '/analysis', icon: BarChart3 },
    { name: 'Experimental ML', href: '/experimental', icon: Zap },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Health Tracker</h1>
          <button
            type="button"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <nav className="mt-6 flex-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-r-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        
        {/* User info and logout */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.username || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Health Tracker</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 rounded-md transition-colors dark:text-gray-100"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:pl-0">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors">
          <button
            type="button"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout