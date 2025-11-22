const User = require('../models/user');
const { hashPassword } = require('../utils/hash');

exports.createUser = async (req, res) => {
  try {
    const {
      name,
      status,
      lastLogin,
      phone,
      profileImage,
      note,
      languages,
      email,
      password,
      role
    } = req.body;
    if (role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot create superadmin via API' });
    }
    let lanId = null;
    // superadmin สร้าง user ได้ทุก role (lan, op, gn)
    // lan สร้าง op/gn ให้ผูก lanId
    if ((role === 'op' || role === 'gn') && req.user.role === 'lan') {
      lanId = req.user.id;
    }
    // superadmin สร้าง user ไม่ต้องผูก lanId
    const hashed = await hashPassword(password);
    const user = await User.create({
      name,
      status,
      lastLogin,
      phone,
      profileImage,
      note,
      languages,
      email,
      password: hashed,
      role,
      lanId
    });
    // คืนข้อมูลครบทุกฟิลด์ (ยกเว้น password)
    const { id, ...rest } = user.get({ plain: true });
    delete rest.password;
    res.status(201).json({ id, ...rest });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    let where = {};
    // lan เห็นเฉพาะ op/gn ของตัวเอง
    if (req.user.role === 'lan') {
      where = { lanId: req.user.id };
    }
    const users = await User.findAll({ where, attributes: { exclude: ['password'] } });
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const {
      name,
      status,
      lastLogin,
      phone,
      profileImage,
      note,
      languages,
      email,
      password,
      role
    } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot set role to superadmin' });
    }
    user.name = name ?? user.name;
    user.status = status ?? user.status;
    user.lastLogin = lastLogin ?? user.lastLogin;
    user.phone = phone ?? user.phone;
    user.profileImage = profileImage ?? user.profileImage;
    user.note = note ?? user.note;
    user.languages = languages ?? user.languages;
    user.email = email ?? user.email;
    user.role = role ?? user.role;
    if (password) user.password = await hashPassword(password);
    await user.save();
    const { id, ...rest } = user.get({ plain: true });
    delete rest.password;
    res.json({ id, ...rest });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
