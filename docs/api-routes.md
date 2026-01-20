# API Routes Documentation

## Overview
All routes follow consistent patterns for database communication, authentication, and error handling.

## Standard Route Pattern
All routes follow this consistent pattern:

1. **Import database**: `import { database } from '../database/init.js'`
2. **Get database instance**: `const db = database.getDatabase()`
3. **Execute queries**: Using SQLite3 methods (`db.all()`, `db.run()`, `db.get()`)
4. **Error handling**: Consistent try-catch with JSON error responses
5. **Authentication**: All routes use `authenticateToken` middleware

## Query Methods Used

### `db.all(sql, params, callback)`
- **Usage**: Fetch multiple rows (SELECT statements returning arrays)
- **Example**: Getting foods list in `food.ts:13`
- **Pattern**: Returns array of objects, includes null/array validation

### `db.run(sql, params, callback)`
- **Usage**: Execute INSERT, UPDATE, DELETE statements
- **Example**: Adding new food in `food.ts:80-83`
- **Pattern**: `this.lastID` available in callback for getting inserted record ID

### `db.get(sql, params, callback)`
- **Usage**: Fetch single row (SELECT with single result expected)
- **Example**: Fetching food with ingredients in `food.ts:140`
- **Pattern**: Returns single object or null

## Authentication Integration
- **Middleware**: `authenticateToken` from `server/src/middleware/auth.ts:10`
- **JWT-based**: Uses JWT tokens with 30-day expiration (`expiresIn: '30d'`)
- **User Context**: `req.userId` available in all authenticated routes
- **Single User**: Application designed for single-user deployment (user_id=1)

### Authentication Flow
1. **Login**: `POST /api/auth/login` with username/password
2. **Token Generation**: Server returns JWT token valid for 30 days
3. **Authenticated Requests**: Include `Authorization: Bearer <token>` header
4. **Token Validation**: Middleware verifies token and extracts `userId`

### Credentials Configuration
- **Username**: Configured via `AUTH_USERNAME` environment variable
- **Password**: Hash stored in `AUTH_PASSWORD_HASH` (generate with `npm run generate-password`)
- **User ID**: 1 (single-user application)

See the main README for setup instructions.

## Food Routes (`server/src/routes/food.ts`)

### Get Foods (`GET /foods`)
- **Query**: `server/src/routes/food.ts:13`
- **Pattern**: Fetches all foods with GROUP BY to eliminate duplicates
- **Data Processing**: JSON parsing of allergens field with fallback for comma-separated strings
- **Error Handling**: Validates array return type, filters null results

### Add Food (`POST /foods`)
- **Simple Foods**: Single INSERT into `foods` table (`server/src/routes/food.ts:80-83`)
- **Composed Foods**: INSERT food + multiple INSERTs into `food_ingredients` table
- **Transaction Pattern**: Uses SQLite serialization for data consistency
- **Response**: Calls `fetchFoodWithIngredients()` helper to return complete food object

### Log Meal (`POST /meals`)
- **Two-step Process**: 
  1. INSERT into `meals` table (`server/src/routes/food.ts:211-213`)
  2. Multiple INSERTs into `meal_foods` junction table (`server/src/routes/food.ts:238-240`)
- **Concurrency Handling**: Counter pattern to track completion of multiple async INSERTs
- **Default Values**: Uses 'snack' as default meal_type

### Get Meals (`GET /meals`)
- **Complex Query**: Multi-table JOIN between meals, meal_foods, and foods
- **Date Range**: Supports `startDate` and `endDate` query parameters
- **Nested Processing**: 
  1. Get meals (`server/src/routes/food.ts:286-295`)
  2. For each meal, get associated foods (`server/src/routes/food.ts:324-335`)
- **Async Coordination**: Counter pattern to handle multiple async queries

### Edit Meal (`PUT /meals/:id`)
- **Ownership Verification**: Verifies meal belongs to authenticated user before update
- **Transaction Pattern**: Uses database transaction to update meal + meal_foods atomically
- **Complete Replacement**: Removes old meal_foods and inserts new ones
- **Response**: Returns success confirmation with updated meal data
- **Security**: Returns 404 if meal not found or doesn't belong to user

