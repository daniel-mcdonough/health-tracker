# API Testing Guide

## Overview
This guide covers API testing using curl commands, authentication patterns, and troubleshooting common issues.

## Initial Setup

Before testing, ensure you have configured your credentials:
1. Copy `server/.env.example` to `server/.env`
2. Run `npm run generate-password` in the server directory to create a password hash
3. Update `AUTH_USERNAME` and `AUTH_PASSWORD_HASH` in your `.env` file

## Authentication Commands

### Basic Login and Token Extraction
```bash
# Login and extract token
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "$YOUR_USERNAME", "password": "$YOUR_PASSWORD"}' | jq -r '.data.token')

# Verify token was extracted
echo "Token: ${TOKEN:0:20}..."
```

### Manual Token Extraction (without jq)
```bash
# Login and get full response
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "$YOUR_USERNAME", "password": "$YOUR_PASSWORD"}'

# Response format:
# {"success":true,"data":{"token":"eyJhbGc...","user":{"id":1,"username":"your_username"}}}
```

## Common API Patterns

### GET Requests with Authentication
```bash
# Get user settings
curl -X GET "http://localhost:3001/api/settings" \
  -H "Authorization: Bearer $TOKEN"

# Get foods list
curl -X GET "http://localhost:3001/api/foods" \
  -H "Authorization: Bearer $TOKEN"

# Get symptom logs (with date range)
curl -X GET "http://localhost:3001/api/symptoms/logs?startDate=2025-08-08&endDate=2025-08-15" \
  -H "Authorization: Bearer $TOKEN"

# Get medication logs
curl -X GET "http://localhost:3001/api/medications/logs" \
  -H "Authorization: Bearer $TOKEN"

# Get bowel logs
curl -X GET "http://localhost:3001/api/bowel/logs" \
  -H "Authorization: Bearer $TOKEN"

# Get data statistics
curl -X GET "http://localhost:3001/api/data/stats" \
  -H "Authorization: Bearer $TOKEN"
```

### POST/PUT Requests with JSON Data
```bash
# Update user settings
curl -X PUT "http://localhost:3001/api/settings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"timezone": "America/New_York", "dark_mode": true}'

# Add custom food
curl -X POST "http://localhost:3001/api/foods" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Test Food", "category": "custom", "allergens": ["test"]}'

# Log a meal
curl -X POST "http://localhost:3001/api/meals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"mealType": "lunch", "date": "2025-08-08", "time": "12:00", "foods": [{"foodId": 1, "portionSize": "1 cup"}]}'

# Log symptoms
curl -X POST "http://localhost:3001/api/symptoms/log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date": "2025-08-08", "time": "14:00", "symptoms": [{"symptomId": 1, "severity": 6}]}'

# Log medication
curl -X POST "http://localhost:3001/api/medications/log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"medicationId": 1, "date": "2025-08-08", "time": "08:00", "dosage": 1, "dosageUnit": "pill"}'

# Log bowel movement
curl -X POST "http://localhost:3001/api/bowel/log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date": "2025-08-08", "time": "09:00", "bristolScale": 4, "notes": "Normal consistency"}'
```

### Sleep Tracking Endpoints
```bash
# Log sleep data
curl -X POST "http://localhost:3001/api/sleep/log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "date": "2025-08-12",
    "wentToBedOnTime": true,
    "dryEyeSeverity": 5,
    "disruptionCause": "dry_eye",
    "difficultyFallingAsleep": false,
    "nightWakings": 2,
    "morningGrogginess": 4,
    "nextDayFatigue": 6,
    "notes": "Test sleep log"
  }'

# Get sleep logs
curl -X GET "http://localhost:3001/api/sleep/logs" \
  -H "Authorization: Bearer $TOKEN"

# Get sleep insights
curl -X GET "http://localhost:3001/api/sleep/insights" \
  -H "Authorization: Bearer $TOKEN"
```

## CRUD Operations Testing

### Edit/Update Operations
```bash
# Update a meal
curl -X PUT "http://localhost:3001/api/meals/123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"mealType": "dinner", "date": "2025-08-08", "time": "18:00", "foods": [{"foodId": 2, "portionSize": "1 serving"}]}'

# Update a symptom log
curl -X PUT "http://localhost:3001/api/symptoms/logs/456" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date": "2025-08-08", "time": "15:00", "symptoms": [{"symptomId": 1, "severity": 4}]}'

# Update a medication log
curl -X PUT "http://localhost:3001/api/medications/logs/789" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"medicationId": 1, "date": "2025-08-08", "time": "08:30", "dosage": 2, "dosageUnit": "pills"}'

# Update a bowel log
curl -X PUT "http://localhost:3001/api/bowel/logs/101" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date": "2025-08-08", "time": "10:00", "bristolScale": 3, "notes": "Updated notes"}'

# Update a sleep log
curl -X PUT "http://localhost:3001/api/sleep/logs/202" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date": "2025-08-08", "wentToBedOnTime": false, "dryEyeSeverity": 7, "disruptionCause": "digestive", "nextDayFatigue": 8}'
```

