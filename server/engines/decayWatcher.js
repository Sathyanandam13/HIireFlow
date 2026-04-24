const pool = require('../db/pool');
const { STATES, assertValidTransition } = require('./stateMachine');
const { promoteNext } = require('./promotionEngine');
const { logEvent } = require('./auditLogger');

async function decayApplicant(app) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 🔒 Lock the job row to serialize waitlist position assignment!
    await client.query(
      `SELECT id FROM jobs WHERE id = $1 FOR UPDATE`,
      [app.job_id]
    );

    // 🧮 Find current max position
    const res = await client.query(
      `SELECT COALESCE(MAX(waitlist_position), 0) AS max_pos
       FROM applications
       WHERE job_id = $1 AND status = 'waitlisted'`,
      [app.job_id]
    );

    // ✅ FIX: Parse BIGINT from DB to prevent string concatenation
    const maxPos = Number(res.rows[0].max_pos) || 0;

    // ⚠️ Penalized position formula
    const BASE = 10000;
    const MULTIPLIER = 5000;

    const newPosition = maxPos + BASE + (app.decay_penalty * MULTIPLIER);

    const MAX_DECAY_RETRIES = 2;
    const isZombie = (app.decay_penalty + 1) >= MAX_DECAY_RETRIES;

    if (isZombie) {
      assertValidTransition(app.status, STATES.REJECTED);

      await client.query(
        `UPDATE applications
         SET status = 'rejected',
             decay_penalty = decay_penalty + 1,
             waitlist_position = NULL,
             promoted_at = NULL,
             ack_deadline = NULL
         WHERE id = $1`,
        [app.id]
      );

      await logEvent(client, {
        applicationId: app.id,
        jobId: app.job_id,
        from: STATES.PENDING_ACK,
        to: STATES.REJECTED,
        fromPosition: null,
        toPosition: null,
        reason: 'decay_limit_reached',
        triggeredBy: 'system',
        metadata: {
          decay_count: app.decay_penalty + 1
        }
      });
    } else {
      // ✅ Validate transition
      assertValidTransition(app.status, STATES.WAITLISTED);

      // 🔁 Move back to waitlist
      await client.query(
        `UPDATE applications
         SET status = 'waitlisted',
             waitlist_position = $1,
             decay_penalty = decay_penalty + 1,
             promoted_at = NULL,
             ack_deadline = NULL
         WHERE id = $2`,
        [newPosition, app.id]
      );

      // 📜 Log
      await logEvent(client, {
        applicationId: app.id,
        jobId: app.job_id,
        from: STATES.PENDING_ACK,
        to: STATES.WAITLISTED,
        fromPosition: null,
        toPosition: newPosition,
        reason: 'ack_timeout_decay',
        triggeredBy: 'system',
        metadata: {
          decay_count: app.decay_penalty + 1
        }
      });
    }

    // 🔁 Cascade: promote next
    await promoteNext(app.job_id, client);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Failed to decay application ${app.id}:`, err);
  } finally {
    client.release();
  }
}

async function runDecayCycle() {
  const client = await pool.connect();
  let expiredApps = [];

  try {
    // 🔍 Find expired pending_ack. Just SELECT here, decayApplicant gets its own lock.
    const res = await client.query(
      `SELECT *
       FROM applications
       WHERE status = 'pending_ack'
         AND ack_deadline < NOW()`
    );
    expiredApps = res.rows;
  } catch (err) {
    console.error('Failed to fetch expired applications:', err);
  } finally {
    client.release();
  }

  // ✅ FIX: Process each applicant in isolated transactions
  for (const app of expiredApps) {
    await decayApplicant(app);
  }
}

function startDecayWatcher() {
  console.log('Decay watcher started...');

  setInterval(() => {
    runDecayCycle();
  }, 3 * 60 * 1000); // every 3 minutes
}

module.exports = {
  startDecayWatcher,
  runDecayCycle,
};