### Delete Meal (`DELETE /meals/:id`)
- **Ownership Verification**: Verifies meal belongs to authenticated user before deletion
- **Cascade Delete**: Removes meal and all associated meal_foods (foreign key CASCADE)
- **Response**: Returns success confirmation with deletion count
- **Security**: Returns 404 if meal not found or doesn't belong to user

## Symptom Routes (`server/src/routes/symptoms.ts`)

### Get Symptoms (`GET /api/symptoms`)
- **Query**: `server/src/routes/symptoms.ts:18-32`
- **Pattern**: JOIN symptoms with categories to get category info
- **Data Transformation**: Maps database rows to structured response objects
- **Grouping**: GROUP BY to eliminate duplicates, ORDER BY category and name

### Get Symptom Logs (`GET /api/symptoms/logs`)
- **Query**: Complex three-table JOIN (symptom_logs, symptoms, symptom_categories)
- **Date Filtering**: Optional startDate/endDate parameters with BETWEEN clause
- **Limit Support**: LIMIT parameter for pagination (default 100)
- **Rich Data**: Includes symptom name, category name, and category color

### Edit Symptom Log (`PUT /api/symptoms/logs/:id`)
- **Ownership Verification**: Verifies log belongs to authenticated user before update
- **Transaction Pattern**: Updates symptom log + removes/adds symptom entries atomically
- **Multiple Symptoms**: Handles updating multiple symptoms in single log entry
- **Response**: Returns success confirmation with updated log data
- **Security**: Returns 404 if log not found or doesn't belong to user

### Delete Symptom Log (`DELETE /api/symptoms/logs/:id`)
- **Ownership Verification**: Verifies log belongs to authenticated user before deletion
- **Cascade Delete**: Removes log and all associated symptom entries (foreign key CASCADE)
- **Response**: Returns success confirmation with deletion count
- **Security**: Returns 404 if log not found or doesn't belong to user

## Medication Routes (`server/src/routes/medications.ts`)

### Get Medications (`GET /medications`)
- **Query**: `server/src/routes/medications.ts:13`
- **Pattern**: Similar to foods - GROUP BY to eliminate duplicates
- **JSON Processing**: Parses `dosage_forms` JSON field with fallback for comma-separated strings
- **Data Filtering**: Filters null results and validates array structure

### Add Medication (`POST /medications`)
- **Simple Pattern**: Single INSERT into `medications` table
- **Default Handling**: Default dosage forms to ['pill'] if not provided
- **Response Pattern**: Fetches newly inserted record with parsed JSON fields

### Log Medication (`POST /medications/log`)
- **Simple Pattern**: Single INSERT into `medication_logs` table
- **Date/Time Combination**: Combines separate date and time inputs
- **User Association**: Links log to authenticated user via user_id
- **Response**: Returns success confirmation with log ID

### Get Medication Logs (`GET /medications/logs`)
- **Query**: JOIN medication_logs with medications table for complete data
- **Date Filtering**: Optional startDate/endDate parameters with BETWEEN clause
- **Rich Data**: Includes medication name, scientific name, and category
- **Ordering**: ORDER BY date DESC, time DESC for chronological display

### Edit Medication Log (`PUT /medications/logs/:id`)
- **Ownership Verification**: Verifies log belongs to authenticated user before update
- **Direct Update**: Single UPDATE statement for medication log record
- **Response**: Returns success confirmation with updated log data
- **Security**: Returns 404 if log not found or doesn't belong to user

### Delete Medication Log (`DELETE /medications/logs/:id`)
- **Ownership Verification**: Verifies log belongs to authenticated user before deletion
- **Direct Delete**: Single DELETE statement for medication log record
- **Response**: Returns success confirmation with deletion count
- **Security**: Returns 404 if log not found or doesn't belong to user

## Sleep Routes (`server/src/routes/sleep.ts`)

