const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/quotationController');

// Public endpoints (no auth required)
router.post('/verify', ctrl.verify);
router.get('/:id/public', ctrl.getByIdPublic);

// Admin endpoints (auth required - add middleware if needed)
router.post('/:id/generate-access-code', ctrl.generateAccessCodeForQuotation);
router.post('/', ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
