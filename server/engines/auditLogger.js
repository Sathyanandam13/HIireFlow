async function logEvent(client, {
  applicationId,
  jobId,
  from,
  to,
  fromPosition = null,
  toPosition = null,
  reason,
  triggeredBy,
  metadata = {}
}) {
  if (!to) {
    throw new Error('Audit log must have a target state');
  }

  await client.query(
    `INSERT INTO pipeline_log
     (application_id, job_id, from_status, to_status,
      from_position, to_position, reason, triggered_by, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      applicationId,
      jobId,
      from,
      to,
      fromPosition,
      toPosition,
      reason,
      triggeredBy,
      metadata
    ]
  );
}

module.exports = {
  logEvent,
};