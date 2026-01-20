import { differenceInHours, parseISO } from 'date-fns';

export interface SymptomEvent {
  id: number;
  symptomId: number;
  severity: number;
  timestamp: string;
  date: string;
  time: string; // HH:MM format
}

export interface FoodEvent {
  id: number;
  foodId: number;
  mealId: number;
  timestamp: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface CorrelationResult {
  foodId: number;
  symptomId: number;
  correlationScore: number;
  confidenceLevel: number;
  sampleSize: number;
  timeWindowHours: number;
  pValue?: number;
  meanSeverityWithFood: number;
  meanSeverityWithoutFood: number;
}

export class CorrelationAnalyzer {
  
  /**
   * Calculate Pearson correlation coefficient between two arrays
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
    const sumX2 = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
    const sumY2 = y.map(yi => yi * yi).reduce((a, b) => a + b, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) return 0;
    
    return numerator / denominator;
  }

  /**
   * Calculate statistical significance (p-value) for correlation
   */
  private calculatePValue(r: number, n: number): number {
    if (n <= 2) return 1;
    
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const df = n - 2;
    
    // Simplified p-value approximation for t-distribution
    // In production, you'd want a more accurate implementation
    const absT = Math.abs(t);
    
    if (absT < 1) return 0.5;
    if (absT < 2) return 0.1;
    if (absT < 2.576) return 0.05;
    if (absT < 3.291) return 0.01;
    return 0.001;
  }

  /**
   * Calculate confidence level based on sample size and correlation strength
   */
  private calculateConfidenceLevel(correlationScore: number, sampleSize: number, pValue: number): number {
    if (sampleSize < 5) return 0.1;
    if (sampleSize < 10) return Math.min(0.5, 1 - pValue);
    if (sampleSize < 20) return Math.min(0.7, 1 - pValue);
    
    const baseConfidence = 1 - pValue;
    const sampleBonus = Math.min(0.2, sampleSize / 100);
    const strengthBonus = Math.abs(correlationScore) * 0.1;
    
    return Math.min(0.95, baseConfidence + sampleBonus + strengthBonus);
  }

  /**
   * Find symptom events within a time window after food consumption
   */
  private findSymptomsInTimeWindow(
    foodEvents: FoodEvent[],
    symptomEvents: SymptomEvent[],
    timeWindowHours: number
  ): Array<{ foodEvent: FoodEvent; symptomEvents: SymptomEvent[] }> {
    return foodEvents.map(foodEvent => {
      const foodTime = parseISO(foodEvent.timestamp);
      
      const symptomsInWindow = symptomEvents.filter(symptomEvent => {
        const symptomTime = parseISO(symptomEvent.timestamp);
        const hoursDiff = differenceInHours(symptomTime, foodTime);
        
        // Symptoms should occur after food consumption within the time window
        return hoursDiff >= 0 && hoursDiff <= timeWindowHours;
      });
      
      return {
        foodEvent,
        symptomEvents: symptomsInWindow
      };
    });
  }

  /**
   * Analyze correlation between a specific food and symptom
   */
  public analyzeFoodSymptomCorrelation(
    foodId: number,
    symptomId: number,
    foodEvents: FoodEvent[],
    symptomEvents: SymptomEvent[],
    timeWindowHours: number = 24
  ): CorrelationResult | null {
    
    // Filter events for specific food and symptom
    const relevantFoodEvents = foodEvents.filter(event => event.foodId === foodId);
    const relevantSymptomEvents = symptomEvents.filter(event => event.symptomId === symptomId);
    
    if (relevantFoodEvents.length < 3 || relevantSymptomEvents.length < 3) {
      return null; // Not enough data for meaningful correlation
    }

    // Find symptoms that occur within time window after food consumption
    const foodSymptomPairs = this.findSymptomsInTimeWindow(
      relevantFoodEvents,
      relevantSymptomEvents,
      timeWindowHours
    );

    // Create arrays for correlation analysis
    const exposureValues: number[] = [];
    const severityValues: number[] = [];
    
    // Get all unique dates from both food and symptom events
    const allDates = new Set([
      ...relevantFoodEvents.map(e => e.date),
      ...relevantSymptomEvents.map(e => e.date)
    ]);

    let severitiesWithFood: number[] = [];
    let severitiesWithoutFood: number[] = [];

    // For each date, determine if food was consumed and what severity was experienced
    Array.from(allDates).forEach(date => {
      const foodConsumedOnDate = relevantFoodEvents.some(e => e.date === date);
      const symptomsOnDate = relevantSymptomEvents
        .filter(e => e.date === date)
        .map(e => e.severity);
      
      if (symptomsOnDate.length > 0) {
        const avgSeverity = symptomsOnDate.reduce((a, b) => a + b, 0) / symptomsOnDate.length;
        
        exposureValues.push(foodConsumedOnDate ? 1 : 0);
        severityValues.push(avgSeverity);
        
        if (foodConsumedOnDate) {
          severitiesWithFood.push(avgSeverity);
        } else {
          severitiesWithoutFood.push(avgSeverity);
        }
      }
    });

    if (exposureValues.length < 5) {
      return null; // Need at least 5 data points
    }

    // Calculate correlation
    const correlationScore = this.calculatePearsonCorrelation(exposureValues, severityValues);
    const pValue = this.calculatePValue(correlationScore, exposureValues.length);
    const confidenceLevel = this.calculateConfidenceLevel(correlationScore, exposureValues.length, pValue);

    const meanSeverityWithFood = severitiesWithFood.length > 0 
      ? severitiesWithFood.reduce((a, b) => a + b, 0) / severitiesWithFood.length 
      : 0;
    
    const meanSeverityWithoutFood = severitiesWithoutFood.length > 0 
      ? severitiesWithoutFood.reduce((a, b) => a + b, 0) / severitiesWithoutFood.length 
      : 0;

    return {
      foodId,
      symptomId,
      correlationScore,
      confidenceLevel,
      sampleSize: exposureValues.length,
      timeWindowHours,
      pValue,
      meanSeverityWithFood,
      meanSeverityWithoutFood
    };
  }