### Delete Operations
```bash
# Delete a meal
curl -X DELETE "http://localhost:3001/api/meals/123" \
  -H "Authorization: Bearer $TOKEN"

# Delete a symptom log
curl -X DELETE "http://localhost:3001/api/symptoms/logs/456" \
  -H "Authorization: Bearer $TOKEN"

# Delete a medication log
curl -X DELETE "http://localhost:3001/api/medications/logs/789" \
  -H "Authorization: Bearer $TOKEN"

# Delete a bowel log
curl -X DELETE "http://localhost:3001/api/bowel/logs/101" \
  -H "Authorization: Bearer $TOKEN"

# Delete a sleep log
curl -X DELETE "http://localhost:3001/api/sleep/logs/202" \
  -H "Authorization: Bearer $TOKEN"
```

### Ownership Verification Testing
```bash
# Test that users can only edit/delete their own data
# These should return 404 or 403 errors if the log belongs to another user
curl -X PUT "http://localhost:3001/api/meals/999999" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"mealType": "breakfast"}'

curl -X DELETE "http://localhost:3001/api/symptoms/logs/999999" \
  -H "Authorization: Bearer $TOKEN"
```

### Export/Import Operations
```bash
# Export all data
curl -X GET "http://localhost:3001/api/export" \
  -H "Authorization: Bearer $TOKEN" \
  -o "health-tracker-export.json"

# Import data (dry run)
curl -X POST "http://localhost:3001/api/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @health-tracker-export.json

# Import data with dry run
curl -X POST "http://localhost:3001/api/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"dryRun": true, "data": {...}}'
```

## Complete Workflow Examples

### Settings Management Workflow
```bash
# 1. Login and get token
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "$YOUR_USERNAME", "password": "$YOUR_PASSWORD"}' | jq -r '.data.token')

# 2. Get current settings
echo "Current settings:"
curl -s -X GET "http://localhost:3001/api/settings" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3. Update timezone
echo "Updating timezone to Pacific..."
curl -s -X PUT "http://localhost:3001/api/settings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"timezone": "America/Los_Angeles"}'

# 4. Verify change
echo "Updated settings:"
curl -s -X GET "http://localhost:3001/api/settings" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.timezone'
```

### Data Export/Import Workflow
```bash
# 1. Authenticate
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "$YOUR_USERNAME", "password": "$YOUR_PASSWORD"}' | jq -r '.data.token')

# 2. Export data
echo "Exporting data..."
curl -s -X GET "http://localhost:3001/api/export" \
  -H "Authorization: Bearer $TOKEN" > backup.json

# 3. Verify export
echo "Export contains $(jq '.data | keys | length' backup.json) data types"
echo "Data types: $(jq -r '.data | keys | join(", ")' backup.json)"

# 4. Test import (dry run)
echo "Testing import validation..."
IMPORT_DATA=$(cat backup.json)
curl -s -X POST "http://localhost:3001/api/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$IMPORT_DATA"
```

### Complete CRUD Testing Workflow
```bash
# 1. Authenticate
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "$YOUR_USERNAME", "password": "$YOUR_PASSWORD"}' | jq -r '.data.token')

# 2. Create a test meal
echo "Creating test meal..."
MEAL_RESULT=$(curl -s -X POST "http://localhost:3001/api/meals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"mealType": "lunch", "date": "2025-08-15", "time": "12:00", "foods": [{"foodId": 1, "portionSize": "1 cup"}]}')

MEAL_ID=$(echo $MEAL_RESULT | jq -r '.data.mealId')
echo "Created meal with ID: $MEAL_ID"

# 3. Edit the meal
echo "Editing meal..."
curl -s -X PUT "http://localhost:3001/api/meals/$MEAL_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"mealType": "dinner", "date": "2025-08-15", "time": "18:00", "foods": [{"foodId": 2, "portionSize": "1 serving"}]}'

# 4. Verify the edit
echo "Verifying edit..."
curl -s -X GET "http://localhost:3001/api/meals" \
  -H "Authorization: Bearer $TOKEN" | jq "."

# 5. Delete the meal
echo "Deleting meal..."
curl -s -X DELETE "http://localhost:3001/api/meals/$MEAL_ID" \
  -H "Authorization: Bearer $TOKEN"

# 6. Verify deletion
echo "Verifying deletion..."
curl -s -X GET "http://localhost:3001/api/meals" \
  -H "Authorization: Bearer $TOKEN" | jq "."
```

