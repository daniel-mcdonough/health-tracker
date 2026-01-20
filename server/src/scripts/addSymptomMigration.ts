#!/usr/bin/env node

import { Database } from '../database/init.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function addRightUpperQuadrantPainSymptom() {
  const dbPath = process.argv[2];
  if (!dbPath) {
    console.error('Usage: npm run add-ruq-symptom <path-to-production-db>');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('ADD RIGHT UPPER QUADRANT PAIN SYMPTOM MIGRATION');
  console.log('='.repeat(80));
  console.log(`Database: ${dbPath}\n`);
  
  const database = new Database(dbPath);
  
  try {
    await database.initialize();
    const db = database.getDatabase();
    
    // Step 1: Check current state
    console.log('📊 Checking current database state...');
    
    const painCategoryExists = await new Promise<boolean>((resolve) => {
      db.get("SELECT id FROM symptom_categories WHERE name = 'Pain' AND user_id = 1", (err, row) => {
        resolve(!!row);
      });
    });
    
    if (!painCategoryExists) {
      console.log('❌ Pain category not found. Database may not be properly initialized.');
      process.exit(1);
    }
    
    const symptomExists = await new Promise<boolean>((resolve) => {
      db.get(`
        SELECT s.id FROM symptoms s
        JOIN symptom_categories sc ON s.category_id = sc.id
        WHERE s.name = 'Right Upper Quadrant Pain' 
        AND sc.name = 'Pain' 
        AND s.user_id = 1
      `, (err, row) => {
        resolve(!!row);
      });
    });
    
    console.log(`  • Pain category exists: ${painCategoryExists}`);
    console.log(`  • Right Upper Quadrant Pain symptom exists: ${symptomExists}`);
    
    // Step 2: Add symptom if it doesn't exist
    if (symptomExists) {
      console.log('\n✅ Right Upper Quadrant Pain symptom already exists in production');
    } else {
      console.log('\n🏗️ Adding Right Upper Quadrant Pain symptom...');
      
      await new Promise<void>((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          db.run(
            `INSERT INTO symptoms (user_id, category_id, name, description)
             SELECT 1, id, ?, ? FROM symptom_categories 
             WHERE name = 'Pain' AND user_id = 1`,
            ['Right Upper Quadrant Pain', 'Pain in the upper right area of the abdomen'],
            function(err) {
              if (err) {
                console.error('Error adding symptom:', err);
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              if (this.changes > 0) {
                console.log('  ✅ Successfully added Right Upper Quadrant Pain symptom');
                
                // Commit transaction
                db.run('COMMIT', (err) => {
                  if (err) {
                    console.error('Error committing transaction:', err);
                    reject(err);
                    return;
                  }
                  resolve();
                });
              } else {
                console.log('  ⚠️ No changes made - symptom may already exist');
                db.run('ROLLBACK');
                resolve();
              }
            }
          );
        });
      });
    }
    
    // Step 3: Verify final state
    console.log('\n🔍 Verifying migration...');
    
    const finalSymptomExists = await new Promise<boolean>((resolve) => {
      db.get(`
        SELECT s.id FROM symptoms s
        JOIN symptom_categories sc ON s.category_id = sc.id
        WHERE s.name = 'Right Upper Quadrant Pain' 
        AND sc.name = 'Pain' 
        AND s.user_id = 1
      `, (err, row) => {
        resolve(!!row);
      });
    });
    
    const symptomId = await new Promise<number | null>((resolve) => {
      db.get(`
        SELECT s.id FROM symptoms s
        JOIN symptom_categories sc ON s.category_id = sc.id
        WHERE s.name = 'Right Upper Quadrant Pain' 
        AND sc.name = 'Pain' 
        AND s.user_id = 1
      `, (err, row: any) => {
        resolve(row?.id || null);
      });
    });
    
    console.log(`  • Right Upper Quadrant Pain symptom exists: ${finalSymptomExists}`);
    if (symptomId) {
      console.log(`  • Symptom ID: ${symptomId}`);
    }
    
    if (finalSymptomExists) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\nProduction database now includes Right Upper Quadrant Pain symptom.');
      console.log('\nYou can now:');
      console.log('  • Log Right Upper Quadrant Pain symptoms');
      console.log('  • Analyze correlations with food intake');
      console.log('  • Track pain patterns over time');
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
addRightUpperQuadrantPainSymptom().catch(console.error);