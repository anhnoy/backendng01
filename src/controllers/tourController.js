const { Op } = require('sequelize');
const Tour = require('../models/tour');

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch(_) { return []; } }
  return [];
}

function slugify(title, country) {
  const baseSlug = String(title || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220);
  
  // Add country suffix if provided
  if (country) {
    const countrySlug = String(country)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10);
    return `${baseSlug}-${countrySlug}`.slice(0, 240);
  }
  
  return baseSlug;
}

async function ensureUniqueSlug(title, country, excludeId = null) {
  const baseSlug = slugify(title, country);
  if (!baseSlug) return '';
  
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? baseSlug : `${baseSlug}-${i}`;
    const where = { slug: candidate };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    
    const exists = await Tour.findOne({ where, attributes: ['id'] });
    if (!exists) return candidate;
  }
  
  return `${baseSlug}-${Date.now()}`;
}

function normalizeCountryCode(country) {
  if (!country) return 'TH';
  const s = String(country).toLowerCase();
  if (['th', 'tha', 'thailand', 'ไทย'].includes(s)) return 'TH';
  if (['la', 'lao', 'laos', 'ลาว'].includes(s)) return 'LA';
  if (['vn', 'vnm', 'vietnam', 'เวียดนาม'].includes(s)) return 'VN';
  return (String(country).toUpperCase().slice(0, 2));
}

function daysNights(dateStart, dateEnd) {
  const ds = dateStart ? new Date(dateStart) : null;
  const de = dateEnd ? new Date(dateEnd) : null;
  if (!ds || !de || isNaN(ds) || isNaN(de)) return { days: 0, nights: 0 };
  const diff = Math.max(0, Math.floor((de - ds) / (24*60*60*1000)));
  return { days: diff + 1, nights: diff };
}

function normalizeDayPlans(dayPlans) {
  if (!Array.isArray(dayPlans)) return [];
  
  return dayPlans.map((plan, index) => {
    // Ensure each dayPlan has expected structure
    const normalized = {
      day: plan.day || (index + 1),
      title: plan.title || `Day ${plan.day || (index + 1)}`,
      items: []
    };
    
    // Handle different dayPlan formats
    if (Array.isArray(plan.items)) {
      normalized.items = plan.items.map(item => ({
        time: item.time || '09:00',
        name: item.name || item.activity || String(item)
      }));
    } else if (plan.plan || plan.activity) {
      // Legacy format - convert single plan to items array
      normalized.items = [{
        time: '09:00',
        name: plan.plan || plan.activity
      }];
    }
    
    return normalized;
  });
}

function validateTourData(data) {
  const errors = [];
  
  if (!data.title || !data.title.trim()) {
    errors.push('Title is required');
  }
  
  if (!data.dateStart) {
    errors.push('Start date is required');
  }
  
  if (!data.dateEnd) {
    errors.push('End date is required');
  }
  
  if (data.dateStart && data.dateEnd) {
    const startDate = new Date(data.dateStart);
    const endDate = new Date(data.dateEnd);
    
    if (endDate < startDate) {
      errors.push('End date must be after start date');
    }
  }
  
  if (!data.country && !data.countryCode) {
    errors.push('Country or country code is required');
  }
  
  if (data.packagePrice && data.packagePrice < 0) {
    errors.push('Package price must be non-negative');
  }
  
  if (data.discountPercent && (data.discountPercent < 0 || data.discountPercent > 100)) {
    errors.push('Discount percent must be between 0 and 100');
  }
  
  return errors;
}

function toDoc(row) {
  const t = typeof row.toJSON === 'function' ? row.toJSON() : row;
  
  // Calculate days/nights manually since virtual fields may not work in all contexts
  const { days, nights } = daysNights(t.dateStart, t.dateEnd);
  
  return {
    id: t.id,
    slug: t.slug || '',
    title: t.title,
    status: t.status,
    countryCode: t.countryCode,
    country: t.country || undefined,
    attractions: toArray(t.attractions),
    purpose: t.purpose || '',
    dateStart: t.dateStart,
    dateEnd: t.dateEnd,
    days: days,
    nights: nights,
    maxGuests: t.maxGuests || 10,
    accommodation: {
      name: t.accommodationName || '',
      roomType: t.roomType || '',
      childRoomType: t.childRoomType || ''
    },
    dayPlans: normalizeDayPlans(toArray(t.dayPlans)),
    includedItems: toArray(t.includedItems),
    excludedItems: toArray(t.excludedItems),
    packagePrice: Number(t.packagePrice || 0),
    discountPercent: Number(t.discountPercent || 0),
    additionalCost: Number(t.additionalCost || 0),
    gallery: toArray(t.gallery),
    notes: t.notes || undefined,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    deletedAt: t.deletedAt || null,
  };
}

