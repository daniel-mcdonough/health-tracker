#!/usr/bin/env node

import { database } from '../database/init.js';
import sqlite3 from 'sqlite3';
import { format, subDays, addHours, startOfDay, setHours, setMinutes } from 'date-fns';

interface MockDataConfig {
  daysToGenerate: number;
  userId: number;
  clearExisting: boolean;
  correlationPatterns: CorrelationPattern[];
}

interface CorrelationPattern {
  foodNames: string[];
  symptomNames: string[];
  correlationStrength: number; // 0-1, where 1 is strong positive correlation
  timeDelayHours: number; // Hours after eating that symptoms appear
  baseSymptomSeverity: number; // 1-10
  severityIncrease: number; // How much severity increases with trigger food
}

class MockDataGenerator {
  private db: sqlite3.Database;
  private foodIdMap: Map<string, number> = new Map();
  private symptomIdMap: Map<string, number> = new Map();
  private random: () => number;

  constructor(databaseInstance: any, seed?: number) {
    this.db = databaseInstance.getDatabase();
    // Seeded random for reproducible results
    this.random = this.createSeededRandom(seed || 12345);
  }

  private createSeededRandom(seed: number) {
    return () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(this.random() * array.length)];
  }

  private async loadFoodAndSymptomIds(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load food IDs
      this.db.all('SELECT id, name FROM foods', (err, foods: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        foods.forEach(food => {
          this.foodIdMap.set(food.name, food.id);
        });

        // Load symptom IDs
        this.db.all('SELECT id, name FROM symptoms WHERE user_id = 1', (err, symptoms: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          symptoms.forEach(symptom => {
            this.symptomIdMap.set(symptom.name, symptom.id);
          });

          resolve();
        });
      });
    });
  }

  private async clearExistingData(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Clear in reverse dependency order
        this.db.run('DELETE FROM food_symptom_correlations WHERE user_id = ?', [userId]);
        this.db.run('DELETE FROM meal_foods WHERE meal_id IN (SELECT id FROM meals WHERE user_id = ?)', [userId]);
        this.db.run('DELETE FROM meals WHERE user_id = ?', [userId]);
        this.db.run('DELETE FROM symptom_logs WHERE user_id = ?', [userId]);
        this.db.run('DELETE FROM bowel_movements WHERE user_id = ?', [userId]);
        this.db.run('DELETE FROM medication_logs WHERE user_id = ?', [userId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  private generateMealTime(mealType: string, date: Date): Date {
    const mealDate = new Date(date);
    
    switch (mealType) {
      case 'breakfast':
        return setMinutes(setHours(mealDate, 7 + this.randomInt(0, 2)), this.randomInt(0, 59));
      case 'lunch':
        return setMinutes(setHours(mealDate, 11 + this.randomInt(0, 2)), this.randomInt(0, 59));
      case 'dinner':
        return setMinutes(setHours(mealDate, 17 + this.randomInt(0, 2)), this.randomInt(0, 59));
      case 'snack':
        return setMinutes(setHours(mealDate, 14 + this.randomInt(0, 6)), this.randomInt(0, 59));
      default:
        return setMinutes(setHours(mealDate, 12), 0);
    }
  }

  private async generateMeals(userId: number, date: Date): Promise<Map<string, number[]>> {
    const mealFoodMap = new Map<string, number[]>();
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    
    // Add random snacks
    if (this.random() > 0.3) {
      mealTypes.push('snack');
    }

    const dateStr = format(date, 'yyyy-MM-dd');

    for (const mealType of mealTypes) {
      const mealTime = this.generateMealTime(mealType, date);
      const mealTimeStr = format(mealTime, 'yyyy-MM-dd HH:mm:ss');
      
      // Select random foods for this meal
      const availableFoods = Array.from(this.foodIdMap.values());
      const numFoods = this.randomInt(1, 4);
      const selectedFoodIds: number[] = [];
      
      for (let i = 0; i < numFoods; i++) {
        selectedFoodIds.push(this.randomChoice(availableFoods));
      }

      // Insert meal
      await new Promise<number>((resolve, reject) => {
        this.db.run(
          'INSERT INTO meals (user_id, meal_type, meal_time, date) VALUES (?, ?, ?, ?)',
          [userId, mealType, mealTimeStr, dateStr],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }).then(async (mealId) => {
        // Insert meal foods
        for (const foodId of selectedFoodIds) {
          await new Promise((resolve, reject) => {
            const portionSizes = ['1 cup', '1/2 cup', '1 serving', '2 pieces', '100g'];
            this.db.run(
              'INSERT INTO meal_foods (meal_id, food_id, portion_size) VALUES (?, ?, ?)',
              [mealId, foodId, this.randomChoice(portionSizes)],
              (err) => {
                if (err) reject(err);
                else resolve(undefined);
              }
            );
          });
        }
        
        mealFoodMap.set(`${mealType}_${mealTimeStr}`, selectedFoodIds);
      });
    }

    return mealFoodMap;
  }

  private async generateSymptomLogs(
    userId: number,
    date: Date,
    mealFoodMap: Map<string, number[]>,
    patterns: CorrelationPattern[]
  ): Promise<void> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const symptomSeverities = new Map<number, number>();

    // Initialize base severities for all symptoms
    Array.from(this.symptomIdMap.values()).forEach(symptomId => {
      // Random baseline severity (some days no symptoms)
      if (this.random() > 0.6) {
        symptomSeverities.set(symptomId, this.randomInt(1, 3));
      }
    });

    // Apply correlation patterns
    for (const pattern of patterns) {
      // Check if any trigger foods were consumed
      let triggerFoodEaten = false;
      let earliestMealTime: Date | null = null;

      for (const [mealKey, foodIds] of mealFoodMap.entries()) {
        for (const foodName of pattern.foodNames) {
          const foodId = this.foodIdMap.get(foodName);
          if (foodId && foodIds.includes(foodId)) {
            triggerFoodEaten = true;
            const mealTimeStr = mealKey.split('_').slice(1).join('_');
            const mealTime = new Date(mealTimeStr);
            if (!earliestMealTime || mealTime < earliestMealTime) {
              earliestMealTime = mealTime;
            }
          }
        }
      }

      // If trigger food was eaten, increase symptom severity based on correlation
      if (triggerFoodEaten && earliestMealTime) {
        for (const symptomName of pattern.symptomNames) {
          const symptomId = this.symptomIdMap.get(symptomName);
          if (symptomId) {
            // Apply correlation with some randomness
            if (this.random() < pattern.correlationStrength) {
              const currentSeverity = symptomSeverities.get(symptomId) || pattern.baseSymptomSeverity;
              const newSeverity = Math.min(10, currentSeverity + pattern.severityIncrease + this.randomInt(-1, 1));
              symptomSeverities.set(symptomId, newSeverity);
            }
          }
        }
      }
    }

    // Log symptoms at different times of day
    const logTimes = [
      { hour: 9, minute: 0 },
      { hour: 15, minute: 0 },
      { hour: 21, minute: 0 }
    ];

    for (const logTime of logTimes) {
      // Only log if there are symptoms to report
      const symptomsToLog = Array.from(symptomSeverities.entries())
        .filter(([_, severity]) => severity > 0);
      
      if (symptomsToLog.length > 0 && this.random() > 0.2) { // 80% chance of logging when symptoms present
        for (const [symptomId, severity] of symptomsToLog) {
          const time = `${String(logTime.hour).padStart(2, '0')}:${String(logTime.minute).padStart(2, '0')}`;
          const timestamp = format(setMinutes(setHours(date, logTime.hour), logTime.minute), 'yyyy-MM-dd HH:mm:ss');
          
          await new Promise((resolve, reject) => {
            this.db.run(
              'INSERT OR IGNORE INTO symptom_logs (user_id, symptom_id, severity, date, time, logged_at) VALUES (?, ?, ?, ?, ?, ?)',
              [userId, symptomId, severity, dateStr, time, timestamp],
              (err) => {
                if (err) reject(err);
                else resolve(undefined);
              }
            );
          });
        }
      }
    }
  }

  private async generateBowelMovements(userId: number, date: Date): Promise<void> {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // 0-3 bowel movements per day
    const numMovements = this.randomInt(0, 3);
    
    for (let i = 0; i < numMovements; i++) {
      const hour = this.randomInt(6, 22);
      const minute = this.randomInt(0, 59);
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      
      await new Promise((resolve, reject) => {
        this.db.run(
          `INSERT INTO bowel_movements 
           (user_id, date, time, bristol_scale, color, size, urgency, ease_of_passage, blood_present, mucus_present) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            dateStr,
            time,
            this.randomInt(1, 7), // bristol_scale
            this.randomChoice(['brown', 'yellow', 'green']), // color
            this.randomChoice(['small', 'medium', 'large']), // size
            this.randomInt(1, 5), // urgency
            this.randomInt(1, 5), // ease_of_passage
            this.random() > 0.95 ? 1 : 0, // blood_present (rare)
            this.random() > 0.9 ? 1 : 0 // mucus_present (uncommon)
          ],
          (err) => {
            if (err) reject(err);
            else resolve(undefined);
          }
        );
      });
    }
  }

  public async generate(config: MockDataConfig): Promise<void> {
    console.log('Starting mock data generation...');
    
    // Load food and symptom IDs
    await this.loadFoodAndSymptomIds();
    console.log(`Loaded ${this.foodIdMap.size} foods and ${this.symptomIdMap.size} symptoms`);

    // Clear existing data if requested
    if (config.clearExisting) {
      console.log('Clearing existing data...');
      await this.clearExistingData(config.userId);
    }

    // Generate data for each day
    const today = new Date();
    for (let dayOffset = config.daysToGenerate - 1; dayOffset >= 0; dayOffset--) {
      const currentDate = startOfDay(subDays(today, dayOffset));
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      console.log(`Generating data for ${dateStr}...`);
      
      // Generate meals and get the foods consumed
      const mealFoodMap = await this.generateMeals(config.userId, currentDate);
      
      // Generate symptom logs based on correlation patterns
      await this.generateSymptomLogs(config.userId, currentDate, mealFoodMap, config.correlationPatterns);
      
      // Generate bowel movements
      await this.generateBowelMovements(config.userId, currentDate);
    }

    console.log('Mock data generation complete!');
  }
}

// Main execution
async function main() {
  try {
    // Database instance is already created, just need to initialize
    await database.initialize();
    
    const generator = new MockDataGenerator(database);
    
    // Define correlation patterns for testing
    const correlationPatterns: CorrelationPattern[] = [
      // Strong positive correlation: Dairy causes digestive issues
      {
        foodNames: ['Cow Milk', 'Cheese', 'Yogurt'],
        symptomNames: ['Bloating', 'Stomach Pain', 'Nausea'],
        correlationStrength: 0.8,
        timeDelayHours: 2,
        baseSymptomSeverity: 2,
        severityIncrease: 5
      },
      // Moderate positive correlation: Gluten causes fatigue
      {
        foodNames: ['Wheat Bread', 'Oats'],
        symptomNames: ['Fatigue', 'Brain Fog'],
        correlationStrength: 0.6,
        timeDelayHours: 4,
        baseSymptomSeverity: 3,
        severityIncrease: 3
      },
      // Weak positive correlation: Nightshades cause joint pain
      {
        foodNames: ['Tomatoes'],
        symptomNames: ['Joint Pain'],
        correlationStrength: 0.4,
        timeDelayHours: 6,
        baseSymptomSeverity: 2,
        severityIncrease: 2
      },
      // Negative correlation: Salmon reduces inflammation symptoms
      {
        foodNames: ['Salmon'],
        symptomNames: ['Joint Pain', 'Muscle Aches'],
        correlationStrength: 0.5,
        timeDelayHours: 8,
        baseSymptomSeverity: 4,
        severityIncrease: -2 // Negative means it reduces symptoms
      }
    ];

    const config: MockDataConfig = {
      daysToGenerate: parseInt(process.argv[2] || '90'), // Default 90 days
      userId: 1,
      clearExisting: process.argv.includes('--clear'),
      correlationPatterns
    };

    console.log(`Generating ${config.daysToGenerate} days of mock data...`);
    if (config.clearExisting) {
      console.log('Will clear existing data first.');
    }

    await generator.generate(config);
    
    // Run correlation analysis
    console.log('\nRunning correlation analysis...');
    const { CorrelationService } = await import('../services/correlationService.js');
    const service = new CorrelationService(database);
    
    const results = await service.calculateCorrelations(
      config.userId,
      config.daysToGenerate,
      24, // 24 hour time window
      0.3 // minimum confidence
    );
    
    console.log(`\nCalculated ${results.length} correlations`);
    
    // Show top correlations
    const topPositive = results
      .filter(r => r.correlationScore > 0)
      .slice(0, 5);
    
    const topNegative = results
      .filter(r => r.correlationScore < 0)
      .slice(0, 5);
    
    if (topPositive.length > 0) {
      console.log('\nTop Positive Correlations (potential triggers):');
      for (const corr of topPositive) {
        const food = await new Promise<any>((resolve) => {
          database.getDatabase().get('SELECT name FROM foods WHERE id = ?', [corr.foodId], (err, row) => {
            resolve(row);
          });
        });
        const symptom = await new Promise<any>((resolve) => {
          database.getDatabase().get('SELECT name FROM symptoms WHERE id = ?', [corr.symptomId], (err, row) => {
            resolve(row);
          });
        });
        
        console.log(`  ${food?.name} → ${symptom?.name}: ${corr.correlationScore.toFixed(3)} (confidence: ${corr.confidenceLevel.toFixed(2)}, n=${corr.sampleSize})`);
      }
    }
    
    if (topNegative.length > 0) {
      console.log('\nTop Negative Correlations (potential helpers):');
      for (const corr of topNegative) {
        const food = await new Promise<any>((resolve) => {
          database.getDatabase().get('SELECT name FROM foods WHERE id = ?', [corr.foodId], (err, row) => {
            resolve(row);
          });
        });
        const symptom = await new Promise<any>((resolve) => {
          database.getDatabase().get('SELECT name FROM symptoms WHERE id = ?', [corr.symptomId], (err, row) => {
            resolve(row);
          });
        });
        
        console.log(`  ${food?.name} ⊝ ${symptom?.name}: ${corr.correlationScore.toFixed(3)} (confidence: ${corr.confidenceLevel.toFixed(2)}, n=${corr.sampleSize})`);
      }
    }
    
    // Get insights
    const insights = await service.getCorrelationInsights(config.userId);
    console.log(`\nRisk Score: ${insights.riskScore.toFixed(1)}/100`);
    console.log('Recommendations:');
    insights.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { MockDataGenerator };
export type { MockDataConfig, CorrelationPattern };