# 🚀 HireFlow — Self-Moving Hiring Pipeline

HireFlow is a lightweight, automated hiring pipeline built for small engineering teams.

Instead of managing candidates manually through spreadsheets, HireFlow introduces a **self-regulating system** where:

* Hiring capacity is strictly enforced
* Waitlists are automatically managed
* Inactive candidates are handled without manual effort
* The pipeline continuously moves forward

👉 The system **runs itself**.

---

# 🧠 What This Project Solves

Small teams struggle with:

* Losing track of applicants
* Manually following up with inactive candidates
* Inefficient waitlist handling

HireFlow transforms this into:

```text
A fully automated, state-driven hiring pipeline
```

---

# 🎯 Requirements Coverage (Core Challenge Mapping)

This system fully implements all core requirements of the challenge.

---

## 1. Company creates a job with defined active capacity

* Each job is created with `active_capacity`
* Only this number of applicants can be in:

  * `active`
  * `pending_ack`

👉 Enforced strictly during application admission.

---

## 2. Applications beyond capacity enter waitlist (not rejection)

* When capacity is full:

  * New applicants are assigned `status = waitlisted`
* No applicant is rejected due to capacity

👉 Queue managed using **gap-based indexing**

---

## 3. Automatic promotion when slot frees

When a slot becomes available (reject / withdraw / decay):

* System triggers `promoteNext()`
* Next waitlisted applicant moves to `pending_ack`

👉 Fully automated — no manual intervention

---

## 4. Applicant can track status and queue position

Applicants can:

* View current status
* View queue position

Queue position is calculated dynamically:

```sql
COUNT(*) WHERE waitlist_position < current
```

👉 Always accurate, even after reordering

---

## 5. Concurrency Handling (Simultaneous Applications)

###  Problem

Two applicants apply at the same time for the last available slot.

Without protection:

* Both may enter `pending_ack`
* Capacity constraint breaks

---

###  Our Approach

We use **PostgreSQL row-level locking inside transactions**

### Flow:

```sql
BEGIN;

SELECT id, active_capacity 
FROM jobs 
WHERE id = $1 
FOR UPDATE;

SELECT COUNT(*) 
FROM applications 
WHERE job_id = $1 
AND status IN ('active', 'pending_ack');

-- decision happens here

COMMIT;
```

---

###  Behavior Under Concurrency

* Request A acquires lock → proceeds
* Request B waits
* A commits → updates slot count
* B resumes → sees updated state → goes to waitlist

---

###  Result

* Capacity NEVER exceeded
* No race conditions
* Fully deterministic behavior

---

###  Why This Approach?

* Strong consistency guarantee
* No external queue required
* Simpler and reliable

Tradeoff:

* Slight delay under concurrent requests (acceptable)

---

## 6. Full Pipeline Traceability (Audit Logging)

Every state transition is logged:

* `from_status`
* `to_status`
* `reason`
* `triggered_by`

Example:

```text
pending_ack → waitlisted (triggered_by: system_decay)
```

👉 Entire pipeline is reconstructable

---

## 7. Inactivity Decay & Self-Healing Cascade

### Step 1 — Decay

If applicant doesn’t respond:

```text
pending_ack → waitlisted
```

---

### Step 2 — Penalized Repositioning

```text
new_position = max_position + (1000 × penalty_level)
```

* `decay_penalty` increases with each decay

---

### Step 3 — Cascade

* Slot becomes free
* Next candidate promoted automatically

👉 Pipeline never stalls

---

## Summary

The system ensures:

* No manual tracking
* No pipeline stagnation
* Fair queue behavior
* Robust concurrency handling

👉 A fully **self-regulating hiring system**

---

# Key Features

* Capacity-limited pipeline
* Automated waitlist queue
* Concurrency-safe admission
* Decay + retry logic
* Full audit logging
* Multi-tenant authentication (Company & Applicant)

---

#  Tech Stack

* **Frontend:** React (Vite) + Tailwind
* **Backend:** Node.js + Express
* **Database:** PostgreSQL
* **Auth:** JWT + bcrypt

---

#  System Flow

1. Apply → admitted or waitlisted
2. Exit → triggers promotion
3. No response → decay → cascade
4. Applicant tracks progress

---

#  Demo Flow

1. Create job (capacity = 2)
2. Apply 4 applicants
3. Observe waitlist
4. Reject one → auto promotion
5. Let one expire → decay + cascade
6. View applicant dashboard

---

#  API Endpoints

## Auth

* POST `/api/auth/company/register`
* POST `/api/auth/company/login`
* POST `/api/auth/applicant/register`
* POST `/api/auth/applicant/login`

---

## Jobs

* POST `/api/jobs`
* GET `/api/jobs`
* GET `/api/jobs/:id/pipeline`

---

## Applications

* POST `/api/applications/:jobId/apply`
* GET `/api/applications/my`

---

#  Setup & Run

```bash
git clone <repo>
cd hireflow
docker-compose up -d
cd server && npm install && node index.js
cd client && npm install && npm run dev
```

---

#  Design Decisions & Tradeoffs

* PostgreSQL locking over queues → consistency
* Polling over WebSockets → simplicity
* Gap indexing → efficient queue management

Limitations:

* Single-node system
* No real-time push
* No email notifications

---

# 🤖 AI Collaboration

AI tools were used for:

* Architecture exploration
* Debugging environment issues
* Identifying edge cases

All critical logic (concurrency, queue, state transitions) was **manually validated and refined**.

---

# 📌 Highlights

* Concurrency-safe system
* Self-healing pipeline
* Real-world multi-tenant design
* Clean architecture

---

# 🏁 Final Thought

HireFlow turns hiring into:

```text
A system that manages itself
```

Where:

* No candidate blocks progress
* No manual tracking is needed
* The pipeline continuously adapts

---


