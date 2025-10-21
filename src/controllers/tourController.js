const { Op } = require('sequelize');
const crypto = require('crypto');
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

// Gallery helpers: normalize gallery entries to objects { id, url, source, attractionId?, caption }
function generateImageId(url) {
  try {
    if (!url) return crypto.randomBytes(8).toString('hex');
    const base = String(url).split('/').pop().split('.')[0];
    if (base) return base;
    return crypto.createHash('md5').update(String(url)).digest('hex').slice(0, 16);
  } catch (e) {
    return crypto.randomBytes(8).toString('hex');
  }
}

function normalizeGallery(raw) {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch (_) { arr = [raw]; }
  }
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const item of arr) {
    if (!item) continue;
    if (typeof item === 'string') {
      const id = generateImageId(item);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, url: item, source: item.startsWith('/uploads/') ? 'upload' : 'external', caption: null });
      continue;
    }
    if (typeof item === 'object') {
      const url = item.url || item.src || item.path || '';
      const id = item.id || generateImageId(url || JSON.stringify(item));
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, url, source: item.source || (String(url).startsWith('/uploads/') ? 'upload' : 'external'), attractionId: item.attractionId || null, caption: item.caption || null });
    }
  }
  return out;
}

function getGalleryObjects(value) {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeGallery(value);
  try { const parsed = JSON.parse(value); return normalizeGallery(parsed); } catch { return normalizeGallery(value); }
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
  
  // รองรับทั้ง discount และ discountPercent จาก Frontend
  const discountValue = data.discount !== undefined ? data.discount : data.discountPercent;
  if (discountValue && (discountValue < 0 || discountValue > 100)) {
    errors.push('ส่วนลดต้องอยู่ระหว่าง 0-100 เปอร์เซ็นต์');
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
    discount: Number(t.discountPercent || 0), // Frontend alias
    additionalCost: Number(t.additionalCost || 0),
  finalPrice: Number(t.finalPrice || 0),
  gallery: getGalleryObjects(t.gallery),
    notes: t.notes || undefined,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    deletedAt: t.deletedAt || null,
  };
}

async function deleteImage(req, res) {
  try {
    const { id, imageId } = req.params;
    const t = await Tour.findByPk(id);
    if (!t) return res.status(404).json({ error: 'Not found' });

    const gallery = getGalleryObjects(t.gallery);
    const idx = gallery.findIndex(g => String(g.id) === String(imageId));
    if (idx === -1) return res.status(404).json({ error: 'Image not found' });

    gallery.splice(idx, 1);
    // persist as JSON array of objects
    t.gallery = gallery;
    await t.save();
    return res.json({ success: true, gallery });
  } catch (err) {
    console.error('tour.deleteImage error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
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
    
    // Map Frontend price fields to Backend
    if (body.discount !== undefined) body.discountPercent = Number(body.discount);
    if (body.finalPrice !== undefined) body.finalPrice = Number(body.finalPrice);
    
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
    // Map Frontend price fields for PATCH
    if (body.discount !== undefined) body.discountPercent = Number(body.discount);
    if (body.finalPrice !== undefined) body.finalPrice = Number(body.finalPrice);
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
    // Map Frontend price fields for PUT
    if (body.discount !== undefined) body.discountPercent = Number(body.discount);
    if (body.finalPrice !== undefined) body.finalPrice = Number(body.finalPrice);
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

module.exports = { create, getById, list, patch, update, publish, remove, deleteImage };
