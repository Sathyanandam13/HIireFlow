const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM applications WHERE access_token = $1`,
      [token]
    );

    const app = result.rows[0];
    if (!app) return res.status(404).json({ error: 'Not found' });

    let position = null;

    if (app.status === 'waitlisted') {
      const posRes = await pool.query(
        `SELECT COUNT(*) + 1 AS pos
         FROM applications
         WHERE job_id = $1
           AND status = 'waitlisted'
           AND waitlist_position < $2`,
        [app.job_id, app.waitlist_position]
      );

      position = posRes.rows[0].pos;
    }

    res.json({
      id: app.id,
      status: app.status,
      position,
      ack_deadline: app.ack_deadline
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;