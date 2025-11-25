const User = require('../models/user');
const { Op } = require('sequelize');
const roleOrder = ['superadmin', 'admin', 'staff', 'guide'];
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
    let adminId = null;
    // superadmin สร้าง user ได้ทุก role (admin, staff, guide)
    // admin สร้าง staff/guide ให้ผูก adminId
    if ((role === 'staff' || role === 'guide') && req.user.role === 'admin') {
      adminId = req.user.id;
    }
    // superadmin สร้าง user ไม่ต้องผูก adminId
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
      adminId
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
    const myRole = req.user.role;
    if (myRole === 'superadmin') {
      // เห็นทุก user
      // ไม่ต้อง filter
    } else if (myRole === 'admin') {
      // เห็น admin ทุกคน + staff/guide ทุกคน
      where = {
        role: ['admin', 'staff', 'guide']
      };
    } else if (myRole === 'staff') {
      // เห็น staff ทุกคน + guide ทุกคน
      where = { role: ['staff', 'guide'] };
    } else if (myRole === 'guide') {
      // เห็น guide ทุกคน
      where = { role: 'guide' };
    }
    const users = await User.findAll({ where, attributes: { exclude: ['password'] } });

    // นับจำนวนแต่ละ role
    const roles = ['superadmin', 'admin', 'staff', 'guide'];
    const counts = {};
    for (const role of roles) {
      counts[role] = users.filter(u => u.role === role).length;
    }

    res.json({
      users,
      counts
    });
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
    // อนุญาตให้แก้ไขได้เฉพาะ user ที่ role เล็กกว่าตัวเองเท่านั้น
    const myRole = req.user.role;
    // superadmin แก้ไข superadmin อื่นไม่ได้
    if (myRole === 'superadmin' && user.role === 'superadmin' && user.id !== req.user.id) {
      return res.status(403).json({ message: 'Cannot update other superadmin users.' });
    }
    // admin แก้ไข admin อื่นไม่ได้
    if (myRole === 'admin' && user.role === 'admin' && user.id !== req.user.id) {
      return res.status(403).json({ message: 'Cannot update other admin users.' });
    }
    // staff แก้ไข staff อื่นไม่ได้
    if (myRole === 'staff' && user.role === 'staff' && user.id !== req.user.id) {
      return res.status(403).json({ message: 'Cannot update other staff users.' });
    }
    // guide แก้ไข guide อื่นไม่ได้
    if (myRole === 'guide' && user.role === 'guide' && user.id !== req.user.id) {
      return res.status(403).json({ message: 'Cannot update other guide users.' });
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
    // ป้องกันการลบ user ที่ role เท่ากับตัวเองหรือสูงกว่า (ยกเว้นตัวเอง)
    const myRole = req.user.role;
    if (myRole === 'superadmin' && user.role === 'superadmin' && user.id !== req.user.id) {
      return res.status(403).json({ message: 'Cannot delete other superadmin users.' });
    }
    if (myRole === 'admin' && user.role === 'admin' && user.id !== req.user.id) {
      return res.status(403).json({ message: 'Cannot delete other admin users.' });
    }
    if (myRole === 'staff' && user.role === 'staff' && user.id !== req.user.id) {
      return res.status(403).json({ message: 'Cannot delete other staff users.' });
    }
    if (myRole === 'guide' && user.role === 'guide' && user.id !== req.user.id) {
      return res.status(403).json({ message: 'Cannot delete other guide users.' });
    }
    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
