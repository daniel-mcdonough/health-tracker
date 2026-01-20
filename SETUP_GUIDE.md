# Health Tracker - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
# Install all dependencies for client and server
npm run install:all
```

### 2. Start Development
```bash
# Start both frontend and backend
npm run dev
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## Project Structure
```
health-tracker/
├── client/          # React frontend (Vite + Tailwind)
├── server/          # Express.js backend + SQLite
├── shared/          # Shared TypeScript types
├── docs/            # Documentation
└── PROJECT_PLAN.md  # Detailed project specification
```

## Individual Commands

### Frontend Only
```bash
cd client
npm install
npm run dev
```

### Backend Only
```bash
cd server
npm install
npm run build    # Build TypeScript
npm run dev      # Start with hot reload
```

## Database

- **Type**: SQLite (local file)
- **Location**: `health_tracker.db` (auto-created)
- **Schema**: Automatically initialized on first run
- **Default Data**: Includes essential symptoms and foods

## Features Available

### Core Tracking
- **Symptom Logging** - Track symptoms with severity (1-10)
- **Food Logging** - Log meals with ingredients and portions
- **Bowel Movement Tracking** - Bristol scale, color, size, etc.

### Analysis
- **Correlation Analysis** - Statistical analysis between foods and symptoms
- **Trend Visualization** - Charts showing symptom patterns
- **Insights & Recommendations** - AI-powered health insights

### Data Management
- **Custom Foods** - Add your own foods with allergen info
- **Export Functions** - Export data for healthcare providers
- **Settings** - Customize tracking preferences

## Starting Fresh

To reset all data:
```bash
rm -f health_tracker.db
npm run dev  # Will recreate clean database
```

## Troubleshooting

### Port Already in Use
```bash
# Kill existing processes
pkill -f "tsx.*index.ts"
pkill -f "vite"
```

### Database Issues
```bash
# Delete and recreate database
rm -f health_tracker.db
rm -f server/health_tracker.db
```

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules client/node_modules server/node_modules
npm run install:all
```

## Usage Workflow

1. **Daily Logging**
   - Log symptoms as they occur
   - Track meals throughout the day
   - Record bowel movements

2. **Weekly Analysis**
   - Run correlation analysis
   - Review trends and patterns
   - Adjust diet based on insights

3. **Healthcare Integration**
   - Export data for doctor visits
   - Share correlation findings
   - Track progress over time

## Privacy & Security

- **Local Storage**: All data stays on your computer
- **No Cloud Sync**: Complete privacy
- **SQLite Database**: Industry-standard local database
- **Export Control**: You control your data export

## Tips for Best Results

- **Log consistently** for at least 2 weeks
- **Be specific** with food names and portions
- **Track timing** - when you eat vs when symptoms occur
- **Use custom foods** for your specific diet
- **Run analysis weekly** to see emerging patterns
