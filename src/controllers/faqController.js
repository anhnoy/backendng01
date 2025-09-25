const { Op } = require('sequelize');
const { sendError, sendSuccess } = require('../utils/errors');
const FaqHero = require('../models/faqHero');
const { FaqTab, FaqCategory, FaqQuestion } = require('../models/relations');

// Helpers
function slugifyKey(input) {
  if (!input) return '';
  // keep Unicode letters/numbers, underscores and dashes; collapse spaces to underscore
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_\-]/gu, '');
}

async function ensureHeroRow() {
  const row = await FaqHero.findOne();
  if (row) return row;
  return FaqHero.create({ title: '자주 묻는 질문 (FAQ)', subtitle: 'AutonTour의 투어 서비스 이용에 대한 질문에 대한 답변을 찾아보세요.' });
}

// Validation
function validateHero(body) {
  const title = String(body.title ?? '').trim();
  const subtitle = String(body.subtitle ?? '').trim();
  if (!title || title.length < 1 || title.length > 200) return { field: 'title', message: 'title length 1..200' };
  if (subtitle.length > 500) return { field: 'subtitle', message: 'subtitle length 0..500' };
  return null;
}

function validateTab(body) {
  const label = String(body.label ?? '').trim();
  if (!label || label.length < 1 || label.length > 100) return { field: 'label', message: 'label length 1..100' };
  let key = body.key ? String(body.key).trim() : slugifyKey(label);
  key = slugifyKey(key);
  if (!key) return { field: 'key', message: 'invalid key' };
  if (key.length > 120) return { field: 'key', message: 'key length <=120' };
  return { label, key };
}

function validateCategory(body) {
  const category = String(body.category ?? '').trim();
  if (!category || category.length < 1 || category.length > 100) return { field: 'category', message: 'category length 1..100' };
  return { category };
}

function validateQuestion(body) {
  const question = body.question == null ? '' : String(body.question).trim();
  const answer = body.answer == null ? '' : String(body.answer).trim();
  if (question.length > 300) return { field: 'question', message: 'question length 0..300' };
  if (answer.length > 2000) return { field: 'answer', message: 'answer length 0..2000' };
  return { question, answer };
}

// Hero
async function getHero(req, res) {
  const hero = await ensureHeroRow();
  return sendSuccess(res, { title: hero.title, subtitle: hero.subtitle });
}

async function updateHero(req, res) {
  const err = validateHero(req.body || {});
  if (err) return sendError(res, 400, 'ValidationError', { [err.field]: err.message });
  const hero = await ensureHeroRow();
  hero.title = String(req.body.title).trim();
  hero.subtitle = String(req.body.subtitle ?? '').trim();
  await hero.save();
  return sendSuccess(res, { title: hero.title, subtitle: hero.subtitle });
}

// Tabs
async function listTabs(req, res) {
  const tabs = await FaqTab.findAll({
    include: [{
      model: FaqCategory,
      as: 'categories',
      include: [{ model: FaqQuestion, as: 'questions' }],
      order: [['position', 'ASC']]
    }],
    order: [['position', 'ASC']]
  });

  // sort nested arrays by position ASC
  const data = tabs.map(t => ({
    id: t.id,
    label: t.label,
    key: t.key,
    position: t.position,
    categories: (t.categories || []).sort((a,b)=>a.position-b.position).map(c => ({
      id: c.id,
      category: c.category,
      position: c.position,
      questions: (c.questions || []).sort((a,b)=>a.position-b.position).map(q => ({
        id: q.id,
        question: q.question || '',
        answer: q.answer || '',
        position: q.position
      }))
    }))
  }));
  return sendSuccess(res, data);
}

async function createTab(req, res) {
  const v = validateTab(req.body || {});
  if (v && v.field) return sendError(res, 400, 'ValidationError', { [v.field]: v.message });
  const { label, key } = v;
  // position = max+1
  const max = await FaqTab.max('position');
  const position = isFinite(max) && !isNaN(max) ? (Number(max) + 1) : 1;
  try {
    const tab = await FaqTab.create({ label, key, position });
    return sendSuccess(res, { id: tab.id, label, key, position }, 201);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, 409, 'Duplicate key', { key: 'duplicate' });
    }
    return sendError(res, 500, 'Internal error');
  }
}

