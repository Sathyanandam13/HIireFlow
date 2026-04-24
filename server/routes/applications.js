const express = require('express');
const router = express.Router();

const { applyToJob } = require('../engines/admissionController');
const pool = require('../db/pool');
const { STATES, assertValidTransition, occupiesSlot } = require('../engines/stateMachine');
const { logEvent } = require('../engines/auditLogger');
const { promoteNext } = require('../engines/promotionEngine');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Get applicant's applications
router.get('/my', authMiddleware, requireRole('applicant'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, j.title as job_title, c.name as company_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      WHERE a.applicant_id = $1
      ORDER BY a.created_at DESC
    `, [req.user.id]);
    
    // enhance with queue position if waitlisted
    const applications = await Promise.all(result.rows.map(async (app) => {
      if (app.status === 'waitlisted') {
        const posRes = await pool.query(
          `SELECT COUNT(*) + 1 AS pos
           FROM applications
           WHERE job_id = $1
             AND status = 'waitlisted'
             AND waitlist_position < $2`,
          [app.job_id, app.waitlist_position]
        );
        app.queue_position = posRes.rows[0].pos;
      }
      return app;
    }));

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply
router.post('/:jobId/apply', authMiddleware, requireRole('applicant'), async (req, res) => {
  const { jobId } = req.params;
  const applicantId = req.user.id;

  try {
    const app = await applyToJob({ jobId, applicantId });
    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Acknowledge
router.post('/:id/acknowledge', authMiddleware, requireRole('applicant'), async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT * FROM applications WHERE id = $1 FOR UPDATE`,
      [id]
    );

    const app = result.rows[0];

    if (!app) throw new Error('Application not found');
    if (app.applicant_id !== req.user.id) throw new Error('Forbidden');

    if (app.status === STATES.ACTIVE) {
      await client.query('COMMIT');
      return res.json({ message: 'Already acknowledged' });
    }

    assertValidTransition(app.status, STATES.ACTIVE);

    if (new Date(app.ack_deadline) < new Date()) {
      throw new Error('Deadline expired');
    }

    await client.query(
      `UPDATE applications SET status = 'active', ack_deadline = NULL, waitlist_position = NULL WHERE id = $1`,
      [id]
    );

    await logEvent(client, {
      applicationId: id,
      jobId: app.job_id,
      from: STATES.PENDING_ACK,
      to: STATES.ACTIVE,
      reason: 'acknowledged',
      triggeredBy: `applicant:${id}`
    });

    await client.query('COMMIT');

    res.json({ success: true });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});


// Exit (reject/withdraw/hired)
router.post('/:id/exit', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // hired/rejected/withdrawn

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT a.*, j.company_id FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1 FOR UPDATE`,
      [id]
    );

    const app = result.rows[0];
    if (!app) throw new Error('Application not found');
    
    // Auth check: Admin (company) or user withdrawing
    if (req.user.role === 'company' && app.company_id !== req.user.id) {
      throw new Error('Forbidden');
    }
    if (req.user.role === 'applicant' && (app.applicant_id !== req.user.id || type !== 'withdrawn')) {
      throw new Error('Forbidden');
    }

    assertValidTransition(app.status, type);

    await client.query(
      `UPDATE applications SET status = $1, ack_deadline = NULL, waitlist_position = NULL WHERE id = $2`,
      [type, id]
    );

    await logEvent(client, {
      applicationId: id,
      jobId: app.job_id,
      from: app.status,
      to: type,
      reason: type,
      triggeredBy: 'admin'
    });

    // 🔥 IMPORTANT: free slot → promote next (only if occupying slot)
    if (occupiesSlot(app.status)) {
      await promoteNext(app.job_id, client);
    }

    await client.query('COMMIT');

    res.json({ success: true });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;    