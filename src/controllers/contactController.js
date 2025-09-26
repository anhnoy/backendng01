const { sendError, sendSuccess } = require('../utils/errors');
const ContactHero = require('../models/contactHero');
const ContactPhone = require('../models/contactPhone');
const ContactEmail = require('../models/contactEmail');
const ContactHour = require('../models/contactHour');
const ContactSocial = require('../models/contactSocial');
const ContactOffice = require('../models/contactOffice');
const ContactSetting = require('../models/contactSetting');
const ContactQuickFaq = require('../models/contactQuickFaq');
const ContactMessage = require('../models/contactMessage');

// utils
const digitsOnly = (s) => (s || '').replace(/\D+/g, '').slice(0, 32);
const isHttpUrl = (u) => /^https?:\/\//i.test(u || '');
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

// Hero ensure single row
async function ensureHero() {
  const row = await ContactHero.findOne();
  if (row) return row;
  return ContactHero.create({ title: 'Contact Us', text: '' });
}

// Validators
function vString(s, min, max) {
  s = (s ?? '').toString().trim();
  if (s.length < min || s.length > max) return null;
  return s;
}

// Aggregate content
async function getContent(req, res) {
  const hero = await ensureHero();
  const [phones, emails, hours, socials, offices, quickFaq] = await Promise.all([
    ContactPhone.findAll({ order: [['position','ASC']] }),
    ContactEmail.findAll({ order: [['position','ASC']] }),
    ContactHour.findAll({ order: [['position','ASC']] }),
    ContactSocial.findAll({ order: [['position','ASC']] }),
    ContactOffice.findAll({ order: [['position','ASC']] }),
    ContactQuickFaq.findAll({ order: [['position','ASC']] })
  ]);
  const copyright = await ContactSetting.findByPk('copyright');
  return sendSuccess(res, {
    hero: { title: hero.title, text: hero.text },
    phones, emails, hours, socials, offices,
    copyright: copyright?.value || '',
    quickFaq
  });
}

async function updateContent(req, res) {
  // Minimal bulk update (partial): hero + copyright; lists can be managed via their CRUD
  const body = req.body || {};
  const hero = await ensureHero();
  if (Object.prototype.hasOwnProperty.call(body, 'hero')) {
    const h = body.hero || {};
    if (h.title != null) {
      const t = vString(h.title, 1, 120); if (!t) return sendError(res, 400, 'ValidationError', { title: '1..120' });
      hero.title = t;
    }
    if (h.text != null) {
      const t2 = vString(h.text, 0, 600); if (t2 === null) return sendError(res, 400, 'ValidationError', { text: '0..600' });
      hero.text = t2;
    }
    await hero.save();
  }
  if (Object.prototype.hasOwnProperty.call(body, 'copyright')) {
    const c = body.copyright ?? '';
    const v = vString(c, 0, 200); if (v === null) return sendError(res, 400, 'ValidationError', { copyright: '0..200' });
    await ContactSetting.upsert({ key: 'copyright', value: v });
  }
  return getSettings(req, res);
}

// Hero CRUD-lite
async function getHero(req, res) {
  const hero = await ensureHero();
  return sendSuccess(res, { title: hero.title, text: hero.text });
}
async function putHero(req, res) {
  const hero = await ensureHero();
  const { title, text } = req.body || {};
  if (title != null) { const v = vString(title, 1, 120); if (!v) return sendError(res, 400, 'ValidationError', { title: '1..120' }); hero.title = v; }
  if (text != null) { const v2 = vString(text, 0, 600); if (v2 === null) return sendError(res, 400, 'ValidationError', { text: '0..600' }); hero.text = v2; }
  await hero.save();
  return sendSuccess(res, { title: hero.title, text: hero.text });
}

// Generic list helpers
async function nextPosition(Model, where = {}) {
  const max = await Model.max('position', { where });
  return Number.isFinite(max) ? Number(max) + 1 : 1;
}

