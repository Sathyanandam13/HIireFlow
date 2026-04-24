DROP TABLE IF EXISTS pipeline_log CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS applicants CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS idempotency_keys CASCADE;
DROP TYPE IF EXISTS pipeline_status CASCADE;

CREATE TYPE pipeline_status AS ENUM (
  'active',
  'pending_ack',
  'waitlisted',
  'hired',
  'rejected',
  'withdrawn'
);

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  active_capacity INT NOT NULL CHECK (active_capacity > 0),
  acknowledgment_window_hrs INT NOT NULL DEFAULT 24,
  is_open BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  status pipeline_status NOT NULL DEFAULT 'waitlisted',
  waitlist_position BIGINT,
  decay_penalty INT DEFAULT 0,
  promoted_at TIMESTAMPTZ,
  ack_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);

CREATE TABLE pipeline_log (
  id BIGSERIAL PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  from_status pipeline_status,
  to_status pipeline_status NOT NULL,
  from_position BIGINT,
  to_position BIGINT,
  reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  response JSONB NOT NULL,
  status_code INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_applications_decay ON applications(status, ack_deadline);
CREATE INDEX idx_applications_queue ON applications(job_id, status, waitlist_position);
CREATE INDEX idx_jobs_company ON jobs(company_id);