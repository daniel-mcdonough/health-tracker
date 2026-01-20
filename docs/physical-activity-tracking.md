# Physical Activity Tracking System

## Overview

The Physical Activity Tracking system provides comprehensive exercise and activity monitoring capabilities within the Health Tracker application. It allows users to log various types of physical activities, track performance metrics, and monitor their fitness progress over time.

## Key Features

### Default Activities Database
- **31 pre-configured activities** across 6 categories:
  - **Cardio**: Running, cycling, swimming, dancing, etc.
  - **Strength**: Weight lifting, bodyweight exercises, resistance training
  - **Flexibility**: Yoga, stretching, pilates
  - **Sports**: Basketball, tennis, soccer, golf, etc. 
  - **Recreation**: Hiking, walking, gardening, playing with pets
  - **Other**: General category for miscellaneous activities

### Custom Activity Creation
- Create personalized activities not covered by defaults
- Set custom MET (Metabolic Equivalent of Task) values for accurate calorie calculations
- Organize into appropriate categories for better tracking

### Activity Logging
- **Duration tracking** with minute-level precision
- **Intensity levels**: Light, moderate, vigorous
- **Calorie calculation** based on MET values and duration
- **Distance tracking** for applicable activities (running, cycling, swimming)
- **Time logging** with date and start time
- **Notes field** for additional context or observations

### Performance Analytics
- **Statistics overview** showing:
  - Total active days in selected period
  - Total exercise sessions logged
  - Total minutes of activity
  - Average session duration
  - Total calories burned
  - Total distance covered
  - Breakdown by activity category (cardio, strength, flexibility)

### Full CRUD Operations
- **Create**: Log new activity sessions
- **Read**: View activity history with filtering options
- **Update**: Edit existing activity logs
- **Delete**: Remove activity entries with confirmation

## Database Schema

### Physical Activities Table
```sql
CREATE TABLE physical_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,  -- NULL for default activities, user_id for custom ones
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('cardio', 'strength', 'flexibility', 'sports', 'recreation', 'other')),
    met_value REAL, -- Metabolic Equivalent of Task for calorie calculation
    is_custom BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);
```

### Physical Activity Logs Table
```sql
CREATE TABLE physical_activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_id INTEGER NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    intensity TEXT CHECK (intensity IN ('light', 'moderate', 'vigorous')),
    calories_burned INTEGER,
    distance_km REAL,
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES physical_activities(id) ON DELETE CASCADE,
    UNIQUE(user_id, activity_id, date, start_time)
);
```

## API Endpoints

### Get All Activities
```
GET /api/physical-activity/activities
```
Returns all available activities (default + custom) for the authenticated user.

### Create Custom Activity
```
POST /api/physical-activity/activities
Content-Type: application/json

{
  "name": "Rock Climbing",
  "category": "sports",
  "met_value": 8.0
}
```

### Get Activity Logs
```
GET /api/physical-activity/logs?start_date=2025-01-01&end_date=2025-01-31
```
Returns activity logs for the specified date range.

### Log Activity Session
```
POST /api/physical-activity/logs
Content-Type: application/json

{
  "activity_id": 15,
  "date": "2025-01-15",
  "start_time": "07:30",
  "duration_minutes": 45,
  "intensity": "moderate",
  "calories_burned": 350,
  "distance_km": 5.2,
  "notes": "Morning run in the park"
}
```

### Update Activity Log
```
PUT /api/physical-activity/logs/:id
Content-Type: application/json

{
  "duration_minutes": 50,
  "intensity": "vigorous",
  "calories_burned": 400,
  "notes": "Increased pace in final 10 minutes"
}
```

### Delete Activity Log
```
DELETE /api/physical-activity/logs/:id
```

### Get Activity Statistics
```
GET /api/physical-activity/stats?start_date=2025-01-01&end_date=2025-01-31
```
Returns aggregated statistics for the specified period.

## Default Activities with MET Values

### Cardio (Category: cardio)
- **Running (8 mph)**: 11.5 METs
- **Cycling (moderate)**: 8.0 METs  
- **Swimming (moderate)**: 8.0 METs
- **Dancing**: 5.0 METs
- **Elliptical**: 5.0 METs
- **Rowing**: 7.0 METs
- **Jump Rope**: 10.0 METs

### Strength Training (Category: strength)
- **Weight Lifting (general)**: 6.0 METs
- **Bodyweight Exercises**: 3.5 METs
- **Resistance Training**: 5.0 METs
- **CrossFit**: 6.0 METs

### Flexibility (Category: flexibility)
- **Yoga**: 2.5 METs
- **Stretching**: 2.0 METs
- **Pilates**: 3.0 METs
- **Tai Chi**: 3.0 METs

### Sports (Category: sports)
- **Basketball**: 8.0 METs
- **Tennis**: 7.0 METs
- **Soccer**: 10.0 METs
- **Golf (walking)**: 4.0 METs
- **Volleyball**: 4.0 METs

### Recreation (Category: recreation)
- **Walking (3.5 mph)**: 4.0 METs
- **Hiking**: 6.0 METs
- **Gardening**: 4.0 METs
- **Playing with pets**: 2.8 METs
- **Cleaning house**: 3.0 METs

### Other (Category: other)
- **General physical activity**: 3.5 METs

## Frontend Implementation

### Navigation Integration
The Physical Activity page is positioned between Sleep Log and Analysis in the main navigation menu, accessible via the Dumbbell icon.

### User Interface Components
- **Activity Selection**: Dropdown with search functionality
- **Quick Stats Cards**: Overview of recent activity metrics
- **Activity Log Table**: Paginated list with edit/delete actions
- **Modal Dialogs**: For logging new activities and editing existing ones
- **Custom Activity Form**: For creating user-defined activities
- **Statistics Dashboard**: Visual overview of activity trends

### State Management
- Real-time updates when activities are logged, edited, or deleted
- Optimistic UI updates for better user experience
- Error handling with user-friendly feedback messages

## Development Notes

### MET Value Calculations
MET (Metabolic Equivalent of Task) values are used to estimate calorie burn:
```
Calories Burned = METs × Weight (kg) × Duration (hours)
```

### Data Validation
- Duration must be positive integer
- Intensity must be one of: light, moderate, vigorous
- Date and time validation to prevent future dates
- Unique constraint prevents duplicate entries for same activity at same time

### Performance Considerations
- Indexes on user_id and date for efficient querying
- Pagination support for large activity logs
- Optimized statistics queries with aggregation

## Testing

### Example curl Commands
```bash
# Get auth token (replace with your configured credentials)
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "$YOUR_USERNAME", "password": "$YOUR_PASSWORD"}' | jq -r '.data.token')

# Get all activities
curl -X GET "http://localhost:3001/api/physical-activity/activities" \
  -H "Authorization: Bearer $TOKEN"

# Log a running session
curl -X POST "http://localhost:3001/api/physical-activity/logs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activity_id": 1,
    "date": "2025-01-15",
    "start_time": "07:00",
    "duration_minutes": 30,
    "intensity": "moderate",
    "distance_km": 4.0,
    "notes": "Morning jog around the neighborhood"
  }'

# Get activity statistics
curl -X GET "http://localhost:3001/api/physical-activity/stats?start_date=2025-01-01&end_date=2025-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

## Future Enhancements

- **Heart rate tracking** integration
- **GPS route tracking** for outdoor activities
- **Workout templates** for repeated exercise routines
- **Social features** for sharing achievements
- **Integration** with fitness devices and apps
- **Progress photos** and body measurements
- **Workout planning** and scheduling features