# ML Analysis System

## Overview

The ML Analysis System provides advanced machine learning-based correlation analysis between food exposures, medication intake, and symptom severity. It uses sophisticated temporal lag analysis and robust validation techniques to identify potential dietary and medication triggers for health symptoms.

## Key Features

### Temporal Lag Analysis
- **Hourly exposure tracking** with precise timestamp alignment
- **4 lag buckets** for comprehensive timing analysis:
  - **0-6 hours**: Immediate reactions
  - **6-12 hours**: Short-term delayed reactions  
  - **12-24 hours**: Medium-term delayed reactions
  - **24-48 hours**: Long-term delayed reactions
- **Rolling sum calculations** across lag windows for comprehensive exposure assessment

### Food Categorization
Automatically categorizes foods into 8 major allergen/trigger groups:
- **Gluten**: Wheat, bread, pasta, oats, barley, rye, flour, grains
- **Dairy**: Milk, cheese, yogurt, butter, cream, ice cream
- **Caffeine**: Coffee, tea, chocolate, cola, cocoa
- **Fried**: Fried foods, fries, chips, crispy, deep-fried, battered items
- **Acidic/Nightshades**: Tomatoes, peppers, potatoes, eggplant, citrus fruits
- **Histamine**: Aged/fermented foods, wine, cheese, processed meats, spinach
- **Soy**: Soy products, tofu, tempeh, miso, edamame
- **Sugar**: Sweet foods, candy, desserts, sodas, fruits

### Medication Tracking
Monitors exposure to key medications:
- **Magnesium Citrate**: Supplement tracking
- **H1 Antihistamines**: Loratadine, cetirizine, diphenhydramine
- **H2 Antihistamines**: Famotidine, ranitidine
- **Pseudoephedrine**: Decongestant tracking

### Robust Statistical Analysis
- **Real test metrics** instead of placeholder values:
  - Test accuracy on held-out data
  - Baseline accuracy (majority class)
  - Precision and recall with proper confusion matrices
  - PR-AUC (Precision-Recall Area Under Curve) for imbalanced data
- **Class balance validation** requiring ≥3 samples per class
- **Time-ordered train/test splits** to prevent data leakage
- **Correlation-based feature importance** with clear labeling

### Performance Optimizations
- **O(n) Map-based joins** instead of O(n²) array searches
- **Hourly bucketing with ISO string keys** for robust timestamp matching
- **Feature robustness** with default values and all-zero column removal
- **Efficient temporal window calculations** using Map lookups

## Technical Implementation

### Data Processing Pipeline

#### 1. Exposure Flag Generation
```typescript
// Round timestamps to hourly buckets for robust alignment
const hourKey = mealDate.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"

// Use Map for O(n) lookups instead of O(n²) array.find()
const exposureMap = new Map<string, { [category: string]: number }>();
```

#### 2. Temporal Lag Calculation
```typescript
// Calculate rolling sums for each lag bucket
for (let h = 0; h < 6; h++) {
  const pastDate = new Date(symptomDate.getTime() - (h * 60 * 60 * 1000));
  const pastHourKey = pastDate.toISOString().slice(0, 13);
  const hourExposures = exposureMap.get(pastHourKey);
  if (hourExposures && hourExposures[category]) {
    flags[`${category}_0_6h`] += hourExposures[category];
  }
}
```

#### 3. Class Balance Validation
```typescript
// Require balanced data in both train and test sets
if (trainPositives < 3 || trainNegatives < 3 || 
    testPositives < 1 || testNegatives < 1) {
  console.log(`Insufficient class balance for ${symptom}`);
  continue;
}
```

#### 4. Real Metric Calculation
```typescript
// Calculate actual test metrics from predictions
const testMetrics = this.computeMetrics(testY, testPredictions);
const prAuc = this.calculatePRAUC(testY, testScores);
```

### Data Structure

#### ExposureFlags Interface
```typescript
interface ExposureFlags {
  timestamp: number;
  // Food categories with lag buckets
  gluten_0_6h: number;
  gluten_6_12h: number;
  gluten_12_24h: number;
  gluten_24_48h: number;
  // ... (repeated for all 8 food categories)
  // Medication categories with lag buckets  
  magnesium_citrate_0_6h: number;
  h1_antihistamine_0_6h: number;
  h2_antihistamine_0_6h: number;
  pseudoephedrine_0_6h: number;
  // ... (repeated for all 4 medication categories)
}
```

#### MLResult Interface
```typescript
interface MLResult {
  symptom: string;
  test_accuracy: number;        // Real test accuracy
  baseline_accuracy: number;    // Majority class baseline
  test_precision: number;       // Precision on test set
  test_recall: number;          // Recall on test set  
  pr_auc: number;              // Precision-Recall AUC
  feature_importance: Array<{
    feature: string;
    pretty_name: string;
    correlation_importance: number;  // |correlation|
    correlation_coef: number;        // Raw correlation
  }>;
}
```

## API Endpoints

