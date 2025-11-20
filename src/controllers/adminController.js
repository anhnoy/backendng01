// Admin Controller
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'devsecret';

const User = require('../models/user');
const bcrypt = require('bcrypt');

exports.login = (req, res) => {
  const { email, password } = req.body;
  User.findOne({ where: { email } }).then(async user => {
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1d' });
    res.json({ user, token });
  }).catch(err => {
    res.status(500).json({ error: 'Server error' });
  });
};

exports.getCurrentUser = (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, SECRET);
    User.findByPk(decoded.id).then(user => {
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    }).catch(() => res.status(500).json({ error: 'Server error' }));
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