  /**
   * Analyze correlations for all food-symptom combinations
   */
  public analyzeAllCorrelations(
    foodEvents: FoodEvent[],
    symptomEvents: SymptomEvent[],
    timeWindowHours: number = 24,
    minConfidence: number = 0.3
  ): CorrelationResult[] {
    
    const uniqueFoodIds = [...new Set(foodEvents.map(e => e.foodId))];
    const uniqueSymptomIds = [...new Set(symptomEvents.map(e => e.symptomId))];
    
    const results: CorrelationResult[] = [];
    
    // Analyze each food-symptom combination
    for (const foodId of uniqueFoodIds) {
      for (const symptomId of uniqueSymptomIds) {
        const correlation = this.analyzeFoodSymptomCorrelation(
          foodId,
          symptomId,
          foodEvents,
          symptomEvents,
          timeWindowHours
        );
        
        if (correlation && correlation.confidenceLevel >= minConfidence) {
          results.push(correlation);
        }
      }
    }
    
    // Sort by correlation strength (absolute value) and confidence
    return results.sort((a, b) => {
      const scoreA = Math.abs(a.correlationScore) * a.confidenceLevel;
      const scoreB = Math.abs(b.correlationScore) * b.confidenceLevel;
      return scoreB - scoreA;
    });
  }

  /**
   * Find the strongest triggers for a specific symptom
   */
  public findTopTriggersForSymptom(
    symptomId: number,
    foodEvents: FoodEvent[],
    symptomEvents: SymptomEvent[],
    limit: number = 10
  ): CorrelationResult[] {
    
    const uniqueFoodIds = [...new Set(foodEvents.map(e => e.foodId))];
    const results: CorrelationResult[] = [];
    
    for (const foodId of uniqueFoodIds) {
      const correlation = this.analyzeFoodSymptomCorrelation(
        foodId,
        symptomId,
        foodEvents,
        symptomEvents
      );
      
      if (correlation && correlation.correlationScore > 0.2) {
        results.push(correlation);
      }
    }
    
    return results
      .sort((a, b) => b.correlationScore - a.correlationScore)
      .slice(0, limit);
  }

  /**
   * Find foods that may help reduce symptoms (negative correlations)
   */
  public findBeneficialFoods(
    foodEvents: FoodEvent[],
    symptomEvents: SymptomEvent[],
    minBenefit: number = -0.3
  ): CorrelationResult[] {
    
    const allCorrelations = this.analyzeAllCorrelations(foodEvents, symptomEvents);
    
    return allCorrelations
      .filter(c => c.correlationScore <= minBenefit && c.confidenceLevel > 0.4)
      .sort((a, b) => a.correlationScore - b.correlationScore);
  }

  /**
   * Generate trend data for symptoms over time
   */
  public generateSymptomTrends(
    symptomEvents: SymptomEvent[],
    days: number = 30
  ): Array<{ date: string; [symptomName: string]: number | string | null }> {
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    // Get all unique symptom IDs
    const allSymptomIds = [...new Set(symptomEvents.map(e => e.symptomId))];
    
    // Generate all dates in the range
    const allDates: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split('T')[0]);
    }
    
    const trends: { [date: string]: { [symptomId: string]: number[] } } = {};
    
    // Group symptoms by date
    symptomEvents.forEach(event => {
      const eventDate = new Date(event.date);
      if (eventDate >= startDate && eventDate <= endDate) {
        const dateStr = event.date;
        
        if (!trends[dateStr]) {
          trends[dateStr] = {};
        }
        
        if (!trends[dateStr][event.symptomId]) {
          trends[dateStr][event.symptomId] = [];
        }
        
        trends[dateStr][event.symptomId].push(event.severity);
      }
    });
    
    // Calculate daily averages for all dates and all symptoms
    const trendData: Array<{ date: string; [key: string]: number | string | null }> = [];
    
    allDates.forEach(date => {
      const dayData: { date: string; [key: string]: number | string | null } = { date };
      
      allSymptomIds.forEach(symptomId => {
        if (trends[date] && trends[date][symptomId]) {
          const severities = trends[date][symptomId];
          const avgSeverity = severities.reduce((a, b) => a + b, 0) / severities.length;
          dayData[`symptom_${symptomId}`] = Math.round(avgSeverity * 10) / 10;
        } else {
          // No data for this symptom on this date - use null so line chart handles gaps properly
          dayData[`symptom_${symptomId}`] = null;
        }
      });
      
      trendData.push(dayData);
    });
    
    return trendData;
  }
}