### Run ML Analysis
```
POST /api/ml-analysis/run
Authorization: Bearer <token>
```
Executes the complete ML analysis pipeline and caches results.

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "symptom": "Bloating",
        "test_accuracy": 0.75,
        "baseline_accuracy": 0.60,
        "test_precision": 0.80,
        "test_recall": 0.65,
        "pr_auc": 0.72,
        "feature_importance": [
          {
            "feature": "gluten_6_12h",
            "pretty_name": "Gluten (6–12h prior)",
            "correlation_importance": 0.654321,
            "correlation_coef": 0.654321
          }
        ]
      }
    ],
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

### Get Cached Results
```
GET /api/ml-analysis/results
Authorization: Bearer <token>
```
Returns previously computed ML analysis results if available.

## Data Requirements

### Minimum Data Thresholds
- **10+ aligned data points** per symptom for model training
- **≥3 positive samples** (severity ≥ 7) in training set
- **≥3 negative samples** (severity < 7) in training set  
- **≥1 positive and ≥1 negative sample** in test set
- **Non-zero feature variance** (removes all-zero columns)

### Data Quality Checks
- **Temporal alignment**: Symptoms must have corresponding exposure data
- **Feature robustness**: Missing values default to 0
- **Chronological ordering**: Time-ordered train/test split prevents leakage

## Algorithm Details

### Correlation Analysis
Uses Pearson correlation coefficient for feature importance:
```typescript
const numerator = n * sumXY - sumX * sumY;
const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
return denominator === 0 ? 0 : numerator / denominator;
```

### Classification Metrics
```typescript
interface ClassificationMetrics {
  accuracy: number;   // (TP + TN) / (TP + TN + FP + FN)
  precision: number;  // TP / (TP + FP)  
  recall: number;     // TP / (TP + FN)
  f1: number;         // 2 * precision * recall / (precision + recall)
}
```

### PR-AUC Calculation
Uses trapezoidal approximation under the precision-recall curve:
```typescript
for (const threshold of thresholds) {
  const predictions = scores.map(s => s >= threshold ? 1 : 0);
  const metrics = computeMetrics(yTrue, predictions);
  auc += (metrics.recall - prevRecall) * ((metrics.precision + prevPrecision) / 2);
}
```

## Frontend Display

### Results Visualization
- **Metric badges**: Test accuracy, baseline, precision, recall, PR-AUC
- **Feature table**: Top 3 correlations per symptom
- **Color coding**: 
  - Positive correlations (red): Potential triggers
  - Negative correlations (green): Potential protective factors
- **Importance ranking**: Sorted by absolute correlation strength

### Analysis Status
- **Real-time progress** during analysis execution  
- **Cached result detection** for immediate display
- **Error handling** with user-friendly messages
- **Data sufficiency warnings** when requirements not met

## Performance Optimizations

### Algorithmic Improvements
- **Map-based lookups**: O(n) instead of O(n²) for temporal joins
- **Hourly bucketing**: Robust timestamp alignment using ISO strings
- **Batch processing**: Single-pass feature matrix construction
- **Early termination**: Skip analysis for insufficient data

### Memory Efficiency  
- **Streaming data processing**: Avoid loading entire dataset into memory
- **Garbage collection friendly**: Minimize object creation in loops
- **Map cleanup**: Clear temporary data structures after use

## Validation and Testing

### Data Validation
```bash
# Test with minimal dataset
curl -X POST "http://localhost:3001/api/ml-analysis/run" \
  -H "Authorization: Bearer $TOKEN"

# Verify insufficient data handling  
# Should return meaningful error for < 10 samples
```

### Statistical Validation
- **Baseline comparison**: Models should beat majority class baseline
- **Sanity checks**: Correlations should be reasonable (-1 to 1)
- **Reproducibility**: Same data should yield same results

## Limitations and Considerations

### Current Limitations
- **Correlation ≠ Causation**: Results show statistical associations, not causal relationships
- **Single-user data**: Limited sample size may affect generalizability  
- **Temporal assumptions**: Fixed lag windows may not capture all reaction patterns
- **Food categorization**: Predefined categories may miss nuanced triggers

### Future Enhancements
- **Advanced ML models**: Random Forest, Gradient Boosting, Neural Networks
- **Dynamic lag windows**: Adaptive time windows based on individual patterns
- **Multi-user analysis**: Population-level insights (with privacy preservation)
- **Causal inference**: Methods for establishing causal relationships
- **Real-time alerts**: Proactive warnings based on exposure patterns

## Troubleshooting

### Common Issues

#### "Insufficient Data" Error
- **Cause**: < 10 aligned symptom-exposure pairs
- **Solution**: Log more meals and symptoms over longer period

#### "Insufficient Class Balance" Error  
- **Cause**: Not enough high-severity symptoms (≥7) or variation
- **Solution**: Ensure symptom logging includes range of severity levels

#### "No non-zero features" Error
- **Cause**: No food/medication exposures in the analyzed period
- **Solution**: Verify meal and medication logging is active

#### Low Correlation Values
- **Cause**: Weak or no relationship between tracked foods and symptoms
- **Solution**: Consider tracking different foods or extending analysis period

### Debug Information
The system provides detailed console logging for troubleshooting:
- Exposure map construction progress
- Feature correlation calculations  
- Class balance validation results
- Statistical metric computations

Enable browser developer tools to view detailed analysis progress and identify potential issues.