function reorderHandler(Model) {
  return async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
    if (!ids || ids.length === 0) return sendError(res, 400, 'ValidationError', { ids: 'required non-empty array' });
    let pos = 1;
    for (const id of ids) {
      await Model.update({ position: pos++ }, { where: { id } });
    }
    return res.status(204).send();
  };
}

// Phones
async function listPhones(req, res) {
  const rows = await ContactPhone.findAll({ order: [['position','ASC']] });
  return sendSuccess(res, rows);
}
async function createPhone(req, res) {
  const { branch, phone } = req.body || {};
  const b = vString(branch, 1, 100); if (!b) return sendError(res, 400, 'ValidationError', { branch: '1..100' });
  const p = vString(phone, 6, 30); if (!p) return sendError(res, 400, 'ValidationError', { phone: '6..30' });
  const row = await ContactPhone.create({ branch: b, phone: p, normalizedDigits: digitsOnly(p), position: await nextPosition(ContactPhone) });
  return sendSuccess(res, row, 201);
}
async function updatePhone(req, res) {
  const row = await ContactPhone.findByPk(Number(req.params.id));
  if (!row) return sendError(res, 404, 'Not Found');
  const body = req.body || {};
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(body, 'branch')) { const b = vString(body.branch, 1, 100); if (!b) return sendError(res, 400, 'ValidationError', { branch: '1..100' }); patch.branch = b; }
  if (Object.prototype.hasOwnProperty.call(body, 'phone')) { const p = vString(body.phone, 6, 32); if (!p) return sendError(res, 400, 'ValidationError', { phone: '6..32' }); patch.phone = p; patch.normalizedDigits = digitsOnly(p); }
  if (Object.prototype.hasOwnProperty.call(body, 'phone')) { const p = vString(body.phone, 6, 30); if (!p) return sendError(res, 400, 'ValidationError', { phone: '6..30' }); patch.phone = p; patch.normalizedDigits = digitsOnly(p); }
  if (Object.keys(patch).length) await row.update(patch);
  return sendSuccess(res, row);
}
async function deletePhone(req, res) {
  const row = await ContactPhone.findByPk(Number(req.params.id));
  if (!row) return res.status(204).send();
  await row.destroy();
  return res.status(204).send();
}

// Emails
async function listEmails(req, res) { return sendSuccess(res, await ContactEmail.findAll({ order: [['position','ASC']] })); }
async function createEmail(req, res) {
  const { label, value } = req.body || {};
  const l = vString(label, 1, 100); if (!l) return sendError(res, 400, 'ValidationError', { label: '1..100' });
  const v = vString(value, 1, 150); if (!v || !isEmail(v)) return sendError(res, 400, 'ValidationError', { value: 'valid email 1..150' });
  const row = await ContactEmail.create({ label: l, value: v, position: await nextPosition(ContactEmail) });
  return sendSuccess(res, row, 201);
}
async function updateEmail(req, res) {
  const row = await ContactEmail.findByPk(Number(req.params.id)); if (!row) return sendError(res, 404, 'Not Found');
  const body = req.body || {}; const patch = {};
  if (Object.prototype.hasOwnProperty.call(body, 'label')) { const l = vString(body.label, 1, 100); if (!l) return sendError(res, 400, 'ValidationError', { label: '1..100' }); patch.label = l; }
  if (Object.prototype.hasOwnProperty.call(body, 'value')) { const val = vString(body.value, 1, 150); if (!val || !isEmail(val)) return sendError(res, 400, 'ValidationError', { value: 'valid email 1..150' }); patch.value = val; }
  if (Object.keys(patch).length) await row.update(patch);
  return sendSuccess(res, row);
}
async function deleteEmail(req, res) { const row = await ContactEmail.findByPk(Number(req.params.id)); if (!row) return res.status(204).send(); await row.destroy(); return res.status(204).send(); }

