const express = require('express');
const app = express();

const jobsRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const statusRoutes = require('./routes/status');
const authRoutes = require('./routes/auth');

const { startDecayWatcher } = require('./engines/decayWatcher');

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/status', statusRoutes);

// Start decay system
startDecayWatcher();

app.listen(3000, () => {
  console.log('Server running on port 3000');
});