async function create(req, res) {
  try {
    const body = { ...req.body };
    
    // Validate required fields
    const validationErrors = validateTourData(body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Normalize data
    body.countryCode = normalizeCountryCode(body.countryCode || body.country);
    body.attractions = toArray(body.attractions);
    body.dayPlans = toArray(body.dayPlans);
    body.includedItems = toArray(body.includedItems);
    body.excludedItems = toArray(body.excludedItems);
    body.gallery = toArray(body.gallery);
    if (body.maxGuests !== undefined) body.maxGuests = Number(body.maxGuests) || 10;
    
    // Generate unique slug
    body.slug = await ensureUniqueSlug(body.title, body.country || body.countryCode);
    
    // Handle accommodation
    body.accommodationName = body.accommodation?.name ?? body.accommodationName;
    body.roomType = body.accommodation?.roomType ?? body.roomType;
    body.childRoomType = body.accommodation?.childRoomType ?? body.childRoomType;

    const created = await Tour.create(body);
    return res.status(201).json(toDoc(created));
  } catch (err) {
    console.error('tour.create error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function getById(req, res) {
  try {
    const t = await Tour.findByPk(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    return res.json(toDoc(t));
  } catch (err) {
    console.error('tour.get error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function list(req, res) {
  try {
    const { country, status, page = 1, pageSize = 12, q } = req.query;
    const where = {};
    if (country) where.countryCode = normalizeCountryCode(country);
    if (status) where.status = status;
    if (q) where[Op.or] = [
      { title: { [Op.like]: `%${q}%` } },
      { slug: { [Op.like]: `%${q}%` } }
    ];
    const limit = Math.min(50, Number(pageSize) || 12);
    const offset = (Math.max(1, Number(page) || 1) - 1) * limit;
    const { rows, count } = await Tour.findAndCountAll({ where, limit, offset, order: [['createdAt','DESC']] });
    res.setHeader('X-Total-Count', String(count));
    res.setHeader('X-Page', String(page));
    res.setHeader('X-Page-Size', String(limit));
    res.setHeader('X-Total-Pages', String(Math.ceil(count / limit)));
    return res.json({ items: rows.map(toDoc), total: count });
  } catch (err) {
    console.error('tour.list error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function patch(req, res) {
  try {
    const t = await Tour.findByPk(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const body = { ...req.body };
    if (body.country || body.countryCode) body.countryCode = normalizeCountryCode(body.countryCode || body.country);
    if (body.title && !body.slug) body.slug = slugify(body.title);
    if (body.accommodation && typeof body.accommodation === 'object') {
      body.accommodationName = body.accommodation.name ?? t.accommodationName;
      body.roomType = body.accommodation.roomType ?? t.roomType;
      body.childRoomType = body.accommodation.childRoomType ?? t.childRoomType;
    }
    // normalize array-like
    ['attractions','dayPlans','includedItems','excludedItems','gallery'].forEach(k => {
      if (k in body) body[k] = toArray(body[k]);
    });
    if (body.maxGuests !== undefined) body.maxGuests = Number(body.maxGuests);
    await t.update(body);
    await t.reload();
    return res.json(toDoc(t));
  } catch (err) {
    console.error('tour.patch error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Full update (PUT). For now behaves similar to PATCH but is exposed separately for clients preferring PUT.
async function update(req, res) {
  try {
    const t = await Tour.findByPk(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const body = { ...req.body };
    // Normalize required/derived fields
    if (body.country || body.countryCode) body.countryCode = normalizeCountryCode(body.countryCode || body.country);
    if (body.title && !body.slug) body.slug = slugify(body.title);
    if (body.accommodation && typeof body.accommodation === 'object') {
      body.accommodationName = body.accommodation.name ?? t.accommodationName;
      body.roomType = body.accommodation.roomType ?? t.roomType;
      body.childRoomType = body.accommodation.childRoomType ?? t.childRoomType;
    }
    // normalize array-like
    ['attractions','dayPlans','includedItems','excludedItems','gallery'].forEach(k => {
      if (k in body) body[k] = toArray(body[k]);
    });
    if (body.maxGuests !== undefined) body.maxGuests = Number(body.maxGuests);
    await t.update(body);
    await t.reload();
    return res.json(toDoc(t));
  } catch (err) {
    console.error('tour.update error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function publish(req, res) {
  try {
    const t = await Tour.findByPk(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    t.status = 'published';
    await t.save();
    return res.json(toDoc(t));
  } catch (err) {
    console.error('tour.publish error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function remove(req, res) {
  try {
    // Always hard delete (physical removal) regardless of query params
    const hard = true;
    // Include soft-deleted rows in lookup to allow re-delete if previously soft-deleted
    const t = await Tour.findByPk(req.params.id, { paranoid: false });
    if (!t) return res.status(404).json({ error: 'Not found' });
    await t.destroy({ force: hard }); // soft delete by default; hard delete when force=true
    return res.json({ success: true, hardDeleted: hard });
  } catch (err) {
    console.error('tour.remove error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { create, getById, list, patch, update, publish, remove };
