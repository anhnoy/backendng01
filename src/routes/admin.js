const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.post('/login', adminController.login);
router.get('/me', adminController.getCurrentUser);

module.exports = router;
