import { Database } from '../database/init.js';
import { CorrelationAnalyzer, type SymptomEvent, type FoodEvent, type CorrelationResult } from '../utils/correlationAnalysis.js';

export class CorrelationService {
  private db: Database;
  private analyzer: CorrelationAnalyzer;

  constructor(database: Database) {
    this.db = database;
    this.analyzer = new CorrelationAnalyzer();
  }

  /**
   * Fetch symptom events for a user within a date range
   */
  private async getSymptomEvents(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<SymptomEvent[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          sl.id,
          sl.symptom_id as symptomId,
          sl.severity,
          sl.date,
          sl.time,
          sl.logged_at as timestamp
        FROM symptom_logs sl
        WHERE sl.user_id = ? 
        AND sl.date BETWEEN ? AND ?
        ORDER BY sl.date, sl.logged_at
      `;

      this.db.getDatabase().all(query, [userId, startDate, endDate], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const events: SymptomEvent[] = rows.map(row => ({
            id: row.id,
            symptomId: row.symptomId,
            severity: row.severity,
            timestamp: row.timestamp,
            date: row.date,
            time: row.time
          }));
          resolve(events);
        }
      });
    });
  }

  /**
   * Fetch food consumption events for a user within a date range
   */
  private async getFoodEvents(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<FoodEvent[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          mf.id,
          mf.food_id as foodId,
          mf.meal_id as mealId,
          m.meal_time as timestamp,
          m.date,
          m.meal_type as mealType
        FROM meal_foods mf
        JOIN meals m ON mf.meal_id = m.id
        WHERE m.user_id = ?
        AND m.date BETWEEN ? AND ?
        ORDER BY m.date, m.meal_time
      `;

      this.db.getDatabase().all(query, [userId, startDate, endDate], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const events: FoodEvent[] = rows.map(row => ({
            id: row.id,
            foodId: row.foodId,
            mealId: row.mealId,
            timestamp: row.timestamp,
            date: row.date,
            mealType: row.mealType
          }));
          resolve(events);
        }
      });
    });
  }

  /**
   * Save correlation results to database
   */
  private async saveCorrelation(userId: number, correlation: CorrelationResult): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO food_symptom_correlations (
          user_id, food_id, symptom_id, correlation_score, 
          confidence_level, sample_size, time_window_hours, last_calculated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      this.db.getDatabase().run(
        query,
        [
          userId,
          correlation.foodId,
          correlation.symptomId,
          correlation.correlationScore,
          correlation.confidenceLevel,
          correlation.sampleSize,
          correlation.timeWindowHours
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Get stored correlations for a user
   */
  public async getStoredCorrelations(
    userId: number,
    minConfidence: number = 0.3,
    limit: number = 50
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          c.*,
          f.name as foodName,
          f.category as foodCategory,
          s.name as symptomName,
          sc.name as symptomCategory
        FROM food_symptom_correlations c
        JOIN foods f ON c.food_id = f.id
        JOIN symptoms s ON c.symptom_id = s.id
        JOIN symptom_categories sc ON s.category_id = sc.id
        WHERE c.user_id = ?
        AND c.confidence_level >= ?
        ORDER BY ABS(c.correlation_score) * c.confidence_level DESC
        LIMIT ?
      `;

      this.db.getDatabase().all(
        query,
        [userId, minConfidence, limit],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => ({
              id: row.id,
              foodId: row.food_id,
              symptomId: row.symptom_id,
              foodName: row.foodName,
              foodCategory: row.foodCategory,
              symptomName: row.symptomName,
              symptomCategory: row.symptomCategory,
              correlationScore: row.correlation_score,
              confidenceLevel: row.confidence_level,
              sampleSize: row.sample_size,
              timeWindowHours: row.time_window_hours,
              lastCalculated: row.last_calculated
            })));
          }
        }
      );
    });
  }

  /**
   * Calculate and store correlations for a user
   */
  public async calculateCorrelations(
    userId: number,
    daysBack: number = 90,
    timeWindowHours: number = 24,
    minConfidence: number = 0.3
  ): Promise<CorrelationResult[]> {
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000))
      .toISOString().split('T')[0];

    try {
      // Fetch user's symptom and food events
      const [symptomEvents, foodEvents] = await Promise.all([
        this.getSymptomEvents(userId, startDate, endDate),
        this.getFoodEvents(userId, startDate, endDate)
      ]);

      if (symptomEvents.length < 10 || foodEvents.length < 10) {
        throw new Error('Insufficient data for correlation analysis');
      }

      // Calculate correlations
      const correlations = this.analyzer.analyzeAllCorrelations(
        foodEvents,
        symptomEvents,
        timeWindowHours,
        minConfidence
      );

      // Save results to database
      for (const correlation of correlations) {
        await this.saveCorrelation(userId, correlation);
      }

      return correlations;

    } catch (error) {
      throw new Error(`Failed to calculate correlations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get top food triggers for a specific symptom
   */
  public async getTopTriggersForSymptom(
    userId: number,
    symptomId: number,
    limit: number = 10
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          c.*,
          f.name as foodName,
          f.category as foodCategory,
          AVG(sl.severity) as avgSeverityWithFood,
          COUNT(sl.id) as occurrences
        FROM food_symptom_correlations c
        JOIN foods f ON c.food_id = f.id
        LEFT JOIN meals m ON m.user_id = ? AND EXISTS (
          SELECT 1 FROM meal_foods mf WHERE mf.meal_id = m.id AND mf.food_id = c.food_id
        )
        LEFT JOIN symptom_logs sl ON sl.user_id = ? AND sl.symptom_id = c.symptom_id 
          AND sl.date = m.date
        WHERE c.user_id = ?
        AND c.symptom_id = ?
        AND c.correlation_score > 0
        GROUP BY c.id, c.food_id, f.name, f.category
        ORDER BY c.correlation_score * c.confidence_level DESC
        LIMIT ?
      `;

      this.db.getDatabase().all(
        query,
        [userId, userId, userId, symptomId, limit],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => ({
              foodId: row.food_id,
              foodName: row.foodName,
              foodCategory: row.foodCategory,
              correlationScore: row.correlation_score,
              confidenceLevel: row.confidence_level,
              avgSeverityWithFood: row.avgSeverityWithFood || 0,
              occurrences: row.occurrences || 0,
              sampleSize: row.sample_size
            })));
          }
        }
      );
    });
  }

  /**
   * Get beneficial foods (negative correlations)
   */
  public async getBeneficialFoods(userId: number, limit: number = 10): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          c.*,
          f.name as foodName,
          f.category as foodCategory,
          s.name as symptomName
        FROM food_symptom_correlations c
        JOIN foods f ON c.food_id = f.id
        JOIN symptoms s ON c.symptom_id = s.id
        WHERE c.user_id = ?
        AND c.correlation_score < -0.2
        AND c.confidence_level > 0.4
        ORDER BY c.correlation_score ASC
        LIMIT ?
      `;

      this.db.getDatabase().all(query, [userId, limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            foodId: row.food_id,
            symptomId: row.symptom_id,
            foodName: row.foodName,
            foodCategory: row.foodCategory,
            symptomName: row.symptomName,
            correlationScore: row.correlation_score,
            confidenceLevel: row.confidence_level,
            sampleSize: row.sample_size
          })));
        }
      });
    });
  }

  /**
   * Generate symptom trend data for charts
   */
  public async generateSymptomTrends(
    userId: number,
    days: number = 30
  ): Promise<any[]> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
      .toISOString().split('T')[0];

    try {
      const symptomEvents = await this.getSymptomEvents(userId, startDate, endDate);
      
      if (symptomEvents.length === 0) {
        return [];
      }

      // Get symptom names mapping
      const symptomNames = await this.getSymptomNames();
      
      const rawTrends = this.analyzer.generateSymptomTrends(symptomEvents, days);
      
      // Convert symptom_ID format to symptom names
      return rawTrends.map(trend => {
        const convertedTrend: any = { date: trend.date };
        
        Object.keys(trend).forEach(key => {
          if (key.startsWith('symptom_')) {
            const symptomId = parseInt(key.replace('symptom_', ''));
            const symptomName = symptomNames[symptomId];
            if (symptomName) {
              convertedTrend[symptomName] = trend[key];
            }
          } else if (key !== 'date') {
            convertedTrend[key] = trend[key];
          }
        });
        
        return convertedTrend;
      });
    } catch (error) {
      throw new Error(`Failed to generate symptom trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get symptom names mapping
   */
  private async getSymptomNames(): Promise<{ [id: number]: string }> {
    return new Promise((resolve, reject) => {
      const query = `SELECT id, name FROM symptoms`;
      
      this.db.getDatabase().all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const mapping: { [id: number]: string } = {};
          rows.forEach(row => {
            mapping[row.id] = row.name;
          });
          resolve(mapping);
        }
      });
    });
  }

  /**
   * Get correlation insights and recommendations
   */
  public async getCorrelationInsights(userId: number): Promise<{
    topTriggers: any[];
    beneficialFoods: any[];
    riskScore: number;
    recommendations: string[];
  }> {
    try {
      const [correlations, beneficialFoods] = await Promise.all([
        this.getStoredCorrelations(userId, 0.4, 10),
        this.getBeneficialFoods(userId, 5)
      ]);

      const topTriggers = correlations
        .filter(c => c.correlationScore > 0)
        .slice(0, 5);

      // Calculate risk score based on number and strength of positive correlations
      const riskScore = Math.min(100, 
        correlations
          .filter(c => c.correlationScore > 0.5)
          .reduce((sum, c) => sum + (c.correlationScore * c.confidenceLevel * 20), 0)
      );

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (topTriggers.length > 0) {
        recommendations.push(`Consider avoiding ${topTriggers[0].foodName} as it shows strong correlation with ${topTriggers[0].symptomName}`);
      }
      
      if (beneficialFoods.length > 0) {
        recommendations.push(`Try including more ${beneficialFoods[0].foodName} which may help reduce ${beneficialFoods[0].symptomName}`);
      }
      
      if (riskScore > 60) {
        recommendations.push('Consider consulting with a healthcare provider about your symptom patterns');
      }
      
      if (correlations.length < 3) {
        recommendations.push('Continue logging consistently to identify more patterns');
      }

      return {
        topTriggers,
        beneficialFoods,
        riskScore,
        recommendations
      };

    } catch (error) {
      throw new Error(`Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}