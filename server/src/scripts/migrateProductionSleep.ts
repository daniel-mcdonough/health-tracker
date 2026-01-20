#!/usr/bin/env node

import { Database } from '../database/init.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrateProductionSleep() {
  const dbPath = process.argv[2];
  if (!dbPath) {
    console.error('Usage: npm run migrate-production-sleep <path-to-production-db>');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('PRODUCTION SLEEP MIGRATION');
  console.log('='.repeat(80));
  console.log(`Database: ${dbPath}\n`);
  
  const database = new Database(dbPath);
  
  try {
    await database.initialize();
    const db = database.getDatabase();
    
    // Step 1: Check current state
    console.log('📊 Checking current database state...');
    
    const sleepCategoryCount = await new Promise<number>((resolve) => {
      db.get("SELECT COUNT(*) as count FROM symptom_categories WHERE name = 'Sleep'", (err, row: any) => {
        resolve(row?.count || 0);
      });
    });
    
    const sleepSymptomCount = await new Promise<number>((resolve) => {
      db.get(`
        SELECT COUNT(*) as count FROM symptoms 
        WHERE category_id IN (SELECT id FROM symptom_categories WHERE name = 'Sleep')
      `, (err, row: any) => {
        resolve(row?.count || 0);
      });
    });
    
    const sleepLogCount = await new Promise<number>((resolve) => {
      db.get(`
        SELECT COUNT(*) as count FROM symptom_logs 
        WHERE symptom_id IN (
          SELECT id FROM symptoms 
          WHERE category_id IN (SELECT id FROM symptom_categories WHERE name = 'Sleep')
        )
      `, (err, row: any) => {
        resolve(row?.count || 0);
      });
    });
    
    const sleepTableExists = await new Promise<boolean>((resolve) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sleep_logs'", (err, row) => {
        resolve(!!row);
      });
    });
    
    console.log(`  • Sleep categories: ${sleepCategoryCount}`);
    console.log(`  • Sleep symptoms: ${sleepSymptomCount}`);
    console.log(`  • Sleep logs: ${sleepLogCount}`);
    console.log(`  • sleep_logs table exists: ${sleepTableExists}`);
    
    // Step 2: Remove old sleep data if it exists
    if (sleepCategoryCount > 0 || sleepSymptomCount > 0 || sleepLogCount > 0) {
      console.log('\n🗑️ Removing old sleep data...');
      
      await new Promise<void>((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Delete sleep-related logs
            db.run(`
              DELETE FROM symptom_logs 
              WHERE symptom_id IN (
                SELECT id FROM symptoms 
                WHERE category_id IN (SELECT id FROM symptom_categories WHERE name = 'Sleep')
              )
            `, function(err) {
              if (err) {
                console.error('Error deleting sleep logs:', err);
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              console.log(`  ✓ Deleted ${this.changes} sleep symptom logs`);
              
              // Delete sleep symptoms
              db.run(`
                DELETE FROM symptoms 
                WHERE category_id IN (SELECT id FROM symptom_categories WHERE name = 'Sleep')
              `, function(err) {
                if (err) {
                  console.error('Error deleting sleep symptoms:', err);
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                console.log(`  ✓ Deleted ${this.changes} sleep symptoms`);
                
                // Delete sleep category
                db.run(`
                  DELETE FROM symptom_categories WHERE name = 'Sleep'
                `, function(err) {
                  if (err) {
                    console.error('Error deleting sleep category:', err);
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                  }
                  console.log(`  ✓ Deleted ${this.changes} sleep categories`);
                  
                  // Commit transaction
                  db.run('COMMIT', (err) => {
                    if (err) {
                      console.error('Error committing transaction:', err);
                      reject(err);
                      return;
                    }
                    console.log('  ✅ Old sleep data removed successfully');
                    resolve();
                  });
                });
              });
            });
          });
        });
      });
    } else {
      console.log('\n✅ No old sleep data found');
    }
    
    // Step 3: Add new sleep_logs table
    console.log('\n🏗️ Adding new sleep_logs table...');
    
    if (sleepTableExists) {
      console.log('  ⚠️ sleep_logs table already exists, skipping creation');
    } else {
      // Read the migration SQL
      const migrationSQL = readFileSync(
        join(__dirname, '../database/migrations/add_sleep_logs.sql'),
        'utf-8'
      );
      
      await new Promise<void>((resolve, reject) => {
        db.exec(migrationSQL, (err) => {
          if (err) {
            console.error('Error creating sleep_logs table:', err);
            reject(err);
          } else {
            console.log('  ✅ Successfully created sleep_logs table');
            resolve();
          }
        });
      });
    }
    
    // Step 4: Check if user exists, create if needed
    console.log('\n👤 Checking user exists...');
    
    const userExists = await new Promise<boolean>((resolve) => {
      db.get("SELECT id FROM users WHERE id = 1", (err, row) => {
        resolve(!!row);
      });
    });
    
    if (!userExists) {
      console.log('  • User not found, creating default user...');
      await new Promise<void>((resolve, reject) => {
        db.run(
          `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
           VALUES (1, 'derp@healthtracker.local', '$2b$10$defaulthash', 'Health Tracker User', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          function(err) {
            if (err) {
              console.error('Error creating user:', err);
              reject(err);
            } else {
              console.log('  ✅ Created default user');
              resolve();
            }
          }
        );
      });
    } else {
      console.log('  ✅ User exists');
    }
    
    // Step 5: Add new Sleep category for correlations
    console.log('\n📊 Adding new Sleep category for correlations...');
    
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO symptom_categories (user_id, name, description, color, is_default)
         VALUES (1, 'Sleep', 'Sleep-related symptoms for correlation analysis', '#3B82F6', 1)`,
        function(err) {
          if (err) {
            console.error('Error adding Sleep category:', err);
            reject(err);
          } else {
            if (this.changes > 0) {
              console.log('  ✅ Added Sleep category');
            } else {
              console.log('  ✅ Sleep category already exists');
            }
            resolve();
          }
        }
      );
    });
    
    // Add specific sleep-related symptoms for correlation
    const sleepSymptoms = [
      { name: 'Poor Sleep Quality', description: 'Overall poor sleep despite trying' },
      { name: 'Insomnia', description: 'Could not fall asleep despite trying' },
      { name: 'Sleep Disruptions', description: 'Unusual wakings beyond baseline' }
    ];
    
    for (const symptom of sleepSymptoms) {
      await new Promise<void>((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO symptoms (user_id, category_id, name, description)
           SELECT 1, id, ?, ? FROM symptom_categories 
           WHERE name = 'Sleep' AND user_id = 1`,
          [symptom.name, symptom.description],
          function(err) {
            if (err) {
              console.error(`Error adding symptom ${symptom.name}:`, err);
              reject(err);
            } else {
              if (this.changes > 0) {
                console.log(`  ✅ Added symptom: ${symptom.name}`);
              } else {
                console.log(`  ✅ Symptom already exists: ${symptom.name}`);
              }
              resolve();
            }
          }
        );
      });
    }
    
    // Step 6: Verify final state
    console.log('\n🔍 Verifying migration...');
    
    const finalSleepTableExists = await new Promise<boolean>((resolve) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sleep_logs'", (err, row) => {
        resolve(!!row);
      });
    });
    
    const finalSleepCategoryCount = await new Promise<number>((resolve) => {
      db.get("SELECT COUNT(*) as count FROM symptom_categories WHERE name = 'Sleep'", (err, row: any) => {
        resolve(row?.count || 0);
      });
    });
    
    const finalSleepSymptomCount = await new Promise<number>((resolve) => {
      db.get(`
        SELECT COUNT(*) as count FROM symptoms 
        WHERE category_id IN (SELECT id FROM symptom_categories WHERE name = 'Sleep')
      `, (err, row: any) => {
        resolve(row?.count || 0);
      });
    });
    
    console.log(`  • sleep_logs table exists: ${finalSleepTableExists}`);
    console.log(`  • Sleep categories: ${finalSleepCategoryCount}`);
    console.log(`  • Sleep symptoms for correlation: ${finalSleepSymptomCount}`);
    
    if (finalSleepTableExists && finalSleepCategoryCount === 1 && finalSleepSymptomCount >= 3) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\nProduction database is now compatible with new sleep tracking system.');
      console.log('\nYou can now:');
      console.log('  • Use the new Sleep Log page');
      console.log('  • Track dry eye severity variations');
      console.log('  • Filter sleep correlations by bedtime behavior');
      console.log('  • Find meaningful food-sleep relationships');
    } else {
      console.log('\n⚠️ Migration may have issues. Please check manually.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run the migration
migrateProductionSleep().catch(console.error);