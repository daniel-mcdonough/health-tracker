import { Router, type Request, type Response } from 'express';
import { database } from '../database/init.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Use JWT authentication
router.use(authenticateToken);

/**
 * Get bowel movements for a user within a date range
 * GET /api/bowel-movements?startDate=2024-01-01&endDate=2024-01-31
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    
    let query = `
      SELECT * FROM bowel_movements 
      WHERE user_id = ?
    `;
    const params: any[] = [req.userId];

    if (startDate && endDate) {
      query += ` AND date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY date DESC, time DESC LIMIT ?`;
    params.push(parseInt(limit as string));

    const db = database.getDatabase();
    db.all(query, params, (err, rows: any[]) => {
      if (err) {
        console.error('Error fetching bowel movements:', err);
        res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      } else {
        const movements = rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          date: row.date,
          time: row.time,
          bristolScale: row.bristol_scale,
          color: row.color,
          size: row.size,
          urgency: row.urgency,
          easeOfPassage: row.ease_of_passage,
          bloodPresent: Boolean(row.blood_present),
          mucusPresent: Boolean(row.mucus_present),
          notes: row.notes,
          loggedAt: row.logged_at
        }));

        return res.json({
          success: true,
          data: movements
        });
      }
    });

  } catch (error) {
    console.error('Error in bowel movements GET:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create a new bowel movement log
 * POST /api/bowel-movements
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      date,
      time,
      bristolScale,
      color,
      size,
      urgency,
      easeOfPassage,
      bloodPresent = false,
      mucusPresent = false,
      notes
    } = req.body;

    // Validation
    if (!date || !time || !bristolScale || !color || !size) {
      return res.status(400).json({
        success: false,
        error: 'Date, time, Bristol scale, color, and size are required'
      });
    }

    if (bristolScale < 1 || bristolScale > 7) {
      return res.status(400).json({
        success: false,
        error: 'Bristol scale must be between 1 and 7'
      });
    }

    const validColors = ['brown', 'yellow', 'green', 'black', 'red', 'pale', 'clay'];
    if (!validColors.includes(color)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid color. Must be one of: ' + validColors.join(', ')
      });
    }

    const validSizes = ['small', 'medium', 'large'];
    if (!validSizes.includes(size)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid size. Must be one of: ' + validSizes.join(', ')
      });
    }

    const query = `
      INSERT INTO bowel_movements (
        user_id, date, time, bristol_scale, color, size, 
        urgency, ease_of_passage, blood_present, mucus_present, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const db = database.getDatabase();
    db.run(
      query,
      [
        req.userId,
        date,
        time,
        bristolScale,
        color,
        size,
        urgency || null,
        easeOfPassage || null,
        bloodPresent ? 1 : 0,
        mucusPresent ? 1 : 0,
        notes || null
      ],
      function(err) {
        if (err) {
          console.error('Error creating bowel movement:', err);
          res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        } else {
          return res.status(201).json({
            success: true,
            data: {
              id: this.lastID,
              message: 'Bowel movement logged successfully'
            }
          });
        }
      }
    );

  } catch (error) {
    console.error('Error in bowel movements POST:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update a bowel movement log
 * PUT /api/bowel-movements/:id
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      date,
      time,
      bristolScale,
      color,
      size,
      urgency,
      easeOfPassage,
      bloodPresent,
      mucusPresent,
      notes
    } = req.body;

    const query = `
      UPDATE bowel_movements SET
        date = ?, time = ?, bristol_scale = ?, color = ?, size = ?,
        urgency = ?, ease_of_passage = ?, blood_present = ?, mucus_present = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `;

    const db = database.getDatabase();
    db.run(
      query,
      [
        date, time, bristolScale, color, size,
        urgency || null, easeOfPassage || null,
        bloodPresent ? 1 : 0, mucusPresent ? 1 : 0, notes || null,
        id, req.userId
      ],
      function(err) {
        if (err) {
          console.error('Error updating bowel movement:', err);
          res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        } else if (this.changes === 0) {
          res.status(404).json({
            success: false,
            error: 'Bowel movement not found'
          });
        } else {
          res.json({
            success: true,
            message: 'Bowel movement updated successfully'
          });
        }
      }
    );

  } catch (error) {
    console.error('Error in bowel movements PUT:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete a bowel movement log
 * DELETE /api/bowel-movements/:id
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const db = database.getDatabase();
    db.run(
      'DELETE FROM bowel_movements WHERE id = ? AND user_id = ?',
      [id, req.userId],
      function(err) {
        if (err) {
          console.error('Error deleting bowel movement:', err);
          res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        } else if (this.changes === 0) {
          res.status(404).json({
            success: false,
            error: 'Bowel movement not found'
          });
        } else {
          res.json({
            success: true,
            message: 'Bowel movement deleted successfully'
          });
        }
      }
    );

  } catch (error) {
    console.error('Error in bowel movements DELETE:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get bowel movement statistics
 * GET /api/bowel-movements/stats
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));
    const startDateStr = startDate.toISOString().split('T')[0];

    const db = database.getDatabase();
    
    // Get various statistics
    const queries = {
      total: 'SELECT COUNT(*) as count FROM bowel_movements WHERE user_id = ? AND date >= ?',
      avgBristol: 'SELECT AVG(bristol_scale) as avg FROM bowel_movements WHERE user_id = ? AND date >= ?',
      colorDistribution: `
        SELECT color, COUNT(*) as count 
        FROM bowel_movements 
        WHERE user_id = ? AND date >= ? 
        GROUP BY color
      `,
      bristolDistribution: `
        SELECT bristol_scale, COUNT(*) as count 
        FROM bowel_movements 
        WHERE user_id = ? AND date >= ? 
        GROUP BY bristol_scale 
        ORDER BY bristol_scale
      `,
      recentTrend: `
        SELECT date, COUNT(*) as count, AVG(bristol_scale) as avgBristol
        FROM bowel_movements 
        WHERE user_id = ? AND date >= ? 
        GROUP BY date 
        ORDER BY date DESC 
        LIMIT 7
      `
    };

    const results: any = {};

    // Execute queries in parallel
    const promises = Object.entries(queries).map(([key, query]) => {
      return new Promise((resolve, reject) => {
        if (key === 'total' || key === 'avgBristol') {
          db.get(query, [req.userId, startDateStr], (err, row) => {
            if (err) reject(err);
            else resolve([key, row]);
          });
        } else {
          db.all(query, [req.userId, startDateStr], (err, rows) => {
            if (err) reject(err);
            else resolve([key, rows]);
          });
        }
      });
    });

    const queryResults = await Promise.all(promises) as Array<[string, any]>;
    queryResults.forEach(([key, result]) => {
      results[key] = result;
    });

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        totalMovements: results.total?.count || 0,
        averageBristolScale: Math.round((results.avgBristol?.avg || 0) * 10) / 10,
        colorDistribution: results.colorDistribution || [],
        bristolDistribution: results.bristolDistribution || [],
        recentTrend: results.recentTrend || []
      }
    });

  } catch (error) {
    console.error('Error in bowel movements stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;