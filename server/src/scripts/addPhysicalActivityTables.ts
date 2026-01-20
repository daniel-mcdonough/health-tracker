import sqlite3 from 'sqlite3';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'health_tracker.db');

console.log('Adding physical activity tables to database...');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

const migrationSQL = `
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
`;

// Seed data for default physical activities
const seedActivities = [
  // Cardio
  { name: 'Walking', category: 'cardio', met_value: 3.5 },
  { name: 'Running', category: 'cardio', met_value: 8.0 },
  { name: 'Cycling', category: 'cardio', met_value: 6.0 },
  { name: 'Swimming', category: 'cardio', met_value: 7.0 },
  { name: 'Elliptical', category: 'cardio', met_value: 5.0 },
  { name: 'Rowing', category: 'cardio', met_value: 6.0 },
  { name: 'Jump Rope', category: 'cardio', met_value: 11.0 },
  { name: 'Dancing', category: 'cardio', met_value: 4.5 },
  
  // Strength
  { name: 'Weight Training', category: 'strength', met_value: 3.5 },
  { name: 'Bodyweight Exercises', category: 'strength', met_value: 3.5 },
  { name: 'Resistance Bands', category: 'strength', met_value: 3.0 },
  { name: 'CrossFit', category: 'strength', met_value: 8.0 },
  
  // Flexibility
  { name: 'Yoga', category: 'flexibility', met_value: 2.5 },
  { name: 'Pilates', category: 'flexibility', met_value: 3.0 },
  { name: 'Stretching', category: 'flexibility', met_value: 2.0 },
  { name: 'Tai Chi', category: 'flexibility', met_value: 3.0 },
  
  // Sports
  { name: 'Basketball', category: 'sports', met_value: 6.5 },
  { name: 'Soccer', category: 'sports', met_value: 7.0 },
  { name: 'Tennis', category: 'sports', met_value: 7.0 },
  { name: 'Golf', category: 'sports', met_value: 3.5 },
  { name: 'Volleyball', category: 'sports', met_value: 4.0 },
  { name: 'Baseball', category: 'sports', met_value: 5.0 },
  { name: 'Football', category: 'sports', met_value: 8.0 },
  
  // Recreation
  { name: 'Hiking', category: 'recreation', met_value: 6.0 },
  { name: 'Rock Climbing', category: 'recreation', met_value: 8.0 },
  { name: 'Kayaking', category: 'recreation', met_value: 5.0 },
  { name: 'Skateboarding', category: 'recreation', met_value: 5.0 },
  { name: 'Gardening', category: 'recreation', met_value: 3.5 },
  
  // Other
  { name: 'House Cleaning', category: 'other', met_value: 3.0 },
  { name: 'Yard Work', category: 'other', met_value: 4.0 },
  { name: 'Physical Therapy', category: 'other', met_value: 2.0 }
];

db.serialize(() => {
  // Run migration
  db.exec(migrationSQL, (err) => {
    if (err) {
      console.error('Error running migration:', err);
      process.exit(1);
    }
    console.log('✓ Physical activity tables created successfully');
    
    // Insert seed data
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO physical_activities (user_id, name, category, met_value, is_custom)
      VALUES (NULL, ?, ?, ?, 0)
    `);
    
    seedActivities.forEach(activity => {
      stmt.run([activity.name, activity.category, activity.met_value], (err) => {
        if (err && !err.message.includes('UNIQUE constraint failed')) {
          console.error(`Error inserting activity ${activity.name}:`, err);
        }
      });
    });
    
    stmt.finalize(() => {
      console.log(`✓ Inserted ${seedActivities.length} default physical activities`);
      
      // Verify the migration
      db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'physical_%'", (err, tables: any[]) => {
        if (err) {
          console.error('Error verifying tables:', err);
        } else {
          console.log('✓ Verified tables:', tables.map((t: any) => t.name).join(', '));
        }
        
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          }
          console.log('✓ Migration completed successfully');
          process.exit(0);
        });
      });
    });
  });
});