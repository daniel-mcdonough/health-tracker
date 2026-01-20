# Sleep Tracking System Documentation

## Overview
The sleep tracking system is designed specifically for chronic dry eye management, replacing generic sleep symptom tracking with targeted data collection that separates behavioral from physiological factors.

## Design Philosophy

The sleep tracking system addresses the unique challenges of tracking sleep quality for users with chronic conditions:

1. **Behavioral vs Physiological Separation**: Distinguishes between voluntary late nights and involuntary sleep disruptions
2. **Condition-Specific Metrics**: Tracks dry eye severity variations rather than generic sleep quality
3. **Correlation-Focused Design**: Structured to enable meaningful statistical analysis with health outcomes
4. **Daily Aggregation**: One comprehensive record per day rather than multiple fragmented entries

## Database Schema

### Sleep Logs Table (`sleep_logs`)
```sql
CREATE TABLE IF NOT EXISTS sleep_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    went_to_bed_on_time BOOLEAN DEFAULT FALSE,
    dry_eye_severity INTEGER CHECK (dry_eye_severity >= 1 AND dry_eye_severity <= 10),
    disruption_cause TEXT CHECK (disruption_cause IN ('dry_eye', 'digestive', 'pain', 'anxiety', 'other', 'none')),
    difficulty_falling_asleep BOOLEAN DEFAULT FALSE,
    night_wakings INTEGER DEFAULT 0,
    morning_grogginess INTEGER CHECK (morning_grogginess >= 1 AND morning_grogginess <= 10),
    next_day_fatigue INTEGER CHECK (next_day_fatigue >= 1 AND next_day_fatigue <= 10),
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date)
);
```

### Key Field Descriptions

- **`went_to_bed_on_time`**: Boolean flag to filter voluntary late nights from correlation analysis
- **`dry_eye_severity`**: 1-10 scale for tracking severity variations relative to personal baseline
- **`disruption_cause`**: Categorical field for primary sleep disruption cause
- **`night_wakings`**: Count of sleep interruptions (beyond baseline expectations)
- **`morning_grogginess`**: 1-10 scale for morning alertness impact
- **`next_day_fatigue`**: 1-10 scale for energy levels throughout following day

## API Endpoints

### Log Sleep Data (`POST /api/sleep/log`)
Records daily sleep information with validation and conflict resolution.

**Request Body:**
```javascript
{
  "date": "2025-08-12",
  "wentToBedOnTime": true,
  "dryEyeSeverity": 5,
  "disruptionCause": "dry_eye",
  "difficultyFallingAsleep": false,
  "nightWakings": 2,
  "morningGrogginess": 4,
  "nextDayFatigue": 6,
  "notes": "Woke up several times due to dry eyes"
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": 1,
    "message": "Sleep data logged successfully"
  }
}
```

**Implementation Notes:**
- Uses `INSERT OR REPLACE` to handle duplicate dates
- Validates severity ranges (1-10) and enum values
- Boolean fields converted from frontend camelCase to database snake_case

### Get Sleep Logs (`GET /api/sleep/logs`)
Retrieves sleep history with optional date filtering.

