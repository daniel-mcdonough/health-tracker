# Database Schema Documentation

## Overview
The Health Tracker application uses SQLite as its database with a TypeScript/Node.js backend. Database communication follows consistent patterns across all routes.

## Database Connection Architecture

### Database Class (`server/src/database/init.ts`)
- **Location**: `server/src/database/init.ts:10-242`
- **Database**: SQLite with Write-Ahead Logging (WAL) mode enabled
- **Connection**: Single Database class instance exported as `database`
- **Path**: Environment variable `DB_PATH` or defaults to `health_tracker.db` in working directory
- **Features**: Foreign key constraints enabled, automatic schema initialization

## Schema Structure (`server/src/database/schema.sql`)
The database uses a comprehensive schema with these main tables and their relationships:

### Core Tables
- **`users` (lines 4-11)**: User authentication and management
  - `id` (PK), `email` (UNIQUE), `password_hash`, `name`, timestamps
  - Single-user application (typically only user with id=1)

- **`foods` (lines 53-64)**: Food database with system defaults and custom user foods
  - `id` (PK), `user_id` (FK to users, NULL for system foods), `name`, `category`
  - `common_allergens` (JSON array), `is_custom`, `is_composed` (for recipes)
  - Categories: 'protein', 'grain', 'vegetable', 'fruit', 'dairy', 'composed'

- **`food_ingredients` (lines 67-75)**: Junction table for composed foods/recipes
  - Links `composed_food_id` to `ingredient_food_id` with quantity and notes

### Meal Tracking
- **`meals` (lines 78-87)**: Meal instances with timestamps
  - `id` (PK), `user_id` (FK), `meal_type` (breakfast/lunch/dinner/snack)
  - `meal_time` (DATETIME), `date` (DATE), `notes`

- **`meal_foods` (lines 90-99)**: Junction table linking meals to foods
  - `meal_id` (FK), `food_id` (FK), `portion_size`, `portion_grams`, `preparation_method`

### Symptom Tracking
- **`symptom_categories` (lines 14-23)**: Symptom organization with colors
  - `id` (PK), `user_id` (FK), `name`, `description`, `color`, `is_default`
  - Default categories: Digestive, Energy, Mood, Pain

- **`symptoms` (lines 26-35)**: Individual symptoms within categories
  - `id` (PK), `user_id` (FK), `category_id` (FK), `name`, `description`

- **`symptom_logs` (lines 38-50)**: Daily symptom severity tracking
  - `id` (PK), `user_id` (FK), `symptom_id` (FK), `severity` (1-10)
  - `time`, `date`, `notes`, `logged_at`
  - UNIQUE constraint on (user_id, symptom_id, date, time)

### Health Tracking
- **`bowel_movements` (lines 134-149)**: Bristol scale tracking
  - `bristol_scale` (1-7), `color` (enum values), `size` (small/medium/large)
  - `urgency` (1-5), `ease_of_passage` (1-5), `blood_present`, `mucus_present`

- **`medications` (lines 152-162)**: Medication database
  - `id` (PK), `user_id` (FK, NULL for system meds), `name`, `scientific_name`
  - `category` (antihistamine_h1/h2, supplement, other), `dosage_forms` (JSON array)

- **`medication_logs` (lines 165-178)**: Medication intake tracking
  - `medication_id` (FK), `dosage_amount`, `dosage_unit`, `dosage_form`
  - `date`, `time`, `notes`

### Sleep Tracking
- **`sleep_logs`**: Specialized sleep tracking for chronic dry eye management
  - `id` (PK), `user_id` (FK), `date` (DATE) - UNIQUE constraint per user per date
  - `went_to_bed_on_time` (BOOLEAN) - Behavioral factor to filter voluntary late nights
  - `dry_eye_severity` (INTEGER 1-10) - Daily severity for tracking variations
  - `disruption_cause` (TEXT) - Categorical: 'dry_eye', 'digestive', 'pain', 'anxiety', 'other', 'none'
  - `difficulty_falling_asleep` (BOOLEAN), `night_wakings` (INTEGER)
  - `morning_grogginess` (INTEGER 1-10), `next_day_fatigue` (INTEGER 1-10)
  - `notes` (TEXT), `logged_at` (DATETIME)

