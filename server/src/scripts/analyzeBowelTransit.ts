#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import path from 'path';

// Bowel transit time analysis for correlation purposes
async function analyzeBowelTransit() {
  const dbPath = path.join(process.cwd(), 'production_health_tracker.db');
  const db = new sqlite3.Database(dbPath);
  
  console.log('='.repeat(80));
  console.log('BOWEL MOVEMENT TRANSIT TIME ANALYSIS');
  console.log('='.repeat(80));
  
  // Analyze correlations at different time windows
  const timeWindows = [
    { hours: 12, label: '0-12 hours (rapid transit)' },
    { hours: 24, label: '12-24 hours (normal transit)' },
    { hours: 36, label: '24-36 hours (normal-slow transit)' },
    { hours: 48, label: '36-48 hours (slow transit)' },
    { hours: 72, label: '48-72 hours (very slow transit)' }
  ];
  
  for (const window of timeWindows) {
    await analyzeWindow(db, window.hours, window.label);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('KEY INSIGHTS FOR BOWEL MOVEMENT TRACKING');
  console.log('='.repeat(80));
  
  console.log(`
📊 The Challenge:
  • Bowel transit time varies: 12-72 hours typically
  • Individual variation is high
  • Same food can have different transit times
  
🎯 How the Algorithm Handles This:

1. **Multiple Time Window Analysis**
   - Test correlations at 24h, 36h, 48h windows
   - Find YOUR personal transit time pattern
   
2. **Bristol Scale as Severity Proxy**
   - Types 1-2: Constipation (severity ~7-8)
   - Types 3-5: Normal (severity ~3-5)  
   - Types 6-7: Diarrhea (severity ~7-9)
   
3. **Pattern Recognition Over Time**
   - Food on Monday → BM issues on Tuesday/Wednesday
   - Algorithm finds the strongest correlation window
   
4. **Aggregate Patterns Matter More**
   Example: If dairy consistently causes Type 6-7 BMs within 24-48h,
   the correlation emerges despite transit time variation

🔧 Recommendations for Better BM Correlation:

1. **Log Bristol Scale Consistently**
   - This is your "severity" metric
   - More important than exact timing
   
2. **Note Unusual Foods**
   - High-fat meals (slower transit)
   - High-fiber foods (faster transit)
   - Trigger foods you suspect
   
3. **Track for Patterns, Not Individual Events**
   - Need 10+ occurrences of a food
   - Look for consistency over weeks
   
4. **Consider Multi-Day Windows**
   - Today's BM might be from 2 days ago
   - Algorithm can test multiple windows

💡 Your Current Data:
   - Aug 6: Diarrhea (Type 6) - possibly from Aug 4-5 foods
   - Aug 7: Mixed (Types 2-5) - transitioning
   - Aug 8-9: Normal (Types 3-5) - stable
   
   With more data, patterns will emerge!
  `);
  
  db.close();
}

async function analyzeWindow(db: sqlite3.Database, windowHours: number, label: string): Promise<void> {
  return new Promise((resolve) => {
    // Simplified query to show concept
    const windowDays = Math.ceil(windowHours / 24);
    
    db.all(`
      WITH food_bm_pairs AS (
        SELECT 
          f.name as food_name,
          bm.bristol_scale,
          julianday(bm.date) - julianday(m.date) as days_diff,
          (julianday(bm.date) - julianday(m.date)) * 24 as hours_diff
        FROM meals m
        JOIN meal_foods mf ON m.id = mf.meal_id
        JOIN foods f ON mf.food_id = f.id
        CROSS JOIN bowel_movements bm
        WHERE m.user_id = 1 
          AND bm.user_id = 1
          AND bm.date >= m.date
          AND (julianday(bm.date) - julianday(m.date)) * 24 <= ?
      )
      SELECT 
        food_name,
        COUNT(*) as occurrences,
        AVG(bristol_scale) as avg_bristol,
        ROUND(AVG(hours_diff), 1) as avg_transit_hours
      FROM food_bm_pairs
      GROUP BY food_name
      HAVING occurrences >= 2
      ORDER BY occurrences DESC
      LIMIT 5
    `, [windowHours], (err, rows: any[]) => {
      if (err) {
        console.error(err);
        resolve();
        return;
      }
      
      console.log(`\n📍 ${label}:`);
      if (rows.length === 0) {
        console.log('   No sufficient data in this window');
      } else {
        rows.forEach(row => {
          const bristolType = row.avg_bristol < 3 ? 'Constipation' : 
                            row.avg_bristol > 5 ? 'Diarrhea' : 'Normal';
          console.log(`   ${row.food_name}: ${bristolType} (Bristol ${row.avg_bristol.toFixed(1)}) @ ~${row.avg_transit_hours}h`);
        });
      }
      resolve();
    });
  });
}

analyzeBowelTransit().catch(console.error);