**Query Parameters:**
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)
- `limit`: Number of records to return (default: 30)

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2025-08-12",
      "went_to_bed_on_time": 1,
      "dry_eye_severity": 5,
      "disruption_cause": "dry_eye",
      "difficulty_falling_asleep": 0,
      "night_wakings": 2,
      "morning_grogginess": 4,
      "next_day_fatigue": 6,
      "notes": "Woke up several times due to dry eyes",
      "logged_at": "2025-08-13T04:13:01Z"
    }
  ]
}
```

### Get Sleep Insights (`GET /api/sleep/insights`)
Provides correlation analysis between dry eye severity and next-day fatigue.

**Response:**
```javascript
{
  "success": true,
  "data": {
    "dryEyeFatigueCorrelation": {
      "correlation": 0.73,
      "sampleSize": 15,
      "significance": "moderate-strong"
    },
    "sleepPatterns": {
      "averageDryEyeSeverity": 5.2,
      "averageNextDayFatigue": 6.1,
      "bedtimeComplianceRate": 0.67
    }
  }
}
```

**Statistical Processing:**
- Uses Pearson correlation coefficient for dry eye severity vs next-day fatigue
- Excludes voluntary late nights (`went_to_bed_on_time = false`) from correlation analysis
- Reports correlation strength and sample size for confidence assessment

### Edit Sleep Log (`PUT /api/sleep/logs/:id`)
Updates an existing sleep log with ownership verification.

**Request Body:**
```javascript
{
  "date": "2025-08-12",
  "wentToBedOnTime": false,
  "dryEyeSeverity": 7,
  "disruptionCause": "digestive",
  "difficultyFallingAsleep": true,
  "nightWakings": 3,
  "morningGrogginess": 6,
  "nextDayFatigue": 8,
  "notes": "Updated notes about sleep quality"
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "message": "Sleep log updated successfully"
  }
}
```

**Implementation Notes:**
- Verifies log belongs to authenticated user before allowing update
- Validates severity ranges (1-10) and enum values
- Returns 404 if log not found or doesn't belong to user
- Maintains same validation as POST endpoint

### Delete Sleep Log (`DELETE /api/sleep/logs/:id`)
Removes an existing sleep log with ownership verification.

**Response:**
```javascript
{
  "success": true,
  "data": {
    "message": "Sleep log deleted successfully"
  }
}
```

**Implementation Notes:**
- Verifies log belongs to authenticated user before allowing deletion
- Returns 404 if log not found or doesn't belong to user
- Permanently removes record from database

## Frontend Integration

### Sleep Log Page (`client/src/pages/SleepLog.jsx`)
Dedicated interface for sleep data entry and insights display.

**Key Features:**
- Form validation for severity ranges and enumerated values
- Date picker with default to current date
- Checkbox inputs for boolean fields
- Dropdown for disruption cause selection
- Notes field for additional context
- Recent logs display with 7-day range (updated from fixed record count)
- Edit/delete functionality with modal dialogs
- Ownership verification for all edit/delete operations
- Dark mode support with proper styling
- Insights section showing correlation data

**CRUD Operations:**
- **Create**: Main form for logging new sleep data
- **Read**: Past 7 Days section showing recent logs
- **Update**: Edit button opens modal with pre-populated form
- **Delete**: Delete button with confirmation dialog
- **Security**: All edit/delete operations verify log ownership

### Navigation Integration
- Added to main app navigation with Moon icon
- Route: `/sleep`
- Protected by authentication middleware
- Integrated with existing layout and theme system

### Form Validation
```javascript
const validateSleepData = (data) => {
  const errors = []
  
  if (!data.date) errors.push('Date is required')
  
  if (data.dryEyeSeverity !== undefined) {
    if (data.dryEyeSeverity < 1 || data.dryEyeSeverity > 10) {
      errors.push('Dry eye severity must be between 1-10')
    }
  }
  
  const validCauses = ['dry_eye', 'digestive', 'pain', 'anxiety', 'other', 'none']
  if (data.disruptionCause && !validCauses.includes(data.disruptionCause)) {
    errors.push('Invalid disruption cause')
  }
  
  return errors
}
```

## Correlation Analysis

### Statistical Method
Uses Pearson correlation coefficient to analyze relationship between dry eye severity and next-day fatigue:

```javascript
const calculatePearsonCorrelation = (x, y) => {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0)
  const sumX2 = x.map(xi => xi * xi).reduce((a, b) => a + b, 0)
  const sumY2 = y.map(yi => yi * yi).reduce((a, b) => a + b, 0)
  
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  
  return numerator / denominator
}
```

### Behavioral Filtering
Correlation analysis excludes records where `went_to_bed_on_time = false` to focus on physiological rather than behavioral factors:

```sql
SELECT dry_eye_severity, next_day_fatigue 
FROM sleep_logs 
WHERE user_id = ? 
  AND went_to_bed_on_time = 1 
  AND dry_eye_severity IS NOT NULL 
  AND next_day_fatigue IS NOT NULL
