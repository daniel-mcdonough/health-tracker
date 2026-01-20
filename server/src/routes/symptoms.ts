import { Router, type Request, type Response } from 'express';
import { database } from '../database/init.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Use JWT authentication
router.use(authenticateToken);

/**
 * Get symptoms for a user
 * GET /api/symptoms
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = database.getDatabase();
    
    const query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.user_id as userId,
        s.category_id as categoryId,
        sc.name as categoryName,
        sc.color as categoryColor
      FROM symptoms s
      JOIN symptom_categories sc ON s.category_id = sc.id
      WHERE s.user_id = ?
      GROUP BY s.name, sc.name
      ORDER BY sc.name, s.name
    `;

    db.all(query, [req.userId], (err, rows: any[]) => {
      if (err) {
        console.error('Error fetching symptoms:', err);
        return res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      const symptoms = rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        userId: row.userId,
        categoryId: row.categoryId,
        category: row.categoryName,
        categoryColor: row.categoryColor
      }));

      return res.json({
        success: true,
        data: symptoms
      });
    });

  } catch (error) {
    console.error('Error in symptoms GET:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create a new symptom
 * POST /api/symptoms
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, categoryId } = req.body;
    
    // Validation
    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Name and category ID are required'
      });
    }

    const db = database.getDatabase();
    
    // Check if symptom already exists for this user
    db.get(
      'SELECT id FROM symptoms WHERE user_id = ? AND name = ? AND category_id = ?',
      [req.userId, name, categoryId],
      (err, existingSymptom: any) => {
        if (err) {
          console.error('Error checking existing symptom:', err);
          return res.status(500).json({
            success: false,
            error: 'Database error'
          });
        }
        
        if (existingSymptom) {
          return res.status(400).json({
            success: false,
            error: 'Symptom with this name already exists in this category'
          });
        }
        
        // Insert new symptom
        db.run(
          'INSERT INTO symptoms (user_id, category_id, name, description) VALUES (?, ?, ?, ?)',
          [req.userId, categoryId, name, description || ''],
          function(err) {
            if (err) {
              console.error('Error creating symptom:', err);
              return res.status(500).json({
                success: false,
                error: 'Failed to create symptom'
              });
            }
            
            // Fetch the created symptom with category info
            const symptomId = this.lastID;
            db.get(
              `SELECT 
                s.id,
                s.name,
                s.description,
                s.user_id as userId,
                s.category_id as categoryId,
                sc.name as categoryName,
                sc.color as categoryColor
              FROM symptoms s
              JOIN symptom_categories sc ON s.category_id = sc.id
              WHERE s.id = ?`,
              [symptomId],
              (err, row: any) => {
                if (err) {
                  console.error('Error fetching created symptom:', err);
                  return res.status(500).json({
                    success: false,
                    error: 'Symptom created but failed to fetch details'
                  });
                }
                
                const symptom = {
                  id: row.id,
                  name: row.name,
                  description: row.description,
                  userId: row.userId,
                  categoryId: row.categoryId,
                  category: row.categoryName,
                  categoryColor: row.categoryColor
                };
                
                res.status(201).json({
                  success: true,
                  data: symptom,
                  message: 'Symptom created successfully'
                });
              }
            );
          }
        );
      }
    );

  } catch (error) {
    console.error('Error in symptoms POST:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get symptom logs for a user within a date range
 * GET /api/symptoms/logs?startDate=2024-01-01&endDate=2024-01-31
 */