### Sleep Tracking Workflow
```bash
# 1. Authenticate
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "$YOUR_USERNAME", "password": "$YOUR_PASSWORD"}' | jq -r '.data.token')

# 2. Log sleep data for multiple days
curl -X POST "http://localhost:3001/api/sleep/log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date": "2025-08-10", "wentToBedOnTime": true, "dryEyeSeverity": 4, "disruptionCause": "dry_eye", "nextDayFatigue": 5}'

curl -X POST "http://localhost:3001/api/sleep/log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date": "2025-08-11", "wentToBedOnTime": false, "dryEyeSeverity": 6, "disruptionCause": "dry_eye", "nextDayFatigue": 7}'

# 3. Edit a sleep log
echo "Editing sleep log..."
curl -X PUT "http://localhost:3001/api/sleep/logs/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date": "2025-08-10", "wentToBedOnTime": false, "dryEyeSeverity": 3, "disruptionCause": "none", "nextDayFatigue": 3}'

# 4. Get recent logs (7-day range)
echo "Getting recent sleep logs..."
curl -X GET "http://localhost:3001/api/sleep/logs?startDate=2025-08-08&endDate=2025-08-15" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 5. Get insights with correlation analysis
curl -X GET "http://localhost:3001/api/sleep/insights" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## Troubleshooting Authentication Issues

### Common Problems and Solutions

**1. "Access token required" Error**
```bash
# Problem: Token variable is empty or not set
echo "Token value: '$TOKEN'"  # Check if token exists
echo "Token length: ${#TOKEN}"  # Should be ~140+ characters

# Solution: Ensure token extraction worked
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "$YOUR_USERNAME", "password": "$YOUR_PASSWORD"}' | jq -r '.data.token')
```

**2. "Invalid or expired token" Error**
```bash
# Problem: Token is malformed or server restarted
# Solution: Get fresh token
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "$YOUR_USERNAME", "password": "$YOUR_PASSWORD"}' | jq -r '.data.token')
```

**3. Token Variable Scope Issues**
```bash
# Problem: Token variable lost between shell commands
# Solution: Use single command blocks or verify token in each command
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "$YOUR_USERNAME", "password": "$YOUR_PASSWORD"}' | jq -r '.data.token')

# Use immediately in same command block
curl -X GET "http://localhost:3001/api/settings" \
  -H "Authorization: Bearer $TOKEN"
```

**4. Debug Token Contents**
```bash
# Decode JWT payload to check expiration
PAYLOAD=$(echo $TOKEN | cut -d. -f2)
PADDED_PAYLOAD="${PAYLOAD}$(printf '%*s' $(( (4 - ${#PAYLOAD} % 4) % 4 )) | tr ' ' '=')"
echo $PADDED_PAYLOAD | base64 -d | jq .
```

## Response Format Reference

### Successful Login Response
```javascript
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {"id": 1, "username": "derp"}
  }
}
```

### Authentication Error Response
```javascript
{
  "success": false,
  "error": "Invalid credentials"
}
```

### Authorization Error Response
```javascript
{
  "success": false,
  "error": "Access token required"
}
```

### Standard Success Response
```javascript
{
  "success": true,
  "data": {
    // Response data varies by endpoint
  }
}
```

### Standard Error Response
```javascript
{
  "success": false,
  "error": "User-friendly error message"
}
```

## Testing Checklist

### Basic Functionality
- [ ] Login with correct credentials returns token
- [ ] Login with incorrect credentials returns error
- [ ] Authenticated requests work with valid token
- [ ] Unauthenticated requests return 401 error
- [ ] Expired tokens are rejected

### Data Operations
- [ ] Can create, read, update, delete data for each entity type
- [ ] Edit/delete operations verify ownership
- [ ] Export includes all data types with proper structure
- [ ] Import successfully restores exported data
- [ ] Import dry-run validates without making changes
- [ ] Import handles missing/invalid data gracefully

### CRUD Operations for All Log Types
- [ ] Meal logs: create, read, update, delete with ownership verification
- [ ] Symptom logs: create, read, update, delete with ownership verification
- [ ] Medication logs: create, read, update, delete with ownership verification
- [ ] Bowel logs: create, read, update, delete with ownership verification
- [ ] Sleep logs: create, read, update, delete with ownership verification
- [ ] Edit operations preserve data integrity and validation
- [ ] Delete operations properly clean up related data
- [ ] Unauthorized edit/delete attempts return appropriate errors

### Sleep Tracking Specific
- [ ] Sleep log creation with all required fields
- [ ] Sleep log editing and deletion with ownership verification
- [ ] Sleep insights correlation calculation
- [ ] Sleep logs filtering by date range (7-day window)
- [ ] Sleep data included in export/import operations
- [ ] Behavioral filtering (went_to_bed_on_time) works correctly

### Error Handling
- [ ] Invalid JSON returns proper error
- [ ] Missing required fields return validation errors
- [ ] Database errors return user-friendly messages
- [ ] Network timeouts handled gracefully
- [ ] Large payloads processed correctly

### UI/Theme Testing
- [ ] Dark mode toggle works correctly
- [ ] All components display properly in both light and dark modes
- [ ] Edit/delete modals function correctly
- [ ] 7-day data ranges display accurate recent data
- [ ] Build ID and date display correctly in settings
- [ ] Timezone handling works for local date display