// Hours
async function listHours(req, res) { return sendSuccess(res, await ContactHour.findAll({ order: [['position','ASC']] })); }
async function createHour(req, res) {
  const { label, value } = req.body || {};
  const l = vString(label, 1, 100); if (!l) return sendError(res, 400, 'ValidationError', { label: '1..100' });
  const val = vString(value, 0, 100); if (val === null) return sendError(res, 400, 'ValidationError', { value: '0..100' });
  const row = await ContactHour.create({ label: l, value: val, position: await nextPosition(ContactHour) });
  return sendSuccess(res, row, 201);
}
async function updateHour(req, res) {
  const row = await ContactHour.findByPk(Number(req.params.id)); if (!row) return sendError(res, 404, 'Not Found');
  const body = req.body || {}; const patch = {};
  if (Object.prototype.hasOwnProperty.call(body, 'label')) { const l = vString(body.label, 1, 100); if (!l) return sendError(res, 400, 'ValidationError', { label: '1..100' }); patch.label = l; }
  if (Object.prototype.hasOwnProperty.call(body, 'value')) { const val = vString(body.value, 0, 100); if (val === null) return sendError(res, 400, 'ValidationError', { value: '0..100' }); patch.value = val; }
  if (Object.keys(patch).length) await row.update(patch);
  return sendSuccess(res, row);
}
async function deleteHour(req, res) { const row = await ContactHour.findByPk(Number(req.params.id)); if (!row) return res.status(204).send(); await row.destroy(); return res.status(204).send(); }

// Socials
async function listSocials(req, res) { return sendSuccess(res, await ContactSocial.findAll({ order: [['position','ASC']] })); }
async function createSocial(req, res) {
  const { label, url } = req.body || {};
  const l = vString(label, 1, 100); if (!l) return sendError(res, 400, 'ValidationError', { label: '1..100' });
  const u = vString(url, 1, 300); if (!u || !isHttpUrl(u)) return sendError(res, 400, 'ValidationError', { url: 'http(s):// required (<=300)' });
  const row = await ContactSocial.create({ label: l, url: u, position: await nextPosition(ContactSocial) });
  return sendSuccess(res, row, 201);
}
async function updateSocial(req, res) {
  const row = await ContactSocial.findByPk(Number(req.params.id)); if (!row) return sendError(res, 404, 'Not Found');
  const body = req.body || {}; const patch = {};
  if (Object.prototype.hasOwnProperty.call(body, 'label')) { const l = vString(body.label, 1, 100); if (!l) return sendError(res, 400, 'ValidationError', { label: '1..100' }); patch.label = l; }
  if (Object.prototype.hasOwnProperty.call(body, 'url')) { const u = vString(body.url, 1, 300); if (!u || !isHttpUrl(u)) return sendError(res, 400, 'ValidationError', { url: 'http(s):// required (<=300)' }); patch.url = u; }
  if (Object.keys(patch).length) await row.update(patch);
  return sendSuccess(res, row);
}
async function deleteSocial(req, res) { const row = await ContactSocial.findByPk(Number(req.params.id)); if (!row) return res.status(204).send(); await row.destroy(); return res.status(204).send(); }

