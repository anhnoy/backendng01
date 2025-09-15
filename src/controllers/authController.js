// Logout: แค่ตอบ success (frontend ต้องลบ token เอง)
exports.logout = (req, res) => {
  res.status(200).json({ message: 'Logged out' });
};

const User = require('../models/user');
const { hashPassword, comparePassword } = require('../utils/hash');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

exports.register = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot create superadmin via API' });
    }
    const hashed = await hashPassword(password);
    const user = await User.create({ email, password: hashed, role });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    console.error('Register error:', err); // เพิ่ม log error
    res.status(400).json({ error: err.message || JSON.stringify(err) });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await comparePassword(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '1d' });
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
