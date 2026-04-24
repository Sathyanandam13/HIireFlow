const pool = require('../db/pool');
const { STATES } = require('./stateMachine');
const { logEvent } = require('./auditLogger');

async function applyToJob({ jobId, applicantId }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 🔒 Lock job row (prevents race condition)
    const jobRes = await client.query(
      `SELECT id, active_capacity FROM jobs WHERE id = $1 FOR UPDATE`,
      [jobId]
    );

    if (jobRes.rows.length === 0) {
      throw new Error('Job not found');
    }

    // 🚫 Prevent duplicate application
    const existing = await client.query(
      `SELECT id FROM applications 
       WHERE job_id = $1 AND applicant_id = $2`,
      [jobId, applicantId]
    );

    if (existing.rows.length > 0) {
      throw new Error('Already applied to this job');
    }

    const job = jobRes.rows[0];

    // 🔢 Count occupied slots (active + pending_ack)
    const countRes = await client.query(
      `SELECT COUNT(*) FROM applications
       WHERE job_id = $1 AND status IN ('active', 'pending_ack')`,
      [jobId]
    );

    const occupied = parseInt(countRes.rows[0].count, 10);

    let status;
    let waitlistPosition = null;

    if (occupied < job.active_capacity) {
      status = STATES.PENDING_ACK;
    } else {
      status = STATES.WAITLISTED;

      // 🧮 Gap-based queue (FIXED: numeric conversion)
      const posRes = await client.query(
        `SELECT COALESCE(MAX(waitlist_position), 0) AS max_pos
         FROM applications
         WHERE job_id = $1 AND status = 'waitlisted'`,
        [jobId]
      );

      const maxPos = Number(posRes.rows[0].max_pos) || 0;
      waitlistPosition = maxPos + 1000;
    }

    // ⏳ Handle timestamps in JS
    let promotedAt = null;
    let ackDeadline = null;

    if (status === STATES.PENDING_ACK) {
      promotedAt = new Date();
      ackDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // 📝 Insert application
    const insertRes = await client.query(
      `INSERT INTO applications 
       (job_id, applicant_id, status, waitlist_position, promoted_at, ack_deadline)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        jobId,
        applicantId,
        status,
        waitlistPosition,
        promotedAt,
        ackDeadline
      ]
    );

    const application = insertRes.rows[0];

    // 📜 Audit log
    await logEvent(client, {
      applicationId: application.id,
      jobId,
      from: null,
      to: status,
      reason: 'applied',
      triggeredBy: `applicant:${application.id}`
    });

    await client.query('COMMIT');

    return application;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  applyToJob,
};