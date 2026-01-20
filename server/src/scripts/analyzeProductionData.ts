#!/usr/bin/env node

import { Database } from '../database/init.js';
import { CorrelationService } from '../services/correlationService.js';
import path from 'path';

async function analyzeProductionData() {
  // Use production database
  const dbPath = path.join(process.cwd(), 'production_health_tracker.db');
  const database = new Database(dbPath);
  
  try {
    await database.initialize();
    const db = database.getDatabase();
    
    console.log('='.repeat(80));
    console.log('PRODUCTION DATA ANALYSIS');
    console.log('='.repeat(80));
    
    // Get data overview
    const mealCount = await new Promise<number>((resolve) => {
      db.get('SELECT COUNT(*) as count FROM meals WHERE user_id = 1', (err, row: any) => {
        resolve(row?.count || 0);
      });
    });
    
    const symptomLogCount = await new Promise<number>((resolve) => {
      db.get('SELECT COUNT(*) as count FROM symptom_logs WHERE user_id = 1', (err, row: any) => {
        resolve(row?.count || 0);
      });
    });
    
    const dateRange = await new Promise<any>((resolve) => {
      db.get(`
        SELECT 
          MIN(date) as start_date,
          MAX(date) as end_date,
          julianday(MAX(date)) - julianday(MIN(date)) + 1 as days_tracked
        FROM (
          SELECT date FROM meals WHERE user_id = 1
          UNION
          SELECT date FROM symptom_logs WHERE user_id = 1
        )
      `, (err, row: any) => {
        resolve(row);
      });
    });
    
    console.log('\n📊 Data Overview:');
    console.log(`  • Meals logged: ${mealCount}`);
    console.log(`  • Symptom logs: ${symptomLogCount}`);
    console.log(`  • Date range: ${dateRange.start_date} to ${dateRange.end_date}`);
    console.log(`  • Days tracked: ${Math.round(dateRange.days_tracked)}`);
    
    // Check for timezone issues
    const timezoneIssues = await new Promise<any[]>((resolve) => {
      db.all(`
        SELECT 
          date,
          COUNT(CASE WHEN time(meal_time) >= '00:00:00' AND time(meal_time) < '05:00:00' THEN 1 END) as late_night_meals,
          COUNT(*) as total_meals
        FROM meals 
        WHERE user_id = 1
        GROUP BY date
        HAVING late_night_meals > 0
        ORDER BY date
      `, (err, rows: any[]) => {
        resolve(rows || []);
      });
    });
    
    if (timezoneIssues.length > 0) {
      console.log('\n⚠️  Potential Timezone Issues Detected:');
      console.log('  Days with late-night entries (possible UTC shift):');
      timezoneIssues.forEach(day => {
        console.log(`    • ${day.date}: ${day.late_night_meals}/${day.total_meals} meals after midnight`);
      });
    }
    
    // Run correlation analysis
    console.log('\n🔄 Running Correlation Analysis...');
    const service = new CorrelationService(database);
    
    // First, calculate fresh correlations
    try {
      const correlations = await service.calculateCorrelations(
        1, // userId
        90, // days back
        24, // time window hours
        0.2 // minimum confidence (lower threshold for less data)
      );
      
      console.log(`✅ Calculated ${correlations.length} correlations`);
      
      // Get stored correlations with details
      const storedCorrelations = await service.getStoredCorrelations(1, 0.2, 20);
      
      if (storedCorrelations.length > 0) {
        console.log('\n📈 Top Correlations Found:');
        console.log('─'.repeat(80));
        
        // Separate positive and negative correlations
        const positiveCorr = storedCorrelations.filter(c => c.correlationScore > 0);
        const negativeCorr = storedCorrelations.filter(c => c.correlationScore < 0);
        
        if (positiveCorr.length > 0) {
          console.log('\n🔴 Potential Triggers (Positive Correlations):');
          positiveCorr.slice(0, 5).forEach(corr => {
            const percentage = (Math.abs(corr.correlationScore) * 100).toFixed(0);
            const confidence = (corr.confidenceLevel * 100).toFixed(0);
            console.log(
              `  ${corr.foodName.padEnd(15)} → ${corr.symptomName.padEnd(15)} | ` +
              `${percentage}% correlation | ${confidence}% confidence | n=${corr.sampleSize}`
            );
          });
        }
        
        if (negativeCorr.length > 0) {
          console.log('\n🟢 Potentially Beneficial (Negative Correlations):');
          negativeCorr.slice(0, 5).forEach(corr => {
            const percentage = (Math.abs(corr.correlationScore) * 100).toFixed(0);
            const confidence = (corr.confidenceLevel * 100).toFixed(0);
            console.log(
              `  ${corr.foodName.padEnd(15)} ⊝ ${corr.symptomName.padEnd(15)} | ` +
              `${percentage}% reduction | ${confidence}% confidence | n=${corr.sampleSize}`
            );
          });
        }
      }
      
      // Get insights
      const insights = await service.getCorrelationInsights(1);
      
      console.log('\n💡 Analysis Insights:');
      console.log('─'.repeat(80));
      console.log(`Risk Score: ${insights.riskScore.toFixed(1)}/100`);
      
      if (insights.recommendations.length > 0) {
        console.log('\nRecommendations:');
        insights.recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
      }
      
      // Analyze data quality
      console.log('\n📊 Data Quality Assessment:');
      console.log('─'.repeat(80));
      
      const avgSampleSize = storedCorrelations.length > 0
        ? storedCorrelations.reduce((sum, c) => sum + c.sampleSize, 0) / storedCorrelations.length
        : 0;
      
      const avgConfidence = storedCorrelations.length > 0
        ? storedCorrelations.reduce((sum, c) => sum + c.confidenceLevel, 0) / storedCorrelations.length
        : 0;
      
      console.log(`  • Average sample size: ${avgSampleSize.toFixed(1)} data points`);
      console.log(`  • Average confidence: ${(avgConfidence * 100).toFixed(0)}%`);
      
      if (avgSampleSize < 10) {
        console.log('  ⚠️  Low sample sizes - continue tracking for more reliable results');
      } else if (avgSampleSize < 20) {
        console.log('  ✓ Moderate sample sizes - patterns emerging');
      } else {
        console.log('  ✅ Good sample sizes - reliable correlations');
      }
      
      // Check for specific patterns despite timezone issues
      console.log('\n🔍 Timezone Impact Analysis:');
      console.log('─'.repeat(80));
      
      const strongCorrelations = storedCorrelations.filter(c => 
        Math.abs(c.correlationScore) > 0.5 && c.confidenceLevel > 0.5
      );
      
      if (strongCorrelations.length > 0) {
        console.log(`  ✅ Found ${strongCorrelations.length} strong correlations despite timezone issues`);
        console.log('  The algorithm successfully identified patterns in your data!');
      } else if (storedCorrelations.length > 0) {
        console.log(`  ✓ Found ${storedCorrelations.length} correlations`);
        console.log('  Continue tracking for stronger patterns to emerge');
      } else {
        console.log('  ⚠️  No significant correlations found yet');
        console.log('  This could be due to:');
        console.log('    - Limited data (only 17 meals tracked)');
        console.log('    - Need more consistent tracking');
        console.log('    - Foods may not be strong triggers');
      }
      
    } catch (error) {
      console.error('Error during correlation analysis:', error);
      console.log('\n⚠️  Note: With limited data, some correlations may not be statistically significant yet.');
      console.log('Continue tracking for more reliable results!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await database.close();
  }
}

// Run the analysis
analyzeProductionData().catch(console.error);