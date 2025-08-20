const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');

// lan: create user (op, gn)
router.post('/', authenticate, authorize('lan'), userController.createUser);
// lan, op: get all users
router.get('/', authenticate, authorize('lan', 'op'), userController.getUsers);
// lan, op, gn: get user by id
router.get('/:id', authenticate, authorize('lan', 'op', 'gn'), userController.getUserById);
// lan, op: update user
router.put('/:id', authenticate, authorize('lan', 'op'), userController.updateUser);
// lan: delete user
router.delete('/:id', authenticate, authorize('lan'), userController.deleteUser);

module.exports = router;