ORDER BY date DESC
```

### Confidence Assessment
- **Sample Size**: Minimum 10 records recommended for meaningful correlation
- **Correlation Strength**: 
  - 0.0-0.3: Weak
  - 0.3-0.7: Moderate  
  - 0.7-1.0: Strong
- **Statistical Significance**: Reported with sample size for user interpretation

## Migration from Generic Sleep Symptoms

### Migration Process
The transition from generic sleep symptom tracking to specialized sleep logs involved:

1. **Data Assessment**: Analysis of existing sleep symptom data structure
2. **Clean Removal**: Safe deletion of sleep-related symptom categories and logs
3. **Schema Addition**: Creation of new sleep_logs table with targeted fields
4. **Production Deployment**: Transaction-safe migration of production database
5. **Frontend Integration**: Addition of dedicated sleep tracking interface

### Migration Script (`migrateProductionSleep.ts`)
```javascript
// 1. Remove old sleep symptom data
DELETE FROM symptom_logs 
WHERE symptom_id IN (
  SELECT id FROM symptoms 
  WHERE category_id IN (SELECT id FROM symptom_categories WHERE name = 'Sleep')
)

// 2. Remove sleep symptoms
DELETE FROM symptoms 
WHERE category_id IN (SELECT id FROM symptom_categories WHERE name = 'Sleep')

// 3. Remove sleep category
DELETE FROM symptom_categories WHERE name = 'Sleep'

// 4. Add new sleep_logs table
-- Schema creation from add_sleep_logs.sql migration

// 5. Add correlation-specific sleep category
INSERT INTO symptom_categories (user_id, name, description, color, is_default)
VALUES (1, 'Sleep', 'Sleep-related symptoms for correlation analysis', '#3B82F6', 1)
```

### Data Preservation Strategy
- **Backup Creation**: Full database backup before migration
- **Transaction Safety**: All migration steps wrapped in database transactions
- **Rollback Capability**: Migration designed to be reversible if needed
- **Production Testing**: Migration tested on production copy before deployment

## Export/Import Integration

### Export Format
Sleep data is included in the comprehensive health data export:

```javascript
{
  "exportedAt": "2025-08-13T04:12:39.753Z",
  "userId": 1,
  "data": {
    "sleepLogs": [
      {
        "id": 1,
        "user_id": 1,
        "date": "2025-08-12",
        "went_to_bed_on_time": 1,
        "dry_eye_severity": 5,
        "disruption_cause": "dry_eye",
        "difficulty_falling_asleep": 0,
        "night_wakings": 2,
        "morning_grogginess": 4,
        "next_day_fatigue": 6,
        "notes": "Test sleep log",
        "logged_at": "2025-08-13T04:13:01"
      }
    ]
    // ... other health data
  }
}
```

### Import Handling
Sleep logs import with intelligent merge behavior:

```javascript
// Check for existing record by user_id and date
SELECT id FROM sleep_logs WHERE user_id = ? AND date = ?

// Update existing or insert new
if (existingRecord) {
  UPDATE sleep_logs 
  SET went_to_bed_on_time = ?, dry_eye_severity = ?, /* ... other fields */
  WHERE id = ?
} else {
  INSERT INTO sleep_logs (user_id, date, /* ... all fields */)
  VALUES (?, ?, /* ... values */)
}
```

## Usage Guidelines

### For Users with Chronic Dry Eye
1. **Daily Logging**: Record sleep data consistently each morning
2. **Severity Baseline**: Establish personal dry eye severity baseline over first week
3. **Behavioral Honesty**: Accurately mark voluntary late nights to improve correlation accuracy
4. **Pattern Recognition**: Review insights weekly to identify trends
5. **Medical Integration**: Share correlation data with healthcare providers

### For Developers
1. **Data Validation**: Always validate severity ranges and enum values
2. **Behavioral Filtering**: Use `went_to_bed_on_time` flag in correlation analysis
3. **Statistical Significance**: Require minimum sample sizes for meaningful correlations
4. **Error Handling**: Provide clear feedback for validation errors
5. **Performance**: Index date fields for efficient time-range queries

## Future Enhancements

### Potential Improvements
1. **Advanced Correlations**: Multi-factor analysis (food + sleep + symptoms)
2. **Trend Analysis**: Long-term pattern recognition and forecasting
3. **External Integration**: Sleep tracking device data import
4. **Personalized Insights**: Machine learning for individualized recommendations
5. **Medical Reporting**: Automated report generation for healthcare providers

### Technical Considerations
- **Scalability**: Current design supports single-user deployment
- **Data Privacy**: All sleep data encrypted and locally stored
- **Performance**: Optimized for daily data entry and weekly analysis
- **Extensibility**: Schema designed to accommodate additional sleep metrics
- **Integration**: Compatible with existing health tracking infrastructure