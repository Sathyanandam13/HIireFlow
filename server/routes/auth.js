const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const SALT_ROUNDS = 10;

// Company Register
router.post('/company/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO companies (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email`,
      [name, email, hash]
    );
    res.json({ message: 'Company registered successfully', company: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Company Login
router.post('/company/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(`SELECT * FROM companies WHERE email = $1`, [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const company = result.rows[0];
    const match = await bcrypt.compare(password, company.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: company.id, role: 'company' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: company.id, name: company.name, email: company.email, role: 'company' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Applicant Register
router.post('/applicant/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO applicants (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email`,
      [name, email, hash]
    );
    res.json({ message: 'Applicant registered successfully', applicant: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Applicant Login
router.post('/applicant/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(`SELECT * FROM applicants WHERE email = $1`, [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const applicant = result.rows[0];
    const match = await bcrypt.compare(password, applicant.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: applicant.id, role: 'applicant' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: applicant.id, name: applicant.name, email: applicant.email, role: 'applicant' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Me
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'company') {
      const result = await pool.query(`SELECT id, name, email FROM companies WHERE id = $1`, [decoded.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json({ user: { ...result.rows[0], role: 'company' } });
    } else {
      const result = await pool.query(`SELECT id, name, email FROM applicants WHERE id = $1`, [decoded.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json({ user: { ...result.rows[0], role: 'applicant' } });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
});

module.exports = router;