// Offices
async function listOffices(req, res) { return sendSuccess(res, await ContactOffice.findAll({ order: [['position','ASC']] })); }
async function createOffice(req, res) {
  const { title, desc, mapUrl } = req.body || {};
  const t = vString(title, 1, 120); if (!t) return sendError(res, 400, 'ValidationError', { title: '1..120' });
  const d = vString(desc, 0, 800); if (d === null) return sendError(res, 400, 'ValidationError', { desc: '0..800' });
  let m = '';
  if (mapUrl !== undefined && mapUrl !== null && mapUrl !== '') {
    const mv = vString(mapUrl, 1, 1024); if (!mv || !isHttpUrl(mv)) return sendError(res, 400, 'ValidationError', { mapUrl: 'http(s):// required (<=1024)' });
    m = mv;
  }
  const row = await ContactOffice.create({ title: t, desc: d, mapUrl: m, position: await nextPosition(ContactOffice) });
  return sendSuccess(res, row, 201);
}
async function updateOffice(req, res) {
  const row = await ContactOffice.findByPk(Number(req.params.id)); if (!row) return sendError(res, 404, 'Not Found');
  const body = req.body || {}; const patch = {};
  if (Object.prototype.hasOwnProperty.call(body, 'title')) { const t = vString(body.title, 1, 120); if (!t) return sendError(res, 400, 'ValidationError', { title: '1..120' }); patch.title = t; }
  if (Object.prototype.hasOwnProperty.call(body, 'desc')) { const d = vString(body.desc, 0, 800); if (d === null) return sendError(res, 400, 'ValidationError', { desc: '0..800' }); patch.desc = d; }
  if (Object.prototype.hasOwnProperty.call(body, 'mapUrl')) { const m = vString(body.mapUrl, 1, 1024); if (!m || !isHttpUrl(m)) return sendError(res, 400, 'ValidationError', { mapUrl: 'http(s):// required (<=1024)' }); patch.mapUrl = m; }
  if (Object.keys(patch).length) await row.update(patch);
  return sendSuccess(res, row);
}
async function deleteOffice(req, res) { const row = await ContactOffice.findByPk(Number(req.params.id)); if (!row) return res.status(204).send(); await row.destroy(); return res.status(204).send(); }

// Settings: copyright
async function getCopyright(req, res) { const row = await ContactSetting.findByPk('copyright'); return sendSuccess(res, { text: row?.value || '' }); }
async function putCopyright(req, res) {
  const text = (req.body?.text ?? '').toString(); const v = vString(text, 0, 200); if (v === null) return sendError(res, 400, 'ValidationError', { text: '0..200' });
  await ContactSetting.upsert({ key: 'copyright', value: v });
  return sendSuccess(res, { text: v });
}

// Quick FAQ
async function listQuickFaq(req, res) { return sendSuccess(res, await ContactQuickFaq.findAll({ order: [['position','ASC']] })); }
async function createQuickFaq(req, res) {
  const question = (req.body?.question ?? '').toString().trim(); if (question.length > 300) return sendError(res, 400, 'ValidationError', { question: '0..300' });
  const answer = (req.body?.answer ?? '').toString().trim(); if (answer.length > 2000) return sendError(res, 400, 'ValidationError', { answer: '0..2000' });
  const row = await ContactQuickFaq.create({ question, answer, position: await nextPosition(ContactQuickFaq) });
  return sendSuccess(res, row, 201);
}
async function updateQuickFaq(req, res) {
  const row = await ContactQuickFaq.findByPk(Number(req.params.id)); if (!row) return sendError(res, 404, 'Not Found');
  const patch = {}; if (Object.prototype.hasOwnProperty.call(req.body || {}, 'question')) { const q = (req.body.question ?? '').toString().trim(); if (q.length > 300) return sendError(res, 400, 'ValidationError', { question: '0..300' }); patch.question = q; }
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'answer')) { const a = (req.body.answer ?? '').toString().trim(); if (a.length > 2000) return sendError(res, 400, 'ValidationError', { answer: '0..2000' }); patch.answer = a; }
  if (Object.keys(patch).length) await row.update(patch); return sendSuccess(res, row);
}
async function deleteQuickFaq(req, res) { const row = await ContactQuickFaq.findByPk(Number(req.params.id)); if (!row) return res.status(204).send(); await row.destroy(); return res.status(204).send(); }

