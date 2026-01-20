# Health Tracker Web Application

## Project Overview
A web application to track daily symptoms and food intake to identify correlations between diet and medical issues.

## Core Features

### 1. Symptom Tracking
- Daily symptom logging with severity scales (1-10)
- Custom symptom categories (digestive, energy, mood, pain, etc.)
- Time-based entries (morning, afternoon, evening)
- Notes field for additional context

### 2. Food Intake Logging
- Meal tracking (breakfast, lunch, dinner, snacks)
- Food item database with search functionality
- Portion size tracking
- Timing of meals
- Ingredient-level tracking for complex meals

### 3. Data Analysis & Correlations
- Visual charts showing symptom patterns over time
- Food-symptom correlation analysis
- Identify potential trigger foods
- **Data Import/Export System** - Complete backup and restore functionality
  - Export all health data as JSON for backup or analysis
  - Import data with intelligent merge logic to prevent duplicates
  - Confirmation dialogs and detailed import results with warnings
- Timeline view showing food intake vs. symptom onset

### 4. User Interface
- Clean, mobile-friendly design
- Quick entry forms for daily logging
- Dashboard with key insights
- Calendar view for historical data
- Search and filter capabilities
- **Dark Mode Theme System** - Complete light/dark theme support
  - Theme persistence across sessions with database storage
  - Automatic fallback to localStorage for guest users
  - ThemeContext integration for seamless theme switching

## Technical Architecture

### Frontend
- **React with Vite** - Modern build tooling and fast development
- **Responsive design** for mobile/desktop with Tailwind CSS
- **Dark Mode Theme System** with ThemeContext and persistent storage
- **Charts and visualization library** for data analysis
- **Form validation and user experience** with proper error handling
- **File Upload/Download** for data import/export functionality

### Backend
- **Node.js with TypeScript** - Type-safe server implementation
- **RESTful API** with comprehensive health data endpoints
- **JWT Authentication** - Secure user authentication and session management
- **SQLite Database** with Write-Ahead Logging for optimal performance
- **Import/Export APIs** - Complete data backup and restore system with merge logic
- **User Settings API** - Theme preferences and configuration management
- **Data analysis endpoints** for correlation calculations

### Database Schema
- **Users table** - Authentication and user management
- **Symptoms table** (with categories and severity) - Organized symptom tracking
- **Foods table** - Comprehensive ingredient database with custom foods
- **Meals table** - Meal tracking with detailed timing
- **Meal_foods table** - Junction table linking meals to foods with portions
- **Symptom_logs table** - Daily tracking with UNIQUE constraints for merge logic
- **Bowel_movements table** - Bristol scale and detailed health tracking
- **Medications table** - Medication database with custom entries
- **Medication_logs table** - Medication intake tracking
- **User_settings table** - Preferences including dark_mode theme storage
- **Food_symptom_correlations table** - Computed statistical relationships

## Key User Workflows

1. **Daily Entry**
   - Quick morning symptom check-in
   - Log meals throughout the day
   - Evening symptom review

2. **Analysis**
   - View correlation reports
   - Identify patterns in data
   - Export findings for healthcare providers

3. **Food Management**
   - Search food database
   - Add custom foods/recipes
   - Track ingredient sensitivities

4. **Data Management**
   - Export complete health data as JSON backup
   - Import data from previous exports with merge logic
   - Confirm import operations with detailed results display
   - Theme preference management with automatic persistence

5. **Theme Customization**
   - Toggle between light and dark modes
   - Automatic theme persistence across sessions
   - Synchronized theme storage between frontend and backend

## Privacy & Security
- **Local SQLite database** with single-user architecture
- **JWT authentication** for secure API access
- **No cloud storage** - all data remains local
- **Complete data portability** with import/export functionality
- **Secure data transmission** with proper authentication headers

## Implemented Features Status
- [x] **Core Symptom Tracking** - Daily logging with categories and severity
- [x] **Food Intake Logging** - Comprehensive meal tracking with custom foods
- [x] **Data Analysis & Correlations** - Statistical analysis and pattern identification
- [x] **Import/Export System** - Complete backup and restore with merge logic
- [x] **Dark Mode Theme System** - Full light/dark theme with persistence
- [x] **Medication Tracking** - Medication database and intake logging
- [x] **Bowel Movement Tracking** - Bristol scale and detailed health metrics
- [x] **User Settings Management** - Preferences and configuration storage
- [x] **Mobile-Friendly Design** - Responsive interface for all devices
- [x] **Data Validation** - Comprehensive input validation and error handling

## Future Enhancements
- Integration with fitness trackers
- Weather/environment correlation tracking  
- Healthcare provider sharing features
- Mobile app companion
- Advanced statistical analysis and ML-based pattern detection
- Medication interaction warnings
- Custom symptom categories and advanced symptom tracking

## Theme System Architecture

### Dark Mode Implementation
The application features a complete dark mode theme system with seamless light/dark switching:

**Frontend Components:**
- **ThemeContext** (`client/src/contexts/ThemeContext.jsx`) - React context managing theme state
- **Tailwind CSS** integration with `dark:` classes for comprehensive styling
- **localStorage fallback** for guest users and offline functionality
- **Automatic theme application** via document class manipulation

**Backend Integration:**
- **User Settings API** (`/api/settings`) for theme preference storage
- **Database persistence** in `user_settings.dark_mode` field
- **Automatic synchronization** between frontend state and backend storage
- **Graceful fallback** handling when backend updates fail

**Key Features:**
- Theme persistence across browser sessions
- Instant theme switching without page reload
- Synchronized storage between localStorage and database
- Support for both authenticated and guest users
- Comprehensive dark mode styling across all components

## Data Import/Export System

### Export Functionality
Complete health data export system for backup and portability:

**Export Features:**
- **Comprehensive Data Export** - All user health data in single JSON file
- **Structured Format** - Organized data with metadata and timestamps
- **File Download** - Automatic file download with date-based naming
- **Rich Data Context** - Includes related data (symptom names, food details, etc.)

**Exported Data Types:**
- Symptom logs with category and symptom names
- Meals with associated food details and preparation methods
- Bowel movements with complete Bristol scale data
- Medication logs with medication names and scientific names
- Custom foods and medications created by user
- User settings including theme preferences

### Import Functionality
Advanced import system with intelligent merge logic:

**Import Features:**
- **JSON File Upload** - Drag-and-drop or file picker interface
- **Data Validation** - Comprehensive format and structure validation
- **Confirmation Dialog** - User confirmation with import preview
- **Intelligent Merge Logic** - Updates existing records instead of duplicating
- **Detailed Results** - Comprehensive import statistics and warnings
- **Error Handling** - Graceful handling of missing references and conflicts

**Merge Logic:**
- **User Settings**: Complete replacement of preferences
- **Custom Foods/Medications**: Update existing, insert new based on name matching
- **Symptom Logs**: UNIQUE constraint handling with automatic replacement
- **Meals**: Update meals and replace associated foods based on date/time
- **Health Data**: Smart conflict resolution with timestamp-based updates

**Import Process:**
1. File selection and JSON validation
2. Import confirmation with data preview
3. Sequential data import in dependency order
4. Smart reference mapping (symptoms by name, foods by name, etc.)
5. Detailed result reporting with warnings for missing references
6. Automatic data refresh and user notification

This system enables complete data backup, restoration, and migration between instances while maintaining data integrity and preventing duplicates.