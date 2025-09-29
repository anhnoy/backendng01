const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/foodController');
// Basic CRUD
router.get('/', ctrl.list);
// Distinct categories (optional filter by country)
router.get('/categories', ctrl.listCategories);
// Distinct countries (optional filter by category)
router.get('/countries', ctrl.listCountries);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
module.exports = router;
