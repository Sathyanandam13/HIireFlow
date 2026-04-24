const STATES = {
  WAITLISTED: 'waitlisted',
  PENDING_ACK: 'pending_ack',
  ACTIVE: 'active',
  HIRED: 'hired',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
};


const VALID_TRANSITIONS = {
  waitlisted: ['pending_ack', 'rejected', 'withdrawn'],
  pending_ack: ['active', 'waitlisted', 'rejected', 'withdrawn'], // ack or decay
  active: ['hired', 'rejected', 'withdrawn'],
  hired: [],
  rejected: [],
  withdrawn: [],
};

const OCCUPIES_SLOT = new Set([
  STATES.PENDING_ACK,
  STATES.ACTIVE
]);


const FREES_SLOT = new Set([
  STATES.HIRED,
  STATES.REJECTED,
  STATES.WITHDRAWN
]);

function assertValidTransition(from, to) {
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`);
  }
}


function occupiesSlot(status) {
  return OCCUPIES_SLOT.has(status);
}

function freesSlot(status) {
  return FREES_SLOT.has(status);
}


module.exports = {
  STATES,
  VALID_TRANSITIONS,
  OCCUPIES_SLOT,
  FREES_SLOT,
  assertValidTransition,
  occupiesSlot,
  freesSlot,
};