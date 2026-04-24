const pool = require('../db/pool');
const { STATES, assertValidTransition } = require('./stateMachine');
const { logEvent } = require('./auditLogger');

// 🔥 Retry limit (single source of truth)
const MAX_DECAY_RETRIES = 2;

async function promoteNext(jobId, clientParam = null) {
  const client = clientParam || await pool.connect();

  try {
    if (!clientParam) await client.query('BEGIN');

    // 🔍 Select next eligible candidate (WITH retry filter)
    const res = await client.query(
      `SELECT * FROM applications
       WHERE job_id = $1 
         AND status = 'waitlisted'
         AND decay_penalty < $2
       ORDER BY waitlist_position ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [jobId, MAX_DECAY_RETRIES]
    );

    // 🚫 No eligible candidate
    if (res.rows.length === 0) {
      console.log('No eligible candidates for promotion (retry limit reached)');
      if (!clientParam) await client.query('COMMIT');
      return null;
    }

    const app = res.rows[0];

    // ✅ Validate transition
    assertValidTransition(app.status, STATES.PENDING_ACK);

    // 🚀 Promote
    await client.query(
      `UPDATE applications
       SET status = 'pending_ack',
           waitlist_position = NULL,
           promoted_at = NOW(),
           ack_deadline = NOW() + INTERVAL '24 hours'
       WHERE id = $1`,
      [app.id]
    );

    // 📜 Log event
    await logEvent(client, {
      applicationId: app.id,
      jobId,
      from: STATES.WAITLISTED,
      to: STATES.PENDING_ACK,
      fromPosition: app.waitlist_position,
      toPosition: null,
      reason: 'promoted',
      triggeredBy: 'system'
    });

    if (!clientParam) await client.query('COMMIT');

    return app;

  } catch (err) {
    if (!clientParam) await client.query('ROLLBACK');
    throw err;
  } finally {
    if (!clientParam) client.release();
  }
}

module.exports = {
  promoteNext,
};