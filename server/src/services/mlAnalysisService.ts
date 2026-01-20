import sqlite3 from 'sqlite3';

interface ExposureFlags {
  timestamp: number;
  gluten_0_6h: number;
  gluten_6_12h: number;
  gluten_12_24h: number;
  gluten_24_48h: number;
  dairy_0_6h: number;
  dairy_6_12h: number;
  dairy_12_24h: number;
  dairy_24_48h: number;
  caffeine_0_6h: number;
  caffeine_6_12h: number;
  caffeine_12_24h: number;
  caffeine_24_48h: number;
  fried_0_6h: number;
  fried_6_12h: number;
  fried_12_24h: number;
  fried_24_48h: number;
  acidic_nightshade_0_6h: number;
  acidic_nightshade_6_12h: number;
  acidic_nightshade_12_24h: number;
  acidic_nightshade_24_48h: number;
  histamine_0_6h: number;
  histamine_6_12h: number;
  histamine_12_24h: number;
  histamine_24_48h: number;
  soy_0_6h: number;
  soy_6_12h: number;
  soy_12_24h: number;
  soy_24_48h: number;
  sugar_0_6h: number;
  sugar_6_12h: number;
  sugar_12_24h: number;
  sugar_24_48h: number;
  magnesium_citrate_0_6h: number;
  magnesium_citrate_6_12h: number;
  magnesium_citrate_12_24h: number;
  magnesium_citrate_24_48h: number;
  h1_antihistamine_0_6h: number;
  h1_antihistamine_6_12h: number;
  h1_antihistamine_12_24h: number;
  h1_antihistamine_24_48h: number;
  h2_antihistamine_0_6h: number;
  h2_antihistamine_6_12h: number;
  h2_antihistamine_12_24h: number;
  h2_antihistamine_24_48h: number;
  pseudoephedrine_0_6h: number;
  pseudoephedrine_6_12h: number;
  pseudoephedrine_12_24h: number;
  pseudoephedrine_24_48h: number;
}

interface SymptomTarget {
  timestamp: number;
  symptomName: string;
  severity_ge_7: number;
}

interface MLResult {
  symptom: string;
  test_accuracy: number;
  baseline_accuracy: number;
  test_precision: number;
  test_recall: number;
  pr_auc: number;
  feature_importance: Array<{
    feature: string;
    pretty_name: string;
    correlation_importance: number;
    correlation_coef: number;
  }>;
}

interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

export class MLAnalysisService {
  private db: sqlite3.Database;
  private cachedResults: MLResult[] | null = null;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  // Food categorization mapping
  private categorizeFoods(foodName: string, category: string, allergens: string[]): string[] {
    const categories: string[] = [];
    const lowerName = foodName.toLowerCase();
    const lowerCategory = category.toLowerCase();

    // Gluten - be more inclusive
    if (allergens.includes('gluten') || 
        lowerName.includes('wheat') || 
        lowerName.includes('bread') || 
        lowerName.includes('pasta') || 
        lowerName.includes('oat') ||
        lowerName.includes('barley') ||
        lowerName.includes('rye') ||
        lowerName.includes('flour') ||
        lowerCategory === 'grain') {
      categories.push('gluten');
    }

    // Dairy - be more inclusive
    if (allergens.includes('dairy') || 
        lowerCategory === 'dairy' ||
        lowerName.includes('milk') || 
        lowerName.includes('cheese') || 
        lowerName.includes('yogurt') || 
        lowerName.includes('butter') ||
        lowerName.includes('cream') ||
        lowerName.includes('ice cream')) {
      categories.push('dairy');
    }

    // Caffeine
    if (lowerName.includes('coffee') || 
        lowerName.includes('tea') || 
        lowerName.includes('chocolate') || 
        lowerName.includes('cola') ||
        lowerName.includes('cocoa')) {
      categories.push('caffeine');
    }

    // Fried - be more inclusive
    if (lowerName.includes('fried') || 
        lowerName.includes('fries') || 
        lowerName.includes('chips') || 
        lowerName.includes('crispy') ||
        lowerName.includes('deep fried') ||
        lowerName.includes('battered')) {
      categories.push('fried');
    }

    // Acidic/Nightshades - be more inclusive
    if (lowerName.includes('tomato') || 
        lowerName.includes('pepper') || 
        lowerName.includes('potato') || 
        lowerName.includes('eggplant') || 
        lowerName.includes('citrus') || 
        lowerName.includes('orange') || 
        lowerName.includes('lemon') || 
        lowerName.includes('lime') ||
        lowerName.includes('bell pepper') ||
        lowerName.includes('hot pepper') ||
        lowerName.includes('paprika') ||
        lowerName.includes('grapefruit') ||
        lowerCategory === 'fruit') {
      categories.push('acidic_nightshade');
    }

    // Histamine - be more inclusive
    if (lowerName.includes('aged') || 
        lowerName.includes('fermented') || 
        lowerName.includes('wine') || 
        lowerName.includes('cheese') || 
        lowerName.includes('sauerkraut') || 
        lowerName.includes('tuna') || 
        lowerName.includes('avocado') ||
        lowerName.includes('spinach') ||
        lowerName.includes('processed meat') ||
        lowerName.includes('salami') ||
        lowerName.includes('ham')) {
      categories.push('histamine');
    }

    // Soy
    if (allergens.includes('soy') || 
        lowerName.includes('soy') || 
        lowerName.includes('tofu') || 
        lowerName.includes('tempeh') || 
        lowerName.includes('miso') ||
        lowerName.includes('edamame')) {
      categories.push('soy');
    }

    // Sugar - be more inclusive
    if (lowerName.includes('sugar') || 
        lowerName.includes('sweet') || 
        lowerName.includes('candy') || 
        lowerName.includes('dessert') || 
        lowerName.includes('cookie') || 
        lowerName.includes('cake') ||
        lowerName.includes('donut') ||
        lowerName.includes('pie') ||
        lowerName.includes('ice cream') ||
        lowerName.includes('soda') ||
        lowerCategory === 'fruit') {
      categories.push('sugar');
    }

    return categories;
  }

