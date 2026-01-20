import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Database opened successfully at:', dbPath);
      }
    });
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA journal_mode = WAL'); // Write-Ahead Logging for better concurrency
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      
      this.db.exec(schema, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async seedDefaultData(): Promise<void> {
    const defaultCategories = [
      { name: 'Digestive', description: 'Stomach, intestinal, and digestive issues', color: '#F59E0B', isDefault: 1 },
      { name: 'Energy', description: 'Fatigue, energy levels, and alertness', color: '#10B981', isDefault: 1 },
      { name: 'Mood', description: 'Emotional state and mental well-being', color: '#8B5CF6', isDefault: 1 },
      { name: 'Pain', description: 'Physical pain and discomfort', color: '#EF4444', isDefault: 1 }
    ];

    const defaultSymptoms = [
      // Digestive
      { category: 'Digestive', name: 'Bloating', description: 'Abdominal bloating and gas' },
      { category: 'Digestive', name: 'Nausea', description: 'Feeling sick to stomach' },
      { category: 'Digestive', name: 'Pre-nausea', description: 'Early warning feeling before nausea' },
      { category: 'Digestive', name: 'Dry Heaving', description: 'Retching without bringing anything up' },
      { category: 'Digestive', name: 'Vomiting', description: 'Actually throwing up' },
      { category: 'Digestive', name: 'Stomach Pain', description: 'Abdominal pain or cramping' },
      { category: 'Digestive', name: 'Diarrhea', description: 'Loose or frequent bowel movements' },
      { category: 'Digestive', name: 'Constipation', description: 'Difficulty with bowel movements' },
      { category: 'Digestive', name: 'Acid Reflux', description: 'Heartburn or acid rising into throat' },
      
      // Energy
      { category: 'Energy', name: 'Fatigue', description: 'General tiredness and low energy' },
      { category: 'Energy', name: 'Brain Fog', description: 'Mental cloudiness and difficulty concentrating' },
      { category: 'Energy', name: 'Alertness', description: 'Mental sharpness and focus' },
      { category: 'Energy', name: 'Feverish Feeling', description: 'Feeling warm or flushed without actual fever' },
      
      // Mood
      { category: 'Mood', name: 'Anxiety', description: 'Feelings of worry or nervousness' },
      { category: 'Mood', name: 'Irritability', description: 'Easily annoyed or frustrated' },
      { category: 'Mood', name: 'Mood Swings', description: 'Rapid changes in emotional state' },
      
      // Pain
      { category: 'Pain', name: 'Headache', description: 'Head pain or pressure' },
      { category: 'Pain', name: 'Joint Pain', description: 'Pain in joints and connective tissue' },
      { category: 'Pain', name: 'Muscle Aches', description: 'General muscle soreness' },
      { category: 'Pain', name: 'Nasal Swelling', description: 'Swelling or congestion in nasal passages' },
      { category: 'Pain', name: 'Dry Eye', description: 'Eyes feeling dry, gritty, or irritated' },
      { category: 'Pain', name: 'Right Upper Quadrant Pain', description: 'Pain in the upper right area of the abdomen' }
    ];

    const defaultFoods = [
      // Grains
      { name: 'Wheat Bread', category: 'grain', allergens: ['gluten', 'wheat'] },
      { name: 'White Rice', category: 'grain', allergens: [] },
      { name: 'Oats', category: 'grain', allergens: ['gluten'] },
      { name: 'Quinoa', category: 'grain', allergens: [] },
      
      // Dairy
      { name: 'Cow Milk', category: 'dairy', allergens: ['dairy', 'lactose'] },
      { name: 'Cheese', category: 'dairy', allergens: ['dairy', 'lactose'] },
      { name: 'Yogurt', category: 'dairy', allergens: ['dairy', 'lactose'] },
      
      // Proteins
      { name: 'Chicken', category: 'protein', allergens: [] },
      { name: 'Beef', category: 'protein', allergens: [] },
      { name: 'Eggs', category: 'protein', allergens: ['eggs'] },
      { name: 'Salmon', category: 'protein', allergens: ['fish'] },
      { name: 'Peanuts', category: 'protein', allergens: ['peanuts', 'nuts'] },
      
      // Vegetables
      { name: 'Tomatoes', category: 'vegetable', allergens: ['nightshades'] },
      { name: 'Onions', category: 'vegetable', allergens: [] },
      { name: 'Garlic', category: 'vegetable', allergens: [] },
      { name: 'Broccoli', category: 'vegetable', allergens: [] },
      { name: 'Spinach', category: 'vegetable', allergens: [] },
      
      // Fruits
      { name: 'Apples', category: 'fruit', allergens: [] },
      { name: 'Bananas', category: 'fruit', allergens: [] },
      { name: 'Oranges', category: 'fruit', allergens: ['citrus'] },
      { name: 'Strawberries', category: 'fruit', allergens: [] }
    ];

    const defaultMedications = [
      // Supplements
      { name: 'Magnesium Citrate', scientificName: 'Magnesium Citrate', category: 'supplement', dosageForms: ['pill', 'liquid'] },
      { name: 'Kratom', scientificName: 'Mitragyna speciosa', category: 'supplement', dosageForms: ['pill', 'capsule'] },
      
      // H1 Antihistamines
      { name: 'Benadryl', scientificName: 'Diphenhydramine', category: 'antihistamine_h1', dosageForms: ['pill', 'liquid', 'capsule'] },
      { name: 'Claritin', scientificName: 'Loratadine', category: 'antihistamine_h1', dosageForms: ['pill'] },
      { name: 'Zyrtec', scientificName: 'Cetirizine', category: 'antihistamine_h1', dosageForms: ['pill', 'liquid'] },
      { name: 'Allegra', scientificName: 'Fexofenadine', category: 'antihistamine_h1', dosageForms: ['pill'] },
      { name: 'Xyzal', scientificName: 'Levocetirizine', category: 'antihistamine_h1', dosageForms: ['pill', 'liquid'] },
      
      // H2 Antihistamines
      { name: 'Pepcid', scientificName: 'Famotidine', category: 'antihistamine_h2', dosageForms: ['pill'] },
      { name: 'Zantac', scientificName: 'Ranitidine', category: 'antihistamine_h2', dosageForms: ['pill', 'liquid'] },
      { name: 'Tagamet', scientificName: 'Cimetidine', category: 'antihistamine_h2', dosageForms: ['pill'] },
      { name: 'Axid', scientificName: 'Nizatidine', category: 'antihistamine_h2', dosageForms: ['pill', 'capsule'] }
    ];

    return new Promise((resolve, reject) => {
      // Disable foreign key constraints temporarily
      this.db.run('PRAGMA foreign_keys = OFF', (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.db.serialize(() => {
          // First, insert the default user (matches the auth system)
          const username = process.env.AUTH_USERNAME || 'user';
          const passwordHash = process.env.AUTH_PASSWORD_HASH || '';
          const userEmail = process.env.AUTH_EMAIL || `${username}@healthtracker.local`;
          const userDisplayName = process.env.AUTH_DISPLAY_NAME || 'Health Tracker User';
          
          if (!passwordHash) {
            console.warn('Warning: AUTH_PASSWORD_HASH not set. Authentication will not work.');
          }
          
          const userStmt = this.db.prepare(`
            INSERT OR IGNORE INTO users (id, email, password_hash, name)
            VALUES (1, ?, ?, ?)
          `);
          userStmt.run([userEmail, passwordHash, userDisplayName]);
          userStmt.finalize();

          // Insert default user settings for user_id = 1
          const userSettingsStmt = this.db.prepare(`
            INSERT OR IGNORE INTO user_settings 
            (user_id, timezone, reminder_enabled, reminder_times, correlation_sensitivity, data_retention_days, dark_mode)
            VALUES (1, ?, ?, ?, ?, ?, ?)
          `);
          userSettingsStmt.run([
            'America/New_York',  // Default to Eastern time
            1,                   // Enable reminders by default
            '["09:00","21:00"]', // Default reminder times (JSON string)
            0.3,                 // Default correlation sensitivity
            365,                 // Default data retention days (1 year)
            0                    // Default to light mode
          ]);
          userSettingsStmt.finalize();

          // Insert default categories for user_id = 1 (the single user)
          const categoryStmt = this.db.prepare(`
            INSERT OR IGNORE INTO symptom_categories (user_id, name, description, color, is_default)
            VALUES (1, ?, ?, ?, ?)
          `);

          defaultCategories.forEach(cat => {
            categoryStmt.run([cat.name, cat.description, cat.color, cat.isDefault]);
          });
          categoryStmt.finalize();

          // Insert default symptoms
          const symptomStmt = this.db.prepare(`
            INSERT OR IGNORE INTO symptoms (user_id, category_id, name, description)
            SELECT 1, id, ?, ? FROM symptom_categories 
            WHERE name = ? AND user_id = 1
          `);

          defaultSymptoms.forEach(symptom => {
            symptomStmt.run([symptom.name, symptom.description, symptom.category]);
          });
          symptomStmt.finalize();

          // Insert default foods
          const foodStmt = this.db.prepare(`
            INSERT OR IGNORE INTO foods (user_id, name, category, common_allergens, is_custom)
            VALUES (NULL, ?, ?, ?, 0)
          `);

          defaultFoods.forEach(food => {
            foodStmt.run([food.name, food.category, JSON.stringify(food.allergens)]);
          });
          
          foodStmt.finalize((err) => {
            if (err) {
              reject(err);
              return;
            }

            // Insert default medications
            const medicationStmt = this.db.prepare(`
              INSERT OR IGNORE INTO medications (user_id, name, scientific_name, category, dosage_forms, is_custom)
              VALUES (NULL, ?, ?, ?, ?, 0)
            `);

            defaultMedications.forEach(med => {
              medicationStmt.run([med.name, med.scientificName, med.category, JSON.stringify(med.dosageForms)]);
            });
            
            medicationStmt.finalize((err) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Re-enable foreign key constraints
              this.db.run('PRAGMA foreign_keys = ON', (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          });
        });
      });
    });
  }

  getDatabase(): sqlite3.Database {
    return this.db;
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Use absolute path to ensure database is created in the correct location
const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'health_tracker.db');
export const database = new Database(DB_PATH);