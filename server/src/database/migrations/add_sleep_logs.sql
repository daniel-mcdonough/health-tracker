-- Add sleep_logs table for dedicated sleep tracking
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

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_dry_eye ON sleep_logs(dry_eye_severity);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_on_time ON sleep_logs(went_to_bed_on_time);