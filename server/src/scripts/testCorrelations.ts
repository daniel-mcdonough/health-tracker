#!/usr/bin/env node

import { database } from '../database/init.js';
import { CorrelationService } from '../services/correlationService.js';

async function testCorrelations() {
  try {
    await database.initialize();
    const db = database.getDatabase();
    
    // Check if we have enough data
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
    
    console.log(`Current data in database:`);
    console.log(`  Meals: ${mealCount}`);
    console.log(`  Symptom logs: ${symptomLogCount}`);
    
    if (mealCount < 10 || symptomLogCount < 10) {
      console.log('\n⚠️  Insufficient data for correlation analysis.');
      console.log('Run the mock data generator first:');
      console.log('  npm run generate-mock-data');
      process.exit(1);
    }
    
    // Run correlation analysis
    const service = new CorrelationService(database);
    
    console.log('\n🔄 Calculating correlations...');
    const startTime = Date.now();
    
    const results = await service.calculateCorrelations(
      1, // userId
      90, // days back
      24, // time window hours
      0.3 // minimum confidence
    );
    
    const duration = Date.now() - startTime;
    console.log(`✅ Calculated ${results.length} correlations in ${duration}ms`);
    
    // Get stored correlations
    const storedCorrelations = await service.getStoredCorrelations(1, 0.3, 20);
    
    console.log('\n📊 Top Correlations:');
    console.log('─'.repeat(80));
    
    for (const corr of storedCorrelations.slice(0, 10)) {
      const emoji = corr.correlationScore > 0 ? '⚠️ ' : '✅';
      const relationship = corr.correlationScore > 0 ? '→' : '⊝';
      
      console.log(
        `${emoji} ${corr.foodName.padEnd(15)} ${relationship} ${corr.symptomName.padEnd(15)} | ` +
        `Score: ${corr.correlationScore.toFixed(3).padStart(7)} | ` +
        `Conf: ${(corr.confidenceLevel * 100).toFixed(0).padStart(3)}% | ` +
        `N: ${corr.sampleSize.toString().padStart(3)}`
      );
    }
    
    // Get beneficial foods
    const beneficialFoods = await service.getBeneficialFoods(1, 10);
    
    if (beneficialFoods.length > 0) {
      console.log('\n💚 Beneficial Foods (negative correlations):');
      console.log('─'.repeat(80));
      
      for (const food of beneficialFoods) {
        console.log(
          `  ${food.foodName.padEnd(15)} helps with ${food.symptomName.padEnd(15)} | ` +
          `Score: ${food.correlationScore.toFixed(3)}`
        );
      }
    }
    
    // Get insights
    const insights = await service.getCorrelationInsights(1);
    
    console.log('\n📈 Insights Summary:');
    console.log('─'.repeat(80));
    console.log(`Risk Score: ${insights.riskScore.toFixed(1)}/100`);
    console.log(`\nTop Triggers (${insights.topTriggers.length}):`);
    insights.topTriggers.slice(0, 3).forEach(trigger => {
      console.log(`  • ${trigger.foodName} → ${trigger.symptomName} (${trigger.correlationScore.toFixed(2)})`);
    });
    
    console.log(`\nRecommendations:`);
    insights.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
    
    // Test symptom trends
    console.log('\n📉 Generating Symptom Trends...');
    const trends = await service.generateSymptomTrends(1, 30);
    console.log(`Generated ${trends.length} days of trend data`);
    
    // Show sample of trend data
    if (trends.length > 0) {
      console.log('\nSample trend data (last 5 days):');
      trends.slice(-5).forEach(day => {
        const symptoms = Object.keys(day)
          .filter(k => k.startsWith('symptom_'))
          .map(k => `${k}: ${day[k]}`)
          .join(', ');
        console.log(`  ${day.date}: ${symptoms || 'No symptoms'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run the test
testCorrelations().catch(console.error);