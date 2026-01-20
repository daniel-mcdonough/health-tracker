import { Router, type Request, type Response } from 'express';
import { CorrelationService } from '../services/correlationService.js';
import { database } from '../database/init.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const correlationService = new CorrelationService(database);

// Use JWT authentication
router.use(authenticateToken);

/**
 * Calculate correlations for the current user
 * POST /api/analysis/calculate
 */
router.post('/calculate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { daysBack = 90, timeWindowHours = 24, minConfidence = 0.3 } = req.body;
    
    const correlations = await correlationService.calculateCorrelations(
      req.userId,
      daysBack,
      timeWindowHours,
      minConfidence
    );

    res.json({
      success: true,
      data: correlations,
      message: `Calculated ${correlations.length} correlations`
    });

  } catch (error) {
    console.error('Error calculating correlations:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

/**
 * Get stored correlations for the current user
 * GET /api/analysis/correlations
 */
router.get('/correlations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { minConfidence = 0.3, limit = 50 } = req.query;
    
    const correlations = await correlationService.getStoredCorrelations(
      req.userId,
      parseFloat(minConfidence as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: correlations
    });

  } catch (error) {
    console.error('Error fetching correlations:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get top triggers for a specific symptom
 * GET /api/analysis/triggers/:symptomId
 */
router.get('/triggers/:symptomId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const symptomId = parseInt(req.params.symptomId);
    const { limit = 10 } = req.query;
    
    const triggers = await correlationService.getTopTriggersForSymptom(
      req.userId,
      symptomId,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: triggers
    });

  } catch (error) {
    console.error('Error fetching triggers:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get beneficial foods (foods that help reduce symptoms)
 * GET /api/analysis/beneficial-foods
 */
router.get('/beneficial-foods', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    
    const beneficialFoods = await correlationService.getBeneficialFoods(
      req.userId,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: beneficialFoods
    });

  } catch (error) {
    console.error('Error fetching beneficial foods:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get symptom trends over time
 * GET /api/analysis/trends
 */
router.get('/trends', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { days = 30 } = req.query;
    
    const trends = await correlationService.generateSymptomTrends(
      req.userId,
      parseInt(days as string)
    );

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    console.error('Error generating trends:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get comprehensive correlation insights and recommendations
 * GET /api/analysis/insights
 */
router.get('/insights', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const insights = await correlationService.getCorrelationInsights(req.userId!);

    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get analysis dashboard data
 * GET /api/analysis/dashboard
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [correlations, trends, insights] = await Promise.all([
      correlationService.getStoredCorrelations(req.userId, 0.4, 10),
      correlationService.generateSymptomTrends(req.userId, 7),
      correlationService.getCorrelationInsights(req.userId)
    ]);

    // Calculate summary statistics
    const strongTriggers = correlations.filter(c => c.correlationScore > 0.6).length;
    const totalCorrelations = correlations.length;
    const avgConfidence = correlations.length > 0 
      ? correlations.reduce((sum, c) => sum + c.confidenceLevel, 0) / correlations.length 
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          strongTriggers,
          totalCorrelations,
          avgConfidence: Math.round(avgConfidence * 100),
          riskScore: insights.riskScore
        },
        correlations: correlations.slice(0, 5),
        trends,
        insights,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get recent symptom entries for the past 3 days
 * GET /api/analysis/recent-symptoms
 */
router.get('/recent-symptoms', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase();
    
    // Calculate date range for past 3 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 2); // Past 3 days including today
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Fetch recent symptom logs with full details
    const recentSymptoms = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT 
          sl.id,
          sl.symptom_id as symptomId,
          sl.severity,
          sl.time,
          sl.notes,
          sl.date,
          sl.logged_at as loggedAt,
          s.name as symptomName,
          s.description as symptomDescription,
          sc.name as categoryName,
          sc.color as categoryColor
        FROM symptom_logs sl
        JOIN symptoms s ON sl.symptom_id = s.id
        JOIN symptom_categories sc ON s.category_id = sc.id
        WHERE sl.user_id = ? AND sl.date BETWEEN ? AND ?
        ORDER BY sl.date DESC, sl.time DESC`,
        [req.userId, startDateStr, endDateStr],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as any[]);
        }
      );
    });
    
    // Group symptoms by day for expandable list view
    const groupedByDay: { [key: string]: any[] } = {};
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    recentSymptoms.forEach(symptom => {
      let dayLabel: string;
      if (symptom.date === today) {
        dayLabel = 'Today';
      } else if (symptom.date === yesterday) {
        dayLabel = 'Yesterday';
      } else {
        const date = new Date(symptom.date);
        dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }
      
      if (!groupedByDay[dayLabel]) {
        groupedByDay[dayLabel] = [];
      }
      
      groupedByDay[dayLabel].push({
        id: symptom.id,
        symptomId: symptom.symptomId,
        symptomName: symptom.symptomName,
        symptomDescription: symptom.symptomDescription,
        category: symptom.categoryName,
        categoryColor: symptom.categoryColor,
        severity: symptom.severity,
        time: symptom.time,
        notes: symptom.notes,
        date: symptom.date,
        loggedAt: symptom.loggedAt
      });
    });
    
    // Create chart data format - individual points for each entry
    const chartData = recentSymptoms.map(symptom => ({
      datetime: `${symptom.date} ${symptom.time}`,
      date: symptom.date,
      time: symptom.time,
      symptomName: symptom.symptomName,
      severity: symptom.severity,
      category: symptom.categoryName,
      categoryColor: symptom.categoryColor,
      notes: symptom.notes,
      id: symptom.id
    })).sort((a, b) => {
      // Sort by datetime
      return new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime();
    });
    
    // Create symptom colors mapping
    const symptomColors: { [symptom: string]: string } = {};
    recentSymptoms.forEach(symptom => {
      if (!symptomColors[symptom.symptomName]) {
        symptomColors[symptom.symptomName] = symptom.categoryColor;
      }
    });
    
    // Calculate summary statistics
    const totalEntries = recentSymptoms.length;
    const avgSeverity = totalEntries > 0 
      ? recentSymptoms.reduce((sum, s) => sum + s.severity, 0) / totalEntries 
      : 0;
    
    // Get most frequent symptoms
    const symptomFrequency: { [key: string]: number } = {};
    recentSymptoms.forEach(s => {
      const key = `${s.symptomName}|${s.categoryColor}`;
      symptomFrequency[key] = (symptomFrequency[key] || 0) + 1;
    });
    
    const mostFrequent = Object.entries(symptomFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key, count]) => {
        const [name, color] = key.split('|');
        return { name, color, count };
      });
    
    res.json({
      success: true,
      data: {
        groupedByDay,
        chartData,
        symptomColors,
        summary: {
          totalEntries,
          avgSeverity: Math.round(avgSeverity * 10) / 10,
          mostFrequent,
          dateRange: {
            start: startDateStr,
            end: endDateStr
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching recent symptoms:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recent symptoms'
    });
  }
});

export default router;