### Log Sleep Data (`POST /api/sleep/log`)
- **Pattern**: Single INSERT OR REPLACE into `sleep_logs` table
- **Unique Constraint**: One record per user per date (user_id, date)
- **Field Processing**: Boolean conversion for went_to_bed_on_time, difficulty_falling_asleep
- **Validation**: Severity ranges (1-10), enumerated disruption_cause values
- **Response**: Returns success confirmation with record ID

### Get Sleep Logs (`GET /api/sleep/logs`)
- **Query**: SELECT from `sleep_logs` with date filtering
- **Date Range**: Optional startDate/endDate parameters with BETWEEN clause
- **Limit Support**: LIMIT parameter for pagination (default 30 days)
- **Ordering**: ORDER BY date DESC for chronological display
- **Data Format**: Returns complete sleep records with all tracked fields

### Edit Sleep Log (`PUT /api/sleep/logs/:id`)
- **Ownership Verification**: Verifies log belongs to authenticated user before update
- **Direct Update**: Single UPDATE statement for sleep log record
- **Field Validation**: Validates severity ranges (1-10) and disruption cause enums
- **Response**: Returns success confirmation with updated log data
- **Security**: Returns 404 if log not found or doesn't belong to user

### Delete Sleep Log (`DELETE /api/sleep/logs/:id`)
- **Ownership Verification**: Verifies log belongs to authenticated user before deletion
- **Direct Delete**: Single DELETE statement for sleep log record
- **Response**: Returns success confirmation with deletion count
- **Security**: Returns 404 if log not found or doesn't belong to user

### Get Sleep Insights (`GET /api/sleep/insights`)
- **Correlation Analysis**: Calculates dry eye severity vs next-day fatigue correlation
- **Statistical Processing**: Uses Pearson correlation coefficient
- **Behavioral Filtering**: Excludes voluntary late nights (went_to_bed_on_time = false)
- **Sample Size**: Reports correlation strength and sample size for confidence
- **Response Format**: Returns correlation score, sample size, and data trends

## Physical Activity Routes (`server/src/routes/physicalActivity.ts`)

### Get All Activities (`GET /api/physical-activity/activities`)
- **Pattern**: SELECT from `physical_activities` table with user filtering
- **Data Sources**: Returns both default activities (user_id IS NULL) and custom user activities
- **Ordering**: ORDER BY category, name for logical grouping
- **Response Format**: Complete activity records with id, name, category, met_value, is_custom flags

### Create Custom Activity (`POST /api/physical-activity/activities`)
- **Input Validation**: Requires name and category, optional met_value
- **User Association**: Links activity to authenticated user via user_id
- **Uniqueness**: UNIQUE constraint prevents duplicate activity names per user
- **Category Validation**: CHECK constraint ensures valid category values
- **Response**: Returns created activity record with generated ID

### Get Activity Logs (`GET /api/physical-activity/logs`)
- **Query**: SELECT from `physical_activity_logs` with JOIN to `physical_activities`
- **Date Filtering**: Optional start_date/end_date parameters with BETWEEN clause
- **Data Enrichment**: Includes activity_name, category, met_value from joined table
- **Ordering**: ORDER BY date DESC, start_time DESC for chronological display
- **Response Format**: Complete activity log records with activity details

### Log Activity Session (`POST /api/physical-activity/logs`)
- **Input Validation**: Requires activity_id, date, start_time, duration_minutes
- **Optional Fields**: intensity, calories_burned, distance_km, notes
- **Constraint Checking**: duration_minutes > 0, valid intensity values
- **User Association**: Links log to authenticated user via user_id
- **Uniqueness**: Prevents duplicate entries for same activity at same time
- **Response**: Returns success confirmation with generated log ID

### Update Activity Log (`PUT /api/physical-activity/logs/:id`)
- **Ownership Verification**: Verifies log belongs to authenticated user before update
- **Selective Update**: Updates only modifiable fields (duration, intensity, calories, distance, notes)
- **Data Validation**: Maintains constraint checking on updated values
- **Response**: Returns success confirmation with change count

