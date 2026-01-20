-- Health Tracker Database Schema

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Symptom categories (predefined + custom)
CREATE TABLE IF NOT EXISTS symptom_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Individual symptoms within categories
CREATE TABLE IF NOT EXISTS symptoms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES symptom_categories(id) ON DELETE CASCADE
);

-- Daily symptom logs
CREATE TABLE IF NOT EXISTS symptom_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symptom_id INTEGER NOT NULL,
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
    time TIME NOT NULL,
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (symptom_id) REFERENCES symptoms(id) ON DELETE CASCADE,
    UNIQUE(user_id, symptom_id, date, time)
);

-- Food database (ingredients and common foods)
CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, -- NULL for system/default foods, user_id for custom foods
    name TEXT NOT NULL,
    category TEXT, -- 'protein', 'grain', 'vegetable', 'fruit', 'dairy', 'composed', etc.
    common_allergens TEXT, -- JSON array of common allergens
    description TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    is_composed BOOLEAN DEFAULT FALSE, -- TRUE for recipes/composed foods
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Composed food ingredients (for recipes like sandwiches, soups)
CREATE TABLE IF NOT EXISTS food_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    composed_food_id INTEGER NOT NULL, -- The recipe/composed food
    ingredient_food_id INTEGER NOT NULL, -- The individual ingredient
    quantity TEXT, -- e.g., "2 slices", "1 cup", "handful"
    notes TEXT, -- preparation notes
    FOREIGN KEY (composed_food_id) REFERENCES foods(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_food_id) REFERENCES foods(id) ON DELETE CASCADE
);

-- Meals tracking
CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    meal_time DATETIME NOT NULL,
    notes TEXT,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Food items consumed in each meal
CREATE TABLE IF NOT EXISTS meal_foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL,
    food_id INTEGER NOT NULL,
    portion_size TEXT, -- '1 cup', '2 slices', etc.
    portion_grams REAL, -- standardized weight if available
    preparation_method TEXT, -- 'raw', 'cooked', 'fried', etc.
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

-- Computed correlations between foods and symptoms
CREATE TABLE IF NOT EXISTS food_symptom_correlations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    food_id INTEGER NOT NULL,
    symptom_id INTEGER NOT NULL,
    correlation_score REAL NOT NULL, -- -1 to 1, negative means food reduces symptom
    confidence_level REAL NOT NULL, -- 0 to 1, statistical confidence
    sample_size INTEGER NOT NULL, -- number of data points used
    time_window_hours INTEGER NOT NULL, -- hours after eating to check for symptoms
    last_calculated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE,
    FOREIGN KEY (symptom_id) REFERENCES symptoms(id) ON DELETE CASCADE,
    UNIQUE(user_id, food_id, symptom_id, time_window_hours)
);

-- User settings and preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    reminder_enabled BOOLEAN DEFAULT TRUE,
    reminder_times TEXT, -- JSON array of reminder times
    correlation_sensitivity REAL DEFAULT 0.3, -- minimum correlation to show
    data_retention_days INTEGER DEFAULT 365,
    dark_mode BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bowel movement tracking
CREATE TABLE IF NOT EXISTS bowel_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    bristol_scale INTEGER NOT NULL CHECK (bristol_scale >= 1 AND bristol_scale <= 7),
    color TEXT NOT NULL CHECK (color IN ('brown', 'yellow', 'green', 'black', 'red', 'pale', 'clay')),
    size TEXT NOT NULL CHECK (size IN ('small', 'medium', 'large')),
    urgency INTEGER CHECK (urgency >= 1 AND urgency <= 5),
    ease_of_passage INTEGER CHECK (ease_of_passage >= 1 AND ease_of_passage <= 5),
    blood_present BOOLEAN DEFAULT FALSE,
    mucus_present BOOLEAN DEFAULT FALSE,
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Medications database
CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, -- NULL for system/default medications, user_id for custom medications
    name TEXT NOT NULL,
    scientific_name TEXT, -- Scientific/generic name
    category TEXT, -- 'antihistamine_h1', 'antihistamine_h2', 'supplement', 'other'
    dosage_forms TEXT, -- JSON array of available forms: ['pill', 'liquid', 'capsule']
    is_custom BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Medication logs
CREATE TABLE IF NOT EXISTS medication_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    medication_id INTEGER NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    dosage_amount REAL NOT NULL, -- Numeric amount (e.g., 1, 2.5, 0.25)
    dosage_unit TEXT NOT NULL, -- 'pills', 'ml', 'tsp', 'tbsp', 'mg', 'g'
    dosage_form TEXT NOT NULL, -- 'pill', 'liquid', 'capsule'
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_symptom_logs_user_date ON symptom_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_symptom_date ON symptom_logs(symptom_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_time ON meals(meal_time);
CREATE INDEX IF NOT EXISTS idx_correlations_user ON food_symptom_correlations(user_id);
CREATE INDEX IF NOT EXISTS idx_correlations_score ON food_symptom_correlations(correlation_score);
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
CREATE INDEX IF NOT EXISTS idx_foods_user ON foods(user_id);
CREATE INDEX IF NOT EXISTS idx_bowel_movements_user_date ON bowel_movements(user_id, date);
CREATE INDEX IF NOT EXISTS idx_bowel_movements_bristol ON bowel_movements(bristol_scale);
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_date ON medication_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_date ON medication_logs(medication_id, date);
CREATE INDEX IF NOT EXISTS idx_medications_category ON medications(category);
CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id);

-- Sleep logs table for dedicated sleep tracking
-- This tracks sleep quality factors that can be influenced by food
CREATE TABLE IF NOT EXISTS sleep_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    
    -- Behavioral factor (to filter out voluntary sleep deprivation)
    went_to_bed_on_time BOOLEAN DEFAULT FALSE,
    
    -- Dry eye tracking (variations from baseline)
    dry_eye_severity INTEGER CHECK (dry_eye_severity >= 1 AND dry_eye_severity <= 10),
    -- 5 = your normal baseline, <5 = better than usual, >5 = worse than usual
    
    -- Primary sleep disruption cause
    disruption_cause TEXT CHECK (disruption_cause IN ('dry_eye', 'digestive', 'pain', 'anxiety', 'other', 'none')),
    
    -- Sleep quality metrics (only when meaningful)
    difficulty_falling_asleep BOOLEAN DEFAULT FALSE,
    night_wakings INTEGER DEFAULT 0, -- Beyond the normal dry eye wakings
    morning_grogginess INTEGER CHECK (morning_grogginess >= 1 AND morning_grogginess <= 10),
    
    -- Next day impact
    next_day_fatigue INTEGER CHECK (next_day_fatigue >= 1 AND next_day_fatigue <= 10),
    
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date)
);

-- Sleep logs indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_dry_eye ON sleep_logs(dry_eye_severity);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_on_time ON sleep_logs(went_to_bed_on_time);

-- Physical activities table (predefined + custom)
CREATE TABLE IF NOT EXISTS physical_activities (
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

-- Physical activity logs
CREATE TABLE IF NOT EXISTS physical_activity_logs (
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_physical_activity_logs_user_date ON physical_activity_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_physical_activity_logs_date ON physical_activity_logs(date);
