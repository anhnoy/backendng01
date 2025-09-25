const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/faqController');

// Hero
router.get('/hero', ctrl.getHero);
router.put('/hero', ctrl.updateHero);

// Tabs
router.get('/tabs', ctrl.listTabs);
router.post('/tabs', ctrl.createTab);
router.patch('/tabs/:id', ctrl.updateTab);
router.delete('/tabs/:id', ctrl.deleteTab);

// Categories
router.post('/tabs/:tabId/categories', ctrl.createCategory);
router.patch('/categories/:id', ctrl.updateCategory);
router.delete('/categories/:id', ctrl.deleteCategory);

// Questions
router.post('/categories/:categoryId/questions', ctrl.createQuestion);
router.patch('/questions/:id', ctrl.updateQuestion);
router.delete('/questions/:id', ctrl.deleteQuestion);

module.exports = router;
