# Mock Data Generation for Health Tracker

## Overview

The Health Tracker includes comprehensive mock data generation capabilities to test the correlation analysis system. The mock data generator creates realistic health tracking data with configurable correlation patterns between foods and symptoms.

## Features

- **Realistic Data Generation**: Creates meals, symptom logs, and bowel movements following natural daily patterns
- **Configurable Correlations**: Define specific food-symptom relationships with customizable strength
- **Reproducible Results**: Uses seeded random number generation for consistent test data
- **Correlation Testing**: Automatically runs correlation analysis after data generation
- **Performance Testing**: Can generate months of data for load testing

## Usage

### Generate Mock Data

Generate 90 days of mock data (default):
```bash
cd server
npm run generate-mock-data
```

Generate specific number of days:
```bash
npm run generate-mock-data 30  # Generate 30 days of data
```

Clear existing data before generating:
```bash
npm run generate-mock-data 90 -- --clear  # Clear existing data first
```

### Test Correlations

After generating mock data, test the correlation calculations:
```bash
npm run test-correlations
```

This will:
- Verify sufficient data exists
- Calculate all correlations
- Display top positive correlations (potential triggers)
- Display negative correlations (beneficial foods)
- Show risk score and recommendations
- Generate symptom trend data

## Predefined Correlation Patterns

The mock data generator includes several predefined patterns to test different correlation scenarios:

### Strong Positive Correlation (0.8)
- **Foods**: Dairy products (Milk, Cheese, Yogurt)
- **Symptoms**: Digestive issues (Bloating, Stomach Pain, Nausea)
- **Effect**: 80% chance of symptoms appearing 2 hours after consumption
- **Severity Increase**: +5 points

### Moderate Positive Correlation (0.6)
- **Foods**: Gluten-containing foods (Wheat Bread, Oats)
- **Symptoms**: Energy issues (Fatigue, Brain Fog)
- **Effect**: 60% chance of symptoms appearing 4 hours after consumption
- **Severity Increase**: +3 points

### Weak Positive Correlation (0.4)
- **Foods**: Nightshades (Tomatoes)
- **Symptoms**: Joint Pain
- **Effect**: 40% chance of symptoms appearing 6 hours after consumption
- **Severity Increase**: +2 points

### Negative Correlation (Anti-inflammatory)
- **Foods**: Salmon
- **Symptoms**: Joint Pain, Muscle Aches
- **Effect**: 50% chance of reducing symptoms
- **Severity Decrease**: -2 points

## Data Generation Details

### Meals
- **Breakfast**: 7:00-9:00 AM (randomized)
- **Lunch**: 11:00 AM-1:00 PM (randomized)
- **Dinner**: 5:00-7:00 PM (randomized)
- **Snacks**: 30% chance, 2:00-8:00 PM
- **Foods per meal**: 1-4 random selections from food database

### Symptom Logs
- **Log times**: 9:00 AM (morning), 3:00 PM (afternoon), 9:00 PM (evening)
- **Base severity**: 1-3 (mild background symptoms)
- **Triggered severity**: Increases based on correlation patterns
- **Logging probability**: 80% when symptoms present

### Bowel Movements
- **Frequency**: 0-3 per day
- **Bristol scale**: 1-7 (random distribution)
- **Additional metrics**: Color, size, urgency, ease of passage
- **Complications**: 5% chance blood, 10% chance mucus

## Expected Correlation Results

After running the mock data generator with default settings:

### Top Positive Correlations
```
⚠️ Cheese         → Bloating        | Score: 0.750 | Conf: 85% | N: 45
⚠️ Cow Milk      → Stomach Pain    | Score: 0.720 | Conf: 82% | N: 42
⚠️ Wheat Bread   → Fatigue         | Score: 0.580 | Conf: 75% | N: 38
```

### Top Negative Correlations
```
✅ Salmon        ⊝ Joint Pain      | Score: -0.450 | Conf: 70% | N: 25
✅ Salmon        ⊝ Muscle Aches    | Score: -0.420 | Conf: 68% | N: 23
```

### Risk Score
- Expected range: 40-70/100 based on correlation patterns
- Higher scores indicate more strong positive correlations

## Customizing Correlation Patterns

To modify the correlation patterns, edit `server/src/scripts/generateMockData.ts`:

```typescript
const correlationPatterns: CorrelationPattern[] = [
  {
    foodNames: ['Custom Food'],
    symptomNames: ['Custom Symptom'],
    correlationStrength: 0.9,  // 0-1 (90% correlation)
    timeDelayHours: 3,          // Symptoms appear 3 hours later
    baseSymptomSeverity: 2,     // Baseline severity (1-10)
    severityIncrease: 6         // How much severity increases
  }
];
```

## Troubleshooting

### "Insufficient data for correlation analysis"
- The correlation algorithm requires at least 10 meals and 10 symptom logs
- Run `npm run generate-mock-data` to create sufficient data

### Correlations not matching expected patterns
- The correlation algorithm uses statistical analysis, not direct causation
- Random variation is included to simulate real-world data
- Increase the number of days generated for more stable correlations

### Performance issues with large datasets
- The correlation calculation time increases with O(foods × symptoms × days)
- For testing, 30-90 days provides good results
- Consider using smaller time windows for faster analysis

## Testing Workflow

1. **Clear existing data** (optional):
   ```bash
   npm run generate-mock-data 90 -- --clear
   ```

2. **Verify correlations calculated**:
   ```bash
   npm run test-correlations
   ```

3. **Check database directly**:
   ```bash
   sqlite3 health_tracker.db "SELECT * FROM food_symptom_correlations ORDER BY ABS(correlation_score) DESC LIMIT 10;"
   ```

4. **Test via API**:
   ```bash
   # Get correlation insights
   curl -X GET "http://localhost:3001/api/correlations/insights" \
     -H "Authorization: Bearer $TOKEN"
   ```

## Performance Metrics

With default settings (90 days of data):
- **Data generation**: ~5-10 seconds
- **Correlation calculation**: ~500-1500ms
- **Database size**: ~2-5 MB
- **Total correlations**: 200-500 (depending on food/symptom combinations)
- **Memory usage**: ~50-100 MB during calculation