const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');


// superadmin, admin: create user (staff, guide)
router.post('/', authenticate, authorize('superadmin', 'admin'), userController.createUser);
// superadmin, admin, staff: get all users
router.get('/', authenticate, authorize('superadmin', 'admin', 'staff'), userController.getUsers);
// superadmin, admin, staff, guide: get user by id
router.get('/:id', authenticate, authorize('superadmin', 'admin', 'staff', 'guide'), userController.getUserById);
// superadmin, admin, staff: update user
router.put('/:id', authenticate, authorize('superadmin', 'admin', 'staff'), userController.updateUser);
// superadmin, admin: delete user
router.delete('/:id', authenticate, authorize('superadmin', 'admin'), userController.deleteUser);

// Get current user info from token
router.get('/me', authenticate, authorize('superadmin', 'admin', 'staff', 'guide'), (req, res) => {
	// คืนข้อมูล user ที่ auth แล้ว (ไม่รวม password)
	const { id, role, email, adminId } = req.user;
	res.json({ id, role, email, adminId });
});

module.exports = router;

