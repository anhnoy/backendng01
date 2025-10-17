const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tourController');

router.post('/', ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.patch('/:id', ctrl.patch);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/publish', ctrl.publish);

module.exports = router;