### Delete Activity Log (`DELETE /api/physical-activity/logs/:id`)
- **Ownership Verification**: Ensures user can only delete their own logs
- **Direct Delete**: Single DELETE statement for activity log record
- **Response**: Returns success confirmation with deletion count
- **Security**: Returns 404 if log not found or doesn't belong to user

### Get Activity Statistics (`GET /api/physical-activity/stats`)
- **Aggregation Query**: Complex SELECT with COUNT, SUM, AVG functions
- **Date Filtering**: Optional start_date/end_date parameters for period analysis
- **Statistical Metrics**: Calculates active_days, total_sessions, total_minutes, avg_duration
- **Category Breakdown**: Counts sessions by activity category (cardio, strength, flexibility)
- **Calorie/Distance Totals**: Sums calories_burned and distance_km across all sessions
- **Response Format**: Single aggregated statistics object

## Bowel Movement Routes (`server/src/routes/bowel.ts`)

### Log Bowel Movement (`POST /api/bowel/log`)
- **Simple Pattern**: Single INSERT into `bowel_movements` table
- **Date/Time Combination**: Combines separate date and time inputs
- **Bristol Scale Validation**: Validates bristol_scale value (1-7)
- **User Association**: Links log to authenticated user via user_id
- **Response**: Returns success confirmation with log ID

### Get Bowel Logs (`GET /api/bowel/logs`)
- **Query**: SELECT from `bowel_movements` table
- **Date Filtering**: Optional startDate/endDate parameters with BETWEEN clause
- **Limit Support**: LIMIT parameter for pagination (default 100)
- **Ordering**: ORDER BY date DESC, time DESC for chronological display
- **Data Format**: Returns complete bowel movement records with all tracked fields

### Edit Bowel Log (`PUT /api/bowel/logs/:id`)
- **Ownership Verification**: Verifies log belongs to authenticated user before update
- **Direct Update**: Single UPDATE statement for bowel movement record
- **Bristol Scale Validation**: Validates bristol_scale value (1-7)
- **Response**: Returns success confirmation with updated log data
- **Security**: Returns 404 if log not found or doesn't belong to user

### Delete Bowel Log (`DELETE /api/bowel/logs/:id`)
- **Ownership Verification**: Verifies log belongs to authenticated user before deletion
- **Direct Delete**: Single DELETE statement for bowel movement record
- **Response**: Returns success confirmation with deletion count
- **Security**: Returns 404 if log not found or doesn't belong to user

## Data Statistics Route (`server/src/routes/data.ts`)

### Get Data Statistics (`GET /api/data/stats`)
- **Multi-table Aggregation**: Counts records across all major tables
- **User-specific Counts**: Filters all counts by authenticated user_id
- **Response Data**: Returns totalDays, totalMeals, totalSymptomLogs, totalMedicationLogs
- **Performance**: Uses efficient COUNT queries for quick statistics
- **Usage**: Powers data summary display in Settings page

## ML Analysis Routes (`server/src/routes/mlAnalysis.ts`)

### Run ML Analysis (`POST /api/ml-analysis/run`)
- **Complex Pipeline**: Executes complete machine learning correlation analysis
- **Data Processing**: Generates hourly exposure flags and symptom targets
- **Temporal Analysis**: Creates lag buckets (0-6h, 6-12h, 12-24h, 24-48h) for timing correlations
- **Food Categorization**: Groups foods into allergen categories (gluten, dairy, caffeine, etc.)
- **Medication Tracking**: Monitors exposure to key medications (antihistamines, supplements)
- **Statistical Validation**: Implements class balance checking and robust train/test splits
- **Performance Metrics**: Calculates real test accuracy, precision, recall, PR-AUC
- **Caching**: Stores results in service for subsequent retrieval
- **Response Format**: Returns array of symptom analysis results with feature importance

### Get Cached Results (`GET /api/ml-analysis/results`)
- **Result Retrieval**: Returns previously computed ML analysis results
- **Cache Check**: Verifies if cached results exist before computation
- **Immediate Response**: Provides instant access to last analysis without re-computation
- **Data Format**: Same structure as run endpoint but from cache
- **Empty Handling**: Returns empty results if no analysis has been run

