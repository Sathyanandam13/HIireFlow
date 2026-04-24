const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Create job
router.post('/', authMiddleware, requireRole('company'), async (req, res) => {
  const { title, capacity } = req.body;
  const cId = req.user.id;

  try {
    const result = await pool.query(
      `INSERT INTO jobs (title, company_id, active_capacity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, cId, capacity]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pipeline
router.get('/:id/pipeline', authMiddleware, requireRole('company'), async (req, res) => {
  const { id } = req.params;

  try {
    const jobRes = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [id]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (jobRes.rows[0].company_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this job' });
    }

    const result = await pool.query(
      `SELECT a.*, ap.name, ap.email 
       FROM applications a
       JOIN applicants ap ON a.applicant_id = ap.id
       WHERE a.job_id = $1
       ORDER BY a.waitlist_position ASC NULLS FIRST`,
      [id]
    );

    const apps = result.rows;

    const metrics = {
      total: apps.length,
      active: apps.filter(a => a.status === 'active').length,
      pending_ack: apps.filter(a => a.status === 'pending_ack').length,
      waitlisted: apps.filter(a => a.status === 'waitlisted').length,
      completed: apps.filter(a => ['hired', 'rejected', 'withdrawn'].includes(a.status)).length
    };

    res.json({
      job: { capacity: jobRes.rows[0].active_capacity, ...jobRes.rows[0] },
      metrics,
      applications: apps
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get job summary
router.get('/:id/summary', authMiddleware, requireRole('company'), async (req, res) => {
  const { id } = req.params;

  try {
    const jobRes = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [id]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (jobRes.rows[0].company_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this job' });
    }

    const job = jobRes.rows[0];
    const capacity = job.active_capacity;

    const result = await pool.query(
      `SELECT status, COUNT(*) as count FROM applications WHERE job_id = $1 GROUP BY status`,
      [id]
    );

    const counts = { active: 0, pending_ack: 0, waitlisted: 0, hired: 0, rejected: 0, withdrawn: 0 };
    let total = 0;

    result.rows.forEach(row => {
      counts[row.status] = parseInt(row.count, 10);
      total += counts[row.status];
    });

    const slotsUsed = counts.active + counts.pending_ack;
    const availableSlots = Math.max(0, capacity - slotsUsed);

    res.json({
      job: { capacity, ...job },
      metrics: {
        total_applicants: total,
        active_count: counts.active,
        pending_count: counts.pending_ack,
        waitlist_count: counts.waitlisted,
        slots_used: slotsUsed,
        available_slots: availableSlots
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all jobs for a company
router.get('/', authMiddleware, requireRole('company'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs WHERE company_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Applicant gets open jobs (we need a way for applicants to list jobs to apply to)
router.get('/open', authMiddleware, requireRole('applicant'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT j.id, j.title, c.name as company_name 
      FROM jobs j 
      JOIN companies c ON j.company_id = c.id 
      WHERE j.is_open = true 
      ORDER BY j.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;