  // Medication categorization
  private categorizeMedication(medicationName: string, category: string): string[] {
    const categories: string[] = [];
    const lowerName = medicationName.toLowerCase();
    const lowerCategory = category.toLowerCase();

    if (lowerName.includes('magnesium citrate')) {
      categories.push('magnesium_citrate');
    }

    if (lowerCategory === 'antihistamine_h1' || 
        lowerName.includes('loratadine') || 
        lowerName.includes('cetirizine') || 
        lowerName.includes('diphenhydramine')) {
      categories.push('h1_antihistamine');
    }

    if (lowerCategory === 'antihistamine_h2' || 
        lowerName.includes('famotidine') || 
        lowerName.includes('ranitidine')) {
      categories.push('h2_antihistamine');
    }

    if (lowerName.includes('pseudoephedrine')) {
      categories.push('pseudoephedrine');
    }

    return categories;
  }

  // Generate hourly exposure flags with lag buckets using Maps for O(n) joins
  private async generateExposureFlags(userId: number): Promise<ExposureFlags[]> {
    return new Promise((resolve, reject) => {
      // Get all meal data
      const mealQuery = `
        SELECT 
          m.date,
          m.meal_time,
          f.name as food_name,
          f.category,
          f.common_allergens,
          mf.portion_size
        FROM meals m
        JOIN meal_foods mf ON m.id = mf.meal_id
        JOIN foods f ON mf.food_id = f.id
        WHERE m.user_id = ?
        ORDER BY m.date, m.meal_time
      `;

      this.db.all(mealQuery, [userId], (err, mealRows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`Found ${mealRows.length} meal rows`);

        // Get medication data
        const medQuery = `
          SELECT 
            ml.date,
            ml.time,
            m.name as med_name,
            m.category,
            ml.dosage_amount
          FROM medication_logs ml
          JOIN medications m ON ml.medication_id = m.id
          WHERE ml.user_id = ?
          ORDER BY ml.date, ml.time
        `;

        this.db.all(medQuery, [userId], (err, medRows: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          console.log(`Found ${medRows.length} medication rows`);

          // Get all symptom timestamps to know what hours we need to create exposure flags for
          const symptomQuery = `
            SELECT DISTINCT date, time, datetime(date || ' ' || time) as full_datetime
            FROM symptom_logs 
            WHERE user_id = ?
            ORDER BY date, time
          `;

          this.db.all(symptomQuery, [userId], (err, symptomTimes: any[]) => {
            if (err) {
              reject(err);
              return;
            }

            console.log(`Found ${symptomTimes.length} unique symptom timestamps`);

            // Process exposures into Map with hourly keys for O(n) lookups
            const exposureMap = new Map<string, { [category: string]: number }>();

            // Process meals into hourly buckets
            mealRows.forEach(row => {
              const mealDate = new Date(row.meal_time);
              // Round to hour using ISO string approach
              const hourKey = mealDate.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
              
              console.log(`Meal: ${row.food_name} at ${row.meal_time} -> hourKey: ${hourKey}`);
              
              if (!exposureMap.has(hourKey)) {
                exposureMap.set(hourKey, {});
              }

              const allergens = row.common_allergens ? JSON.parse(row.common_allergens) : [];
              const categories = this.categorizeFoods(row.food_name, row.category, allergens);

              if (categories.length > 0) {
                console.log(`Food: ${row.food_name} (${row.category}) -> Categories: ${categories.join(', ')}`);
              }

              const hourExposures = exposureMap.get(hourKey)!;
              categories.forEach(cat => {
                const portionSize = parseFloat(row.portion_size) || 1;
                hourExposures[cat] = (hourExposures[cat] || 0) + portionSize;
                console.log(`  Added ${portionSize} to ${cat} at ${hourKey}`);
              });
            });

            // Process medications into hourly buckets
            medRows.forEach(row => {
              const medDate = new Date(`${row.date} ${row.time}`);
              const hourKey = medDate.toISOString().slice(0, 13);
              
              if (!exposureMap.has(hourKey)) {
                exposureMap.set(hourKey, {});
              }

              const categories = this.categorizeMedication(row.med_name, row.category);
              const hourExposures = exposureMap.get(hourKey)!;

              categories.forEach(cat => {
                const dosageAmount = parseFloat(row.dosage_amount) || 1;
                hourExposures[cat] = (hourExposures[cat] || 0) + dosageAmount;
              });
            });

            console.log(`\nExposure hours:`, Array.from(exposureMap.keys()).sort());

            // Define all categories and lag buckets
            const categories = ['gluten', 'dairy', 'caffeine', 'fried', 'acidic_nightshade', 'histamine', 'soy', 'sugar',
                             'magnesium_citrate', 'h1_antihistamine', 'h2_antihistamine', 'pseudoephedrine'];
            const lagBuckets = ['0_6h', '6_12h', '12_24h', '24_48h'];

            // Create exposure flags for each symptom timestamp
            const result: ExposureFlags[] = [];

            symptomTimes.forEach(symptomTime => {
              const symptomDate = new Date(symptomTime.full_datetime);
              const symptomHourKey = symptomDate.toISOString().slice(0, 13);
              
              console.log(`\nSymptom at ${symptomTime.full_datetime} -> hourKey: ${symptomHourKey}`);
              
              const flags: any = { timestamp: symptomDate.getTime() };

              // Initialize all flags to 0 with default values
              categories.forEach(cat => {
                lagBuckets.forEach(lag => {
                  flags[`${cat}_${lag}`] = 0;
                });
              });

              // Compute rolling sums for each lag bucket using Map lookups
              categories.forEach(category => {
                // 0-6h prior
                for (let h = 0; h < 6; h++) {
                  const pastDate = new Date(symptomDate.getTime() - (h * 60 * 60 * 1000));
                  const pastHourKey = pastDate.toISOString().slice(0, 13);
                  const hourExposures = exposureMap.get(pastHourKey);
                  if (hourExposures && hourExposures[category]) {
                    flags[`${category}_0_6h`] += hourExposures[category];
                    console.log(`  Found ${category} exposure at ${pastHourKey} (${h}h ago): +${hourExposures[category]}`);
                  }
                }

                // 6-12h prior
                for (let h = 6; h < 12; h++) {
                  const pastDate = new Date(symptomDate.getTime() - (h * 60 * 60 * 1000));
                  const pastHourKey = pastDate.toISOString().slice(0, 13);
                  const hourExposures = exposureMap.get(pastHourKey);
                  if (hourExposures && hourExposures[category]) {
                    flags[`${category}_6_12h`] += hourExposures[category];
                  }
                }

                // 12-24h prior
                for (let h = 12; h < 24; h++) {
                  const pastDate = new Date(symptomDate.getTime() - (h * 60 * 60 * 1000));
                  const pastHourKey = pastDate.toISOString().slice(0, 13);
                  const hourExposures = exposureMap.get(pastHourKey);
                  if (hourExposures && hourExposures[category]) {
                    flags[`${category}_12_24h`] += hourExposures[category];
                  }
                }

                // 24-48h prior
                for (let h = 24; h < 48; h++) {
                  const pastDate = new Date(symptomDate.getTime() - (h * 60 * 60 * 1000));
                  const pastHourKey = pastDate.toISOString().slice(0, 13);
                  const hourExposures = exposureMap.get(pastHourKey);
                  if (hourExposures && hourExposures[category]) {
                    flags[`${category}_24_48h`] += hourExposures[category];
                  }
                }
              });

              result.push(flags as ExposureFlags);
            });

            console.log(`Generated ${result.length} exposure flag records`);
            // Sort by timestamp for time-ordered split
            result.sort((a, b) => a.timestamp - b.timestamp);
            resolve(result);
          });
        });
      });
    });
  }

  // Generate binary targets per symptom
  private async generateSymptomTargets(userId: number): Promise<SymptomTarget[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          sl.date,
          sl.time,
          s.name as symptom_name,
          sl.severity
        FROM symptom_logs sl
        JOIN symptoms s ON sl.symptom_id = s.id
        WHERE sl.user_id = ?
        ORDER BY sl.date, sl.time
      `;

      this.db.all(query, [userId], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const targets: SymptomTarget[] = [];

        rows.forEach(row => {
          const timestamp = new Date(`${row.date} ${row.time}`).getTime();
          
          targets.push({
            timestamp,
            symptomName: row.symptom_name,
            severity_ge_7: row.severity >= 7 ? 1 : 0
          });
        });

        // Sort by timestamp for time-ordered split
        targets.sort((a, b) => a.timestamp - b.timestamp);
        resolve(targets);
      });
    });
  }

  // Calculate real classification metrics
  private computeMetrics(yTrue: number[], yPred: number[]): ClassificationMetrics {
    if (yTrue.length !== yPred.length) {
      throw new Error('yTrue and yPred must have same length');
    }

    let tp = 0, fp = 0, tn = 0, fn = 0;
    
    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i] === 1 && yPred[i] === 1) tp++;
      else if (yTrue[i] === 0 && yPred[i] === 1) fp++;
      else if (yTrue[i] === 0 && yPred[i] === 0) tn++;
      else if (yTrue[i] === 1 && yPred[i] === 0) fn++;
    }

    const accuracy = (tp + tn) / (tp + tn + fp + fn);
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall);

    return { accuracy, precision, recall, f1 };
  }

  // Calculate PR-AUC (area under precision-recall curve)
  private calculatePRAUC(yTrue: number[], scores: number[]): number {
    if (yTrue.length !== scores.length) return 0;
    
    // Get unique thresholds
    const thresholds = [...new Set(scores)].sort((a, b) => b - a);
    if (thresholds.length < 2) return 0;
    
    let auc = 0;
    let prevR = 0, prevP = 1;
    
    for (const t of thresholds) {
      const pred = scores.map(s => s >= t ? 1 : 0);
      const m = this.computeMetrics(yTrue, pred);
      // Trapezoid approximation in PR space
      auc += (m.recall - prevR) * ((m.precision + prevP) / 2);
      prevR = m.recall;
      prevP = m.precision;
    }
    
    return Math.max(0, Math.min(1, auc));
  }

  // Train ML models and return results with proper validation
  public async runMLAnalysis(userId: number): Promise<MLResult[]> {
    try {
      console.log('Starting ML analysis...');
      
      const [exposures, targets] = await Promise.all([
        this.generateExposureFlags(userId),
        this.generateSymptomTargets(userId)
      ]);

      console.log(`Generated ${exposures.length} exposure records and ${targets.length} target records`);

      // Get unique symptoms
      const symptoms = [...new Set(targets.map(t => t.symptomName))];
      const results: MLResult[] = [];

      for (const symptom of symptoms) {
        console.log(`Training models for symptom: ${symptom}`);
        
        // Align exposure and target data using Map for O(n) joins
        const targetMap = new Map<number, number>();
        targets.filter(t => t.symptomName === symptom).forEach(target => {
          targetMap.set(target.timestamp, target.severity_ge_7);
        });

        const alignedData: { exposure: ExposureFlags; target: number }[] = [];
        exposures.forEach(exposure => {
          const target = targetMap.get(exposure.timestamp);
          if (target !== undefined) {
            alignedData.push({ exposure, target });
          }
        });

        if (alignedData.length < 10) {
          console.log(`Insufficient data for ${symptom}: ${alignedData.length} samples`);
          continue;
        }

        // Time-ordered split (70% train, 30% test)
        const splitIndex = Math.floor(alignedData.length * 0.7);
        const trainData = alignedData.slice(0, splitIndex);
        const testData = alignedData.slice(splitIndex);

        // Check class balance in both train and test sets
        const trainPositives = trainData.filter(d => d.target === 1).length;
        const trainNegatives = trainData.filter(d => d.target === 0).length;
        const testPositives = testData.filter(d => d.target === 1).length;
        const testNegatives = testData.filter(d => d.target === 0).length;

        if (trainPositives < 3 || trainNegatives < 3 || testPositives < 1 || testNegatives < 1) {
          console.log(`Insufficient class balance for ${symptom}: train +${trainPositives}/-${trainNegatives}, test +${testPositives}/-${testNegatives}`);
          continue;
        }

        // Build feature names from actual data schema with defaults
        const sampleExposure = exposures[0];
        const featureNames = Object.keys(sampleExposure).filter(k => k !== 'timestamp');
        
        const trainX = trainData.map(d => featureNames.map(fn => (d.exposure as any)[fn] || 0));
        const trainY = trainData.map(d => d.target);
        const testX = testData.map(d => featureNames.map(fn => (d.exposure as any)[fn] || 0));
        const testY = testData.map(d => d.target);

        // Remove all-zero columns for robustness
        const nonZeroFeatures: number[] = [];
        featureNames.forEach((name, i) => {
          const allValues = trainX.map(row => row[i]);
          const hasVariance = allValues.some(val => val !== 0);
          if (hasVariance) {
            nonZeroFeatures.push(i);
          }
        });

        if (nonZeroFeatures.length === 0) {
          console.log(`No non-zero features for ${symptom}, skipping`);
          continue;
        }

        const filteredFeatureNames = nonZeroFeatures.map(i => featureNames[i]);
        const filteredTrainX = trainX.map(row => nonZeroFeatures.map(i => row[i]));
        const filteredTestX = testX.map(row => nonZeroFeatures.map(i => row[i]));

        // Calculate baseline accuracy on test set
        const baselineAccuracy = Math.max(
          testY.filter(y => y === 1).length / testY.length,
          testY.filter(y => y === 0).length / testY.length
        );

        // Correlation-based feature importance (renamed for clarity)
        const featureImportance = filteredFeatureNames.map((name, i) => {
          const featureValues = filteredTrainX.map(row => row[i]);
          const correlation = this.calculateCorrelation(featureValues, trainY);
          
          console.log(`${symptom} - ${name}: correlation = ${correlation.toFixed(6)}`);
          
          const absCorrelation = isNaN(correlation) ? 0 : Math.abs(correlation);
          const cleanCorrelation = isNaN(correlation) ? 0 : correlation;
          
          return {
            feature: name,
            pretty_name: this.formatFeatureName(name),
            correlation_importance: absCorrelation,
            correlation_coef: cleanCorrelation
          };
        });

        // Simple linear scoring using correlations for test metrics
        const weights = featureImportance.map(f => f.correlation_coef);
        const testScores = filteredTestX.map(row => {
          return row.reduce((sum, val, i) => sum + val * weights[i], 0);
        });

        // Convert scores to predictions using median threshold
        const sortedScores = [...testScores].sort((a, b) => a - b);
        const threshold = sortedScores[Math.floor(sortedScores.length / 2)];
        const testPredictions = testScores.map(score => score >= threshold ? 1 : 0);

        // Calculate real test metrics
        const testMetrics = this.computeMetrics(testY, testPredictions);
        const prAuc = this.calculatePRAUC(testY, testScores);

        // Sort by correlation importance and take top 3
        featureImportance.sort((a, b) => b.correlation_importance - a.correlation_importance);
        
        results.push({
          symptom,
          test_accuracy: testMetrics.accuracy,
          baseline_accuracy: baselineAccuracy,
          test_precision: testMetrics.precision,
          test_recall: testMetrics.recall,
          pr_auc: prAuc,
          feature_importance: featureImportance.slice(0, 3)
        });
      }

      this.cachedResults = results;
      return results;

    } catch (error) {
      console.error('ML Analysis error:', error);
      throw error;
    }
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private formatFeatureName(featureName: string): string {
    // Convert feature names like "histamine_12_24h" to "Histamine (12–24h prior)"
    const parts = featureName.split('_');
    if (parts.length >= 3) {
      const category = parts.slice(0, -2).join(' ').replace(/_/g, ' ');
      const lagStart = parts[parts.length - 2];
      const lagEnd = parts[parts.length - 1].replace('h', '');
      
      const categoryFormatted = category.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `${categoryFormatted} (${lagStart}–${lagEnd}h prior)`;
    }
    return featureName;
  }

  public getCachedResults(): MLResult[] | null {
    return this.cachedResults;
  }
}