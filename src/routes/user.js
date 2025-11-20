const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');

// superadmin, lan: create user (op, gn)
router.post('/', authenticate, authorize('superadmin', 'lan'), userController.createUser);
// superadmin, lan, op: get all users
router.get('/', authenticate, authorize('superadmin', 'lan', 'op'), userController.getUsers);
// superadmin, lan, op, gn: get user by id
router.get('/:id', authenticate, authorize('superadmin', 'lan', 'op', 'gn'), userController.getUserById);
// superadmin, lan, op: update user
router.put('/:id', authenticate, authorize('superadmin', 'lan', 'op'), userController.updateUser);
// superadmin, lan: delete user
router.delete('/:id', authenticate, authorize('superadmin', 'lan'), userController.deleteUser);

// Get current user info from token
router.get('/me', authenticate, authorize('superadmin', 'lan', 'op', 'gn'), (req, res) => {
	// คืนข้อมูล user ที่ auth แล้ว (ไม่รวม password)
	const { id, role, email, lanId } = req.user;
	res.json({ id, role, email, lanId });
});

module.exports = router;

