// Date utility functions to handle timezone issues consistently

/**
 * Get current date as YYYY-MM-DD string in local timezone
 * Avoids UTC conversion issues
 */
export const getCurrentLocalDate = () => {
  const now = new Date()
  return now.getFullYear() + '-' + 
         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
         String(now.getDate()).padStart(2, '0')
}

/**
 * Create a Date object from YYYY-MM-DD string without timezone shifts
 * Sets time to noon to avoid UTC midnight issues
 */
export const createLocalDate = (dateString) => {
  return new Date(dateString + 'T12:00:00')
}

/**
 * Format a Date object as YYYY-MM-DD string in local timezone
 */
export const formatLocalDate = (date) => {
  return date.getFullYear() + '-' + 
         String(date.getMonth() + 1).padStart(2, '0') + '-' + 
         String(date.getDate()).padStart(2, '0')
}

/**
 * Get date range for past N days from a given date
 * Returns { startDate, endDate } as YYYY-MM-DD strings
 */
export const getDateRange = (selectedDate, days = 7) => {
  const endDate = createLocalDate(selectedDate)
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - (days - 1))
  
  return {
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate)
  }
}

/**
 * Parse date string safely - handles both plain dates and ISO dates
 */
export const parseDateSafely = (dateString) => {
  return dateString.includes('T') ? dateString.split('T')[0] : dateString
}

/**
 * Format date for display with proper timezone handling
 */
export const formatDateForDisplay = (dateString, options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) => {
  const safeDate = createLocalDate(parseDateSafely(dateString))
  return safeDate.toLocaleDateString('en-US', options)
}