## Import/Export Routes (`server/src/routes/export.ts`)

### Export All Data (`GET /api/export`)
- **Location**: `server/src/routes/export.ts:9-195`
- **Comprehensive Export**: Exports all user health data as JSON file
- **Data Types Exported**: symptomLogs, meals, bowelMovements, medicationLogs, sleepLogs, customFoods, customMedications, userSettings
- **Complex Queries**: Uses JOINs to include related data (e.g., symptom names with logs, food names with meals)
- **File Download**: Sets proper headers for file download with auto-generated filename
- **Async Coordination**: Uses async counter pattern to coordinate 8 parallel database queries

#### Export Data Structure
```javascript
{
  exportedAt: "2025-08-08T05:48:54.924Z",
  userId: 1,
  data: {
    symptomLogs: [/* with symptom_name, category_name */],
    meals: [/* with nested foods array */],
    bowelMovements: [/* complete records */],
    medicationLogs: [/* with medication_name, scientific_name, category */],
    sleepLogs: [/* complete sleep tracking records */],
    customFoods: [/* user-created foods */],
    customMedications: [/* user-created medications */],
    userSettings: {/* user preferences including dark_mode */}
  }
}
```

### Import Health Data (`POST /api/import`)
- **Location**: `server/src/routes/export.ts:198-956`
- **Comprehensive Import**: Imports complete health data with intelligent merge behavior
- **Data Validation**: Validates JSON structure and required fields before processing
- **Merge Logic**: Updates existing records instead of creating duplicates
- **Import Options**: Supports `dryRun` mode for validation without importing
- **Detailed Results**: Returns comprehensive import results with warnings

#### Import Process Flow
1. **Data Validation**: Validates import JSON structure and format
2. **Sequential Import**: Imports data in dependency order (settings, foods, medications, meals, logs)
3. **Smart Mapping**: Links symptom logs to symptoms by name, meal foods to foods by name
4. **Merge Behavior**: Updates existing records with same keys instead of failing
5. **Result Reporting**: Returns detailed statistics of imported records and warnings

#### Merge Logic by Table
- **User Settings**: `INSERT OR REPLACE` based on user_id
- **Custom Foods**: UPDATE if exists (by user_id, name), INSERT if new
- **Custom Medications**: UPDATE if exists (by user_id, name), INSERT if new  
- **Symptom Logs**: `INSERT OR REPLACE` using UNIQUE constraint (user_id, symptom_id, date, time)
- **Meals**: UPDATE meal + replace all meal_foods if exists (by user_id, meal_time, date), INSERT if new
- **Bowel Movements**: UPDATE if exists (by user_id, date, time), INSERT if new
- **Medication Logs**: UPDATE if exists (by user_id, medication_id, date, time), INSERT if new

#### Import Response Format
```javascript
{
  success: true,
  message: "Data imported successfully",
  results: {
    userSettings: { imported: 1, errors: 0 },
    customFoods: { imported: 3, errors: 0 },
    customMedications: { imported: 1, errors: 0 },
    meals: { imported: 5, errors: 0 },
    symptomLogs: { imported: 8, errors: 0 },
    bowelMovements: { imported: 2, errors: 0 },
    medicationLogs: { imported: 1, errors: 0 },
    sleepLogs: { imported: 3, errors: 0 },
    warnings: ["Food 'Unknown Food' not found, skipping"]
  }
}
```

## Settings Routes (`server/src/routes/settings.ts`)

### Get User Settings (`GET /api/settings`)
- **Pattern**: Single row SELECT from `user_settings` table
- **Default Handling**: Returns default values if no settings found
- **Dark Mode Integration**: Returns `dark_mode` field for frontend theme synchronization