### Physical Activity Tracking
- **`physical_activities`**: Exercise and activity database with defaults and custom entries
  - `id` (PK), `user_id` (FK, NULL for default activities), `name`, `category`
  - `category` CHECK constraint: 'cardio', 'strength', 'flexibility', 'sports', 'recreation', 'other'
  - `met_value` (REAL) - Metabolic Equivalent of Task for calorie calculations
  - `is_custom` (BOOLEAN) - Distinguishes user-created from default activities
  - UNIQUE constraint on (user_id, name) prevents duplicate custom activities

- **`physical_activity_logs`**: Individual activity session tracking
  - `id` (PK), `user_id` (FK), `activity_id` (FK to physical_activities)
  - `date` (DATE), `start_time` (TIME), `duration_minutes` (INTEGER CHECK > 0)
  - `intensity` CHECK constraint: 'light', 'moderate', 'vigorous'
  - `calories_burned` (INTEGER), `distance_km` (REAL), `notes` (TEXT)
  - UNIQUE constraint on (user_id, activity_id, date, start_time) prevents duplicates
  - Indexes: `idx_physical_activity_logs_user_date`, `idx_physical_activity_logs_date`

### Analysis
- **`food_symptom_correlations` (lines 102-116)**: Computed statistical correlations
  - `correlation_score` (-1 to 1), `confidence_level` (0 to 1)
  - `sample_size`, `time_window_hours`, `last_calculated`

- **`user_settings` (lines 119-131)**: User preferences and configuration
  - `timezone`, `reminder_enabled`, `reminder_times` (JSON)
  - `correlation_sensitivity`, `data_retention_days`
  - `dark_mode` (BOOLEAN) - Theme preference synchronized with frontend ThemeContext

## Performance Considerations

### Indexing Strategy (`server/src/database/schema.sql:181-194`)
Database includes strategic indexes for optimal query performance:
- **User-based queries**: `idx_foods_user`, `idx_medications_user`, etc.
- **Date-based queries**: `idx_symptom_logs_user_date`, `idx_meals_user_date`, `idx_bowel_movements_user_date`
- **Time-series queries**: `idx_meals_time` for temporal ordering
- **Correlation analysis**: `idx_correlations_score`, `idx_correlations_user`
- **Category filtering**: `idx_foods_category`, `idx_medications_category`
- **Clinical data**: `idx_bowel_movements_bristol`, `idx_symptom_logs_symptom_date`

### Query Optimization
- **Single Database Instance**: Reused connection through singleton pattern (no connection pooling needed)
- **WAL Mode**: Write-Ahead Logging enabled for better concurrent read/write performance
- **Prepared Statements**: Used in seeding operations (`server/src/database/init.ts:152-207`) for better performance
- **Foreign Key Constraints**: Enabled for data integrity but temporarily disabled during seeding
- **GROUP BY Optimization**: Used to eliminate duplicates in foods and medications queries

### Database Configuration
- **Connection Settings**: `PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL`
- **File Location**: Environment configurable via `DB_PATH` or defaults to working directory
- **Auto-initialization**: Schema creation and default data seeding on startup

## Environment Configuration
- **Database Path**: `DB_PATH` environment variable or defaults to `health_tracker.db` in working directory
- **Authentication**: 
  - `AUTH_PASSWORD_HASH`: Hashed password for single user
  - `AUTH_USERNAME`: Username (defaults to 'user')
  - `AUTH_EMAIL`: User email (defaults to `${username}@healthtracker.local`)
  - `AUTH_DISPLAY_NAME`: Display name (defaults to 'Health Tracker User')
- **JWT Secret**: `JWT_SECRET` for token signing (defaults to development key)

## Default Data Seeding (`server/src/database/init.ts:40-224`)
The application seeds default data on initialization:
- **User Account**: Creates user with id=1 using environment variables
- **Symptom Categories**: 4 default categories (Digestive, Energy, Mood, Pain) with colors
- **Sleep Tracking**: Dedicated sleep_logs table for specialized chronic dry eye management
- **Default Symptoms**: ~20 pre-defined symptoms across categories
- **Food Database**: ~30 common foods with allergen information
- **Medication Database**: ~10 common medications with dosage forms
- **Seeding Process**: Uses prepared statements with foreign keys temporarily disabled

## Testing Considerations
- Database location configurable for test environments
- Schema auto-initialization on startup prevents missing table errors
- Default data seeding provides realistic test data
- Single-user design simplifies authentication testing
- All routes require JWT authentication except login endpoint