async function updateTab(req, res) {
  const id = Number(req.params.id);
  const tab = await FaqTab.findByPk(id);
  if (!tab) return sendError(res, 404, 'Not Found');
  let updates = {};
  if (req.body.label != null) {
    const label = String(req.body.label).trim();
    if (!label || label.length < 1 || label.length > 100) return sendError(res, 400, 'ValidationError', { label: 'label length 1..100' });
    updates.label = label;
  }
  if (req.body.key != null) {
    let key = slugifyKey(String(req.body.key));
    if (!key) return sendError(res, 400, 'ValidationError', { key: 'invalid key' });
    if (key.length > 120) return sendError(res, 400, 'ValidationError', { key: 'key length <=120' });
    updates.key = key;
  }
  try {
    await tab.update(updates);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') return sendError(res, 409, 'Duplicate key', { key: 'duplicate' });
    return sendError(res, 500, 'Internal error');
  }
  return sendSuccess(res, { id: tab.id, label: tab.label, key: tab.key, position: tab.position });
}

async function deleteTab(req, res) {
  const id = Number(req.params.id);
  const tab = await FaqTab.findByPk(id);
  if (!tab) return res.status(204).send();
  await tab.destroy(); // cascades to categories and questions
  return res.status(204).send();
}

// Categories
async function createCategory(req, res) {
  const tabId = Number(req.params.tabId);
  const tab = await FaqTab.findByPk(tabId);
  if (!tab) return sendError(res, 404, 'Not Found');
  const v = validateCategory(req.body || {});
  if (v && v.field) return sendError(res, 400, 'ValidationError', { [v.field]: v.message });
  const max = await FaqCategory.max('position', { where: { tabId } });
  const position = isFinite(max) && !isNaN(max) ? (Number(max) + 1) : 1;
  const created = await FaqCategory.create({ tabId, category: v.category, position });
  return sendSuccess(res, { id: created.id, tabId, category: created.category, position }, 201);
}

async function updateCategory(req, res) {
  const id = Number(req.params.id);
  const category = await FaqCategory.findByPk(id);
  if (!category) return sendError(res, 404, 'Not Found');
  const v = validateCategory(req.body || {});
  if (v && v.field) return sendError(res, 400, 'ValidationError', { [v.field]: v.message });
  await category.update({ category: v.category });
  return sendSuccess(res, { id: category.id, tabId: category.tabId, category: category.category, position: category.position });
}

async function deleteCategory(req, res) {
  const id = Number(req.params.id);
  const category = await FaqCategory.findByPk(id);
  if (!category) return res.status(204).send();
  await category.destroy(); // cascades to questions
  return res.status(204).send();
}

// Questions
async function createQuestion(req, res) {
  const categoryId = Number(req.params.categoryId);
  const category = await FaqCategory.findByPk(categoryId);
  if (!category) return sendError(res, 404, 'Not Found');
  const v = validateQuestion(req.body || {});
  if (v && v.field) return sendError(res, 400, 'ValidationError', { [v.field]: v.message });
  const max = await FaqQuestion.max('position', { where: { categoryId } });
  const position = isFinite(max) && !isNaN(max) ? (Number(max) + 1) : 1;
  const created = await FaqQuestion.create({ categoryId, question: v.question, answer: v.answer, position });
  return sendSuccess(res, { id: created.id, categoryId, question: created.question || '', answer: created.answer || '', position }, 201);
}

async function updateQuestion(req, res) {
  const id = Number(req.params.id);
  const question = await FaqQuestion.findByPk(id);
  if (!question) return sendError(res, 404, 'Not Found');
  const body = req.body || {};
  const updates = {};
  if (Object.prototype.hasOwnProperty.call(body, 'question')) {
    const q = body.question == null ? '' : String(body.question).trim();
    if (q.length > 300) return sendError(res, 400, 'ValidationError', { question: 'question length 0..300' });
    updates.question = q;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'answer')) {
    const a = body.answer == null ? '' : String(body.answer).trim();
    if (a.length > 2000) return sendError(res, 400, 'ValidationError', { answer: 'answer length 0..2000' });
    updates.answer = a;
  }
  if (Object.keys(updates).length > 0) {
    await question.update(updates);
  }
  return sendSuccess(res, { id: question.id, categoryId: question.categoryId, question: question.question || '', answer: question.answer || '', position: question.position });
}

async function deleteQuestion(req, res) {
  const id = Number(req.params.id);
  const question = await FaqQuestion.findByPk(id);
  if (!question) return res.status(204).send();
  await question.destroy();
  return res.status(204).send();
}

module.exports = {
  getHero,
  updateHero,
  listTabs,
  createTab,
  updateTab,
  deleteTab,
  createCategory,
  updateCategory,
  deleteCategory,
  createQuestion,
  updateQuestion,
  deleteQuestion
};