// Messages
async function createMessage(req, res) {
  const { name, email, phone, subject, message, meta } = req.body || {};
  const n = vString(name, 1, 100); if (!n) return sendError(res, 400, 'ValidationError', { name: '1..100' });
  const e = vString(email, 1, 120); if (!e || !isEmail(e)) return sendError(res, 400, 'ValidationError', { email: 'valid email 1..120' });
  const ph = vString(phone ?? '', 0, 32); if (ph === null) return sendError(res, 400, 'ValidationError', { phone: '0..32' });
  const s = vString(subject, 1, 120); if (!s) return sendError(res, 400, 'ValidationError', { subject: '1..120' });
  const m = (message ?? '').toString().trim(); if (m.length < 10 || m.length > 4000) return sendError(res, 400, 'ValidationError', { message: '10..4000' });
  const row = await ContactMessage.create({ name: n, email: e, phone: ph, subject: s, message: m, meta: meta ?? null });
  return sendSuccess(res, { id: row.id, createdAt: row.createdAt }, 201);
}

// Settings endpoints to match FE contracts
async function getSettings(req, res) {
  try {
    const hero = await ensureHero();
    const [phones, emails, hours, socials, offices, quickFaq] = await Promise.all([
      ContactPhone.findAll({ order: [['position','ASC'], ['id','ASC']] }),
      ContactEmail.findAll({ order: [['position','ASC'], ['id','ASC']] }),
      ContactHour.findAll({ order: [['position','ASC'], ['id','ASC']] }),
      ContactSocial.findAll({ order: [['position','ASC'], ['id','ASC']] }),
      ContactOffice.findAll({ order: [['position','ASC'], ['id','ASC']] }),
      ContactQuickFaq.findAll({ order: [['position','ASC'], ['id','ASC']] })
    ]);
    const cr = await ContactSetting.findByPk('copyright');
    return sendSuccess(res, {
      title: hero.title,
      heroText: hero.text,
      copyright: cr?.value || '',
      phones,
      emails,
      hours,
      socialLinks: socials,
      offices,
      faqQuick: quickFaq
    });
  } catch (err) {
    return sendError(res, 500, 'Internal error');
  }
}

async function patchSettings(req, res) {
  try {
    const { title, heroText, copyright } = req.body || {};
    const hero = await ensureHero();
    const patch = {};
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'title')) {
      const v = vString(title, 1, 120); if (!v) return sendError(res, 400, 'ValidationError', { title: '1..120' });
      patch.title = v;
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'heroText')) {
      const v2 = vString(heroText, 0, 600); if (v2 === null) return sendError(res, 400, 'ValidationError', { heroText: '0..600' });
      patch.text = v2; // map heroText -> text
    }
    if (Object.keys(patch).length) await hero.update(patch);
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'copyright')) {
      const c = vString(copyright ?? '', 0, 200); if (c === null) return sendError(res, 400, 'ValidationError', { copyright: '0..200' });
      await ContactSetting.upsert({ key: 'copyright', value: c });
    }
    return getSettings(req, res);
  } catch (err) {
    return sendError(res, 500, 'Internal error');
  }
}

module.exports = {
  getContent,
  updateContent,
  getHero,
  putHero,
  listPhones, createPhone, updatePhone, deletePhone,
  listEmails, createEmail, updateEmail, deleteEmail,
  listHours, createHour, updateHour, deleteHour,
  listSocials, createSocial, updateSocial, deleteSocial,
  listOffices, createOffice, updateOffice, deleteOffice,
  getCopyright, putCopyright,
  listQuickFaq, createQuickFaq, updateQuickFaq, deleteQuickFaq,
  createMessage,
  reorderPhones: reorderHandler(ContactPhone),
  reorderEmails: reorderHandler(ContactEmail),
  reorderHours: reorderHandler(ContactHour),
  reorderSocials: reorderHandler(ContactSocial),
  reorderOffices: reorderHandler(ContactOffice),
  reorderQuickFaq: reorderHandler(ContactQuickFaq)
};

// Export settings handlers as named exports, to be wired in routes
module.exports.getSettings = getSettings;
module.exports.patchSettings = patchSettings;
