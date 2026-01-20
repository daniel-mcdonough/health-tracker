import { Router, type Request, type Response } from 'express';
import { database } from '../database/init.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { MLAnalysisService } from '../services/mlAnalysisService.js';

const router = Router();
const mlService = new MLAnalysisService(database.getDatabase());

// Use JWT authentication
router.use(authenticateToken);

/**
 * Run ML analysis on food/symptom correlations
 * POST /api/ml-analysis/run
 */
router.post('/run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('Running ML analysis for user:', req.userId);
    
    const results = await mlService.runMLAnalysis(req.userId);

    res.json({
      success: true,
      data: {
        results,
        timestamp: new Date().toISOString(),
        totalSymptoms: results.length
      },
      message: `ML analysis completed for ${results.length} symptoms`
    });

  } catch (error) {
    console.error('Error running ML analysis:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cached ML analysis results
 * GET /api/ml-analysis/results
 */
router.get('/results', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cachedResults = mlService.getCachedResults();

    if (!cachedResults) {
      return res.json({
        success: true,
        data: {
          results: [],
          cached: false,
          message: 'No cached results available. Run analysis first.'
        }
      });
    }

    res.json({
      success: true,
      data: {
        results: cachedResults,
        cached: true,
        totalSymptoms: cachedResults.length
      }
    });

  } catch (error) {
    console.error('Error fetching ML results:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;