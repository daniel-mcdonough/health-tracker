import express, { type Response } from 'express';
import { database } from '../database/init.js';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();
const db = database.getDatabase();

// Middleware
router.use(authenticateToken);

// Get all physical activities (default + custom)
router.get('/activities', async (req: AuthenticatedRequest, res: Response) => {
  const query = `
    SELECT * FROM physical_activities 
    WHERE user_id IS NULL OR user_id = ?
    ORDER BY category, name
  `;
  
  db.all(query, [req.userId], (err, activities) => {
    if (err) {
      console.error('Error fetching activities:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch activities' });
    }
    res.json({ success: true, data: activities });
  });
});

// Create custom activity
router.post('/activities', async (req: AuthenticatedRequest, res: Response) => {
  const { name, category, met_value } = req.body;
  
  if (!name || !category) {
    return res.status(400).json({ success: false, error: 'Name and category are required' });
  }
  
  const query = `
    INSERT INTO physical_activities (user_id, name, category, met_value, is_custom)
    VALUES (?, ?, ?, ?, 1)
  `;
  
  db.run(query, [req.userId, name, category, met_value || null], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ success: false, error: 'Activity with this name already exists' });
      }
      console.error('Error creating activity:', err);
      return res.status(500).json({ success: false, error: 'Failed to create activity' });
    }
    
    res.json({ 
      success: true, 
      data: { 
        id: this.lastID,
        user_id: req.userId,
        name,
        category,
        met_value,
        is_custom: true
      }
    });
  });
});

// Get activity logs for a date range
router.get('/logs', async (req: AuthenticatedRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  
  let query = `
    SELECT 
      pal.*,
      pa.name as activity_name,
      pa.category,
      pa.met_value
    FROM physical_activity_logs pal
    JOIN physical_activities pa ON pal.activity_id = pa.id
    WHERE pal.user_id = ?
  `;
  
  const params: any[] = [req.userId];
  
  if (start_date && end_date) {
    query += ' AND pal.date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ' AND pal.date >= ?';
    params.push(start_date);
  } else if (end_date) {
    query += ' AND pal.date <= ?';
    params.push(end_date);
  }
  
  query += ' ORDER BY pal.date DESC, pal.start_time DESC';
  
  db.all(query, params, (err, logs) => {
    if (err) {
      console.error('Error fetching activity logs:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch activity logs' });
    }
    res.json({ success: true, data: logs });
  });
});

// Log a physical activity
router.post('/logs', async (req: AuthenticatedRequest, res: Response) => {
  const { 
    activity_id, 
    date, 
    start_time, 
    duration_minutes, 
    intensity,
    calories_burned,
    distance_km,
    notes 
  } = req.body;
  
  if (!activity_id || !date || !start_time || !duration_minutes) {
    return res.status(400).json({ 
      success: false, 
      error: 'Activity, date, start time, and duration are required' 
    });
  }
  
  const query = `
    INSERT INTO physical_activity_logs 
    (user_id, activity_id, date, start_time, duration_minutes, intensity, calories_burned, distance_km, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [
    req.userId,
    activity_id,
    date,
    start_time,
    duration_minutes,
    intensity || null,
    calories_burned || null,
    distance_km || null,
    notes || null
  ], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Activity already logged for this date and time' 
        });
      }
      console.error('Error logging activity:', err);
      return res.status(500).json({ success: false, error: 'Failed to log activity' });
    }
    
    res.json({ 
      success: true, 
      data: { 
        id: this.lastID,
        message: 'Activity logged successfully'
      }
    });
  });
});

// Update activity log
router.put('/logs/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { 
    duration_minutes, 
    intensity,
    calories_burned,
    distance_km,
    notes 
  } = req.body;
  
  const query = `
    UPDATE physical_activity_logs
    SET 
      duration_minutes = ?,
      intensity = ?,
      calories_burned = ?,
      distance_km = ?,
      notes = ?
    WHERE id = ? AND user_id = ?
  `;
  
  db.run(query, [
    duration_minutes,
    intensity || null,
    calories_burned || null,
    distance_km || null,
    notes || null,
    id,
    req.userId
  ], function(err) {
    if (err) {
      console.error('Error updating activity log:', err);
      return res.status(500).json({ success: false, error: 'Failed to update activity log' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Activity log not found' });
    }
    
    res.json({ success: true, data: { message: 'Activity log updated successfully' } });
  });
});

// Delete activity log
router.delete('/logs/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const query = 'DELETE FROM physical_activity_logs WHERE id = ? AND user_id = ?';
  
  db.run(query, [id, req.userId], function(err) {
    if (err) {
      console.error('Error deleting activity log:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete activity log' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Activity log not found' });
    }
    
    res.json({ success: true, data: { message: 'Activity log deleted successfully' } });
  });
});

// Get activity statistics for a period
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  
  let query = `
    SELECT 
      COUNT(DISTINCT date) as active_days,
      COUNT(*) as total_sessions,
      SUM(duration_minutes) as total_minutes,
      AVG(duration_minutes) as avg_duration,
      SUM(calories_burned) as total_calories,
      SUM(distance_km) as total_distance,
      pa.category,
      COUNT(CASE WHEN pa.category = 'cardio' THEN 1 END) as cardio_sessions,
      COUNT(CASE WHEN pa.category = 'strength' THEN 1 END) as strength_sessions,
      COUNT(CASE WHEN pa.category = 'flexibility' THEN 1 END) as flexibility_sessions
    FROM physical_activity_logs pal
    JOIN physical_activities pa ON pal.activity_id = pa.id
    WHERE pal.user_id = ?
  `;
  
  const params: any[] = [req.userId];
  
  if (start_date && end_date) {
    query += ' AND pal.date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  
  db.get(query, params, (err, stats) => {
    if (err) {
      console.error('Error fetching activity stats:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch activity statistics' });
    }
    res.json({ success: true, data: stats });
  });
});

export default router;