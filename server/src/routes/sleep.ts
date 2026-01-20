import express from 'express';
import { database } from '../database/init.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get sleep logs
router.get('/logs', (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase();
    const { startDate, endDate, limit = 30 } = req.query;
    
    let query = `
      SELECT * FROM sleep_logs 
      WHERE user_id = ?
    `;
    const params: any[] = [req.userId];
    
    if (startDate && endDate) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY date DESC LIMIT ?';
    params.push(parseInt(limit as string));
    
    db.all(query, params, (err, logs) => {
      if (err) {
        console.error('Error fetching sleep logs:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch sleep logs'
        });
      }
      
      res.json({
        success: true,
        data: logs || []
      });
    });
  } catch (error) {
    console.error('Error in sleep logs route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Log sleep data
router.post('/log', (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase();
    const {
      date,
      wentToBedOnTime,
      dryEyeSeverity,
      disruptionCause,
      difficultyFallingAsleep,
      nightWakings,
      morningGrogginess,
      nextDayFatigue,
      notes
    } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }
    
    // Insert or update sleep log for the date
    const query = `
      INSERT OR REPLACE INTO sleep_logs (
        user_id, date, went_to_bed_on_time, dry_eye_severity,
        disruption_cause, difficulty_falling_asleep, night_wakings,
        morning_grogginess, next_day_fatigue, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      req.userId,
      date,
      wentToBedOnTime ? 1 : 0,
      dryEyeSeverity || null,
      disruptionCause || null,
      difficultyFallingAsleep ? 1 : 0,
      nightWakings || 0,
      morningGrogginess || null,
      nextDayFatigue || null,
      notes || null
    ];
    
    db.run(query, params, function(err) {
      if (err) {
        console.error('Error logging sleep data:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to log sleep data'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: this.lastID,
          message: 'Sleep data logged successfully'
        }
      });
    });
  } catch (error) {
    console.error('Error in sleep log route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update sleep log
router.put('/logs/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase();
    const logId = parseInt(req.params.id);
    const {
      date,
      wentToBedOnTime,
      dryEyeSeverity,
      disruptionCause,
      difficultyFallingAsleep,
      nightWakings,
      morningGrogginess,
      nextDayFatigue,
      notes
    } = req.body;

    if (!logId) {
      return res.status(400).json({
        success: false,
        error: 'Valid log ID is required'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }

    // First verify ownership
    const ownershipCheck = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id FROM sleep_logs WHERE id = ? AND user_id = ?',
        [logId, req.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!ownershipCheck) {
      return res.status(404).json({
        success: false,
        error: 'Sleep log not found'
      });
    }

    // Validate numeric ranges
    if (dryEyeSeverity !== null && dryEyeSeverity !== undefined) {
      if (dryEyeSeverity < 1 || dryEyeSeverity > 10) {
        return res.status(400).json({
          success: false,
          error: 'Dry eye severity must be between 1 and 10'
        });
      }
    }

    if (morningGrogginess !== null && morningGrogginess !== undefined) {
      if (morningGrogginess < 1 || morningGrogginess > 10) {
        return res.status(400).json({
          success: false,
          error: 'Morning grogginess must be between 1 and 10'
        });
      }
    }

    if (nextDayFatigue !== null && nextDayFatigue !== undefined) {
      if (nextDayFatigue < 1 || nextDayFatigue > 10) {
        return res.status(400).json({
          success: false,
          error: 'Next day fatigue must be between 1 and 10'
        });
      }
    }

    if (nightWakings !== null && nightWakings !== undefined) {
      if (nightWakings < 0) {
        return res.status(400).json({
          success: false,
          error: 'Night wakings cannot be negative'
        });
      }
    }

    // Validate disruption cause
    const validDisruptionCauses = ['dry_eye', 'digestive', 'pain', 'anxiety', 'other', 'none'];
    if (disruptionCause && !validDisruptionCauses.includes(disruptionCause)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid disruption cause'
      });
    }

    // Update the sleep log
    const updateQuery = `
      UPDATE sleep_logs SET
        date = ?,
        went_to_bed_on_time = ?,
        dry_eye_severity = ?,
        disruption_cause = ?,
        difficulty_falling_asleep = ?,
        night_wakings = ?,
        morning_grogginess = ?,
        next_day_fatigue = ?,
        notes = ?
      WHERE id = ? AND user_id = ?
    `;

    const params = [
      date,
      wentToBedOnTime ? 1 : 0,
      dryEyeSeverity || null,
      disruptionCause || null,
      difficultyFallingAsleep ? 1 : 0,
      nightWakings || 0,
      morningGrogginess || null,
      nextDayFatigue || null,
      notes || null,
      logId,
      req.userId
    ];

    await new Promise((resolve, reject) => {
      db.run(updateQuery, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });

    res.json({
      success: true,
      data: {
        id: logId,
        message: 'Sleep log updated successfully'
      }
    });

  } catch (error) {
    console.error('Error updating sleep log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sleep log'
    });
  }
});

// Delete sleep log
router.delete('/logs/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase();
    const logId = parseInt(req.params.id);

    if (!logId) {
      return res.status(400).json({
        success: false,
        error: 'Valid log ID is required'
      });
    }

    // First verify ownership
    const ownershipCheck = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id FROM sleep_logs WHERE id = ? AND user_id = ?',
        [logId, req.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!ownershipCheck) {
      return res.status(404).json({
        success: false,
        error: 'Sleep log not found'
      });
    }

    // Delete the sleep log
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM sleep_logs WHERE id = ? AND user_id = ?',
        [logId, req.userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });

    res.json({
      success: true,
      data: {
        message: 'Sleep log deleted successfully'
      }
    });

  } catch (error) {
    console.error('Error deleting sleep log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete sleep log'
    });
  }
});

// Get sleep insights
router.get('/insights', async (req: AuthenticatedRequest, res) => {
  try {
    const db = database.getDatabase();
    
    // Get average dry eye severity when went to bed on time
    const avgDryEye = await new Promise<any>((resolve, reject) => {
      db.get(`
        SELECT 
          AVG(dry_eye_severity) as avg_severity,
          COUNT(*) as days_tracked
        FROM sleep_logs 
        WHERE user_id = ? 
        AND went_to_bed_on_time = 1
        AND dry_eye_severity IS NOT NULL
      `, [req.userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    // Get most common disruption causes
    const disruptionCauses = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT 
          disruption_cause,
          COUNT(*) as count
        FROM sleep_logs 
        WHERE user_id = ? 
        AND disruption_cause IS NOT NULL
        GROUP BY disruption_cause
        ORDER BY count DESC
      `, [req.userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // Get correlation between dry eye severity and next day fatigue
    const correlation = await new Promise<any>((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as data_points,
          AVG(CASE WHEN dry_eye_severity > 5 THEN next_day_fatigue ELSE NULL END) as fatigue_when_worse,
          AVG(CASE WHEN dry_eye_severity <= 5 THEN next_day_fatigue ELSE NULL END) as fatigue_when_baseline
        FROM sleep_logs 
        WHERE user_id = ? 
        AND went_to_bed_on_time = 1
        AND dry_eye_severity IS NOT NULL
        AND next_day_fatigue IS NOT NULL
      `, [req.userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.json({
      success: true,
      data: {
        averageDryEyeSeverity: avgDryEye.avg_severity ? parseFloat(avgDryEye.avg_severity.toFixed(1)) : null,
        daysTracked: avgDryEye.days_tracked || 0,
        disruptionCauses: disruptionCauses,
        correlation: {
          dataPoints: correlation.data_points || 0,
          fatigueWhenDryEyeWorse: correlation.fatigue_when_worse ? parseFloat(correlation.fatigue_when_worse.toFixed(1)) : null,
          fatigueWhenDryEyeBaseline: correlation.fatigue_when_baseline ? parseFloat(correlation.fatigue_when_baseline.toFixed(1)) : null
        },
        insights: generateInsights(avgDryEye, disruptionCauses, correlation)
      }
    });
    
  } catch (error) {
    console.error('Error generating sleep insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights'
    });
  }
});

// Helper function to generate insights
function generateInsights(avgDryEye: any, disruptionCauses: any[], correlation: any): string[] {
  const insights: string[] = [];
  
  if (avgDryEye.avg_severity > 6) {
    insights.push('Your dry eye severity is consistently above baseline. Consider anti-inflammatory foods.');
  }
  
  if (disruptionCauses.length > 0 && disruptionCauses[0].disruption_cause === 'dry_eye') {
    insights.push('Dry eye is your primary sleep disruptor. Track which foods affect severity.');
  }
  
  if (correlation.fatigue_when_worse && correlation.fatigue_when_baseline) {
    const diff = correlation.fatigue_when_worse - correlation.fatigue_when_baseline;
    if (diff > 2) {
      insights.push(`Worse dry eye nights increase next-day fatigue by ${diff.toFixed(1)} points.`);
    }
  }
  
  if (correlation.data_points < 10) {
    insights.push('Continue tracking for more reliable patterns (need 10+ nights of data).');
  }
  
  return insights;
}

export default router;