### Update User Settings (`PUT /api/settings`) 
- **Pattern**: `INSERT OR REPLACE` to handle first-time and update scenarios
- **Partial Updates**: Accepts individual fields like `dark_mode` for theme changes
- **Frontend Integration**: Used by ThemeContext to persist dark mode preference
- **Response**: Returns updated settings for confirmation

#### Dark Mode Theme Integration
The dark mode system integrates database storage with frontend state management:

1. **Database Storage**: `user_settings.dark_mode` field stores boolean preference
2. **Frontend Context**: `ThemeContext` manages theme state and persistence
3. **Automatic Sync**: Theme changes trigger both localStorage and database updates
4. **Fallback Handling**: Falls back to localStorage if database update fails
5. **Guest Mode**: Uses localStorage-only for unauthenticated users

## CRUD Operation Patterns

### Ownership Verification Pattern
All edit and delete operations follow this security pattern:

1. **Pre-check Query**: Verify record exists and belongs to authenticated user
```sql
SELECT id FROM table_name WHERE id = ? AND user_id = ?
```

2. **Early Return**: Return 404 if record not found or doesn't belong to user
3. **Actual Operation**: Only proceed with update/delete if ownership verified
4. **Consistent Response**: Always return standard success/error format

### Edit Operations Standard Flow
1. **Authentication**: Extract user_id from JWT token via middleware
2. **Ownership Check**: Verify record belongs to user with preliminary SELECT
3. **Validation**: Validate input data (required fields, data types, constraints)
4. **Database Update**: Execute UPDATE or transaction-based update
5. **Response**: Return success confirmation with updated data

### Delete Operations Standard Flow
1. **Authentication**: Extract user_id from JWT token via middleware
2. **Ownership Check**: Verify record belongs to user with preliminary SELECT
3. **Database Delete**: Execute DELETE statement (cascade deletes handled automatically)
4. **Response**: Return success confirmation with deletion count

### Transaction Patterns for Complex Updates

#### Meal Updates (Complex)
```javascript
// Pattern: UPDATE meal + DELETE/INSERT meal_foods
db.serialize(() => {
  db.run('BEGIN TRANSACTION')
  db.run('UPDATE meals SET ...', [], (err) => {
    if (err) return rollback()
    db.run('DELETE FROM meal_foods WHERE meal_id = ?', [mealId], (err) => {
      if (err) return rollback()
      // Insert new meal_foods with counter pattern
      insertMealFoods(() => {
        db.run('COMMIT')
        res.json({ success: true })
      })
    })
  })
})
```

#### Symptom Log Updates (Complex)
```javascript
// Pattern: UPDATE symptom_logs + DELETE/INSERT symptom_log_entries
// Similar transaction pattern as meals due to junction table
```

#### Simple Updates (Direct)
```javascript
// Pattern: Single UPDATE statement for logs without junction tables
db.run('UPDATE table SET field = ? WHERE id = ? AND user_id = ?', 
       [value, id, userId], callback)
```

### Security Considerations

#### Data Isolation
- **User Filtering**: All queries include `user_id = ?` constraint
- **JWT Authentication**: Token required for all CRUD operations
- **Ownership Verification**: Explicit checks before any modifications
- **No Cross-User Access**: Users cannot access/modify other users' data

#### Input Validation
- **Type Checking**: Validate data types before database operations
- **Range Validation**: Enforce constraints (e.g., severity 1-10, bristol_scale 1-7)
- **Enum Validation**: Validate enumerated values (e.g., disruption_cause, meal_type)
- **SQL Injection Prevention**: Always use parameterized queries

#### Error Information Disclosure
- **Generic Messages**: Don't reveal whether records exist for other users
- **404 vs 403**: Return 404 for both "not found" and "not authorized"
- **Log Security Events**: Log unauthorized access attempts for monitoring

## Error Handling Standards

### Consistent Error Response Format
```javascript
{
  success: false,
  error: 'Error message'
}
```

### Common Error Handling Pattern
```javascript
try {
  const db = database.getDatabase()
  // database operations
} catch (error) {
  console.error('Error description:', error)
  res.status(500).json({
    success: false,
    error: 'User-friendly error message'
  })
}
```