router.get('/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        sl.id,
        sl.symptom_id as symptomId,
        sl.severity,
        sl.time,
        sl.notes,
        sl.date,
        sl.logged_at as loggedAt,
        s.name as symptomName,
        sc.name as categoryName,
        sc.color as categoryColor
      FROM symptom_logs sl
      JOIN symptoms s ON sl.symptom_id = s.id
      JOIN symptom_categories sc ON s.category_id = sc.id
      WHERE sl.user_id = ?
    `;
    const params: any[] = [req.userId];

    if (startDate && endDate) {
      query += ` AND sl.date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY sl.date DESC, sl.logged_at DESC LIMIT ?`;
    params.push(parseInt(limit as string));

    const db = database.getDatabase();
    db.all(query, params, (err, rows: any[]) => {
      if (err) {
        console.error('Error fetching symptom logs:', err);
        return res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      const logs = rows.map(row => ({
        id: row.id,
        symptomId: row.symptomId,
        symptomName: row.symptomName,
        category: row.categoryName,
        categoryColor: row.categoryColor,
        severity: row.severity,
        time: row.time,
        notes: row.notes,
        date: row.date,
        loggedAt: row.loggedAt
      }));

      return res.json({
        success: true,
        data: logs
      });
    });

  } catch (error) {
    console.error('Error in symptom logs GET:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create a new symptom log
 * POST /api/symptoms/logs
 */
router.post('/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symptomId, severity, time, notes, date } = req.body;

    // Validation
    if (!symptomId || !severity || !time || !date) {
      return res.status(400).json({
        success: false,
        error: 'Symptom ID, severity, time, and date are required'
      });
    }

    if (severity < 1 || severity > 10) {
      return res.status(400).json({
        success: false,
        error: 'Severity must be between 1 and 10'
      });
    }

    const query = `
      INSERT INTO symptom_logs (user_id, symptom_id, severity, time, notes, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const db = database.getDatabase();
    db.run(query, [req.userId, symptomId, severity, time, notes || null, date], function(err) {
      if (err) {
        console.error('Error creating symptom log:', err);
        return res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      return res.status(201).json({
        success: true,
        data: {
          id: this.lastID,
          message: 'Symptom logged successfully'
        }
      });
    });

  } catch (error) {
    console.error('Error in symptom logs POST:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update a symptom log
 * PUT /api/symptoms/logs/:id
 */
router.put('/logs/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { symptomId, severity, time, notes, date } = req.body;

    // Validation
    if (!symptomId || !severity || !time || !date) {
      return res.status(400).json({
        success: false,
        error: 'Symptom ID, severity, time, and date are required'
      });
    }

    if (severity < 1 || severity > 10) {
      return res.status(400).json({
        success: false,
        error: 'Severity must be between 1 and 10'
      });
    }

    const db = database.getDatabase();
    
    // First verify the log belongs to the user
    db.get(
      'SELECT id FROM symptom_logs WHERE id = ? AND user_id = ?',
      [id, req.userId],
      (err, log) => {
        if (err) {
          console.error('Error checking symptom log ownership:', err);
          return res.status(500).json({
            success: false,
            error: 'Database error'
          });
        }

        if (!log) {
          return res.status(404).json({
            success: false,
            error: 'Symptom log not found'
          });
        }

        // Update the symptom log
        db.run(
          'UPDATE symptom_logs SET symptom_id = ?, severity = ?, time = ?, notes = ?, date = ? WHERE id = ? AND user_id = ?',
          [symptomId, severity, time, notes || '', date, id, req.userId],
          function(err) {
            if (err) {
              console.error('Error updating symptom log:', err);
              return res.status(500).json({
                success: false,
                error: 'Failed to update symptom log'
              });
            }

            res.json({
              success: true,
              data: { id: parseInt(id) }
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error updating symptom log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update symptom log'
    });
  }
});

/**
 * Delete a symptom log
 * DELETE /api/symptoms/logs/:id
 */
router.delete('/logs/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const db = database.getDatabase();
    db.run(
      'DELETE FROM symptom_logs WHERE id = ? AND user_id = ?',
      [id, req.userId],
      function(err) {
        if (err) {
          console.error('Error deleting symptom log:', err);
          return res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Symptom log not found'
          });
        }

        return res.json({
          success: true,
          message: 'Symptom log deleted successfully'
        });
      }
    );

  } catch (error) {
    console.error('Error in symptom logs DELETE:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;