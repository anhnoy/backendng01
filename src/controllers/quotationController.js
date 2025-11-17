const { Op } = require('sequelize');
const Quotation = require('../models/quotation');
const { computeTotals } = require('../utils/quotationTotals');
const { generateAccessCode, generateQuotationToken, verifyQuotationToken } = require('../utils/accessCode');

// Safely coerce value to array: accepts real arrays or JSON string arrays
function toArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function normalizeCountryCode(country) {
  if (!country) return 'TH';
  const s = String(country).toLowerCase();
  if (['th', 'tha', 'thailand', 'ไทย'].includes(s)) return 'TH';
  if (['la', 'lao', 'laos', 'ลาว'].includes(s)) return 'LA';
  if (['vn', 'vnm', 'vietnam', 'เวียดนาม'].includes(s)) return 'VN';
  return (String(country).toUpperCase().slice(0, 2));
}

function validateBody(body) {
  const required = ['countryCode','dateStart','dateEnd','customerName','customerEmail','customerPhone'];
  const errors = [];
  for (const k of required) if (!body[k]) errors.push(`${k} is required`);
  const ds = new Date(body.dateStart);
  const de = new Date(body.dateEnd);
  if (!(ds instanceof Date) || isNaN(ds)) errors.push('dateStart invalid');
  if (!(de instanceof Date) || isNaN(de)) errors.push('dateEnd invalid');
  if (ds > de) errors.push('dateStart must be before or equal to dateEnd');
  if (Number(body.discountPercent) < 0 || Number(body.discountPercent) > 100) errors.push('discountPercent must be 0..100');
  return errors;
}

// Serialize DB row (flat columns) to FE QuotationDoc shape
function toDoc(row) {
  if (!row) return row;
  const q = typeof row.toJSON === 'function' ? row.toJSON() : row;
  const status = q.status === 'waiting' ? 'writing' : q.status;
  const infantType = q.flightInfantType && q.flightInfantType !== '' ? q.flightInfantType : undefined;
  return {
    id: q.id,
    quotationNumber: q.quotationNumber || '',
    accessCode: q.accessCode || undefined,
    accessCodeCreatedAt: q.accessCodeCreatedAt || undefined,
    shareCount: q.shareCount || 0,
    lastSharedAt: q.lastSharedAt || undefined,
    status,
    countryCode: q.countryCode,
  attractions: toArray(q.attractions),
    purpose: q.purpose || '',
    dateStart: q.dateStart,
    dateEnd: q.dateEnd,
    expiresAt: q.expiresAt || undefined,
    customer: {
      name: q.customerName,
      email: q.customerEmail,
      phone: q.customerPhone,
      callTime: q.customerCallTime || undefined
    },
    travelers: {
      adults: Number(q.adults || 0),
      children: Number(q.children || 0),
      infants: Number(q.infants || 0)
    },
    unitPrices: {
      pricePerAdult: Number(q.pricePerAdult || 0),
      pricePerChild: Number(q.pricePerChild || 0),
      pricePerInfant: Number(q.pricePerInfant || 0)
    },
    accommodation: {
      name: q.accommodation || '',
      roomType: q.roomType || '',
      childRoomType: q.childRoomType || ''
    },
    rooms: {
      adultRooms: Number(q.adultRooms || 0),
      childRooms: Number(q.childRooms || 0),
      adultRoomPrice: Number(q.adultRoomPrice || 0),
      childRoomPrice: Number(q.childRoomPrice || 0)
    },
    flight: {
      included: !!q.flightIncluded,
      adultPrice: Number(q.flightAdultPrice || 0) || undefined,
      childPrice: Number(q.flightChildPrice || 0) || undefined,
      infantType,
      infantSeatPrice: Number(q.flightInfantSeatPrice || 0) || undefined,
      infantLapPrice: Number(q.flightInfantLapPrice || 0) || undefined
    },
    food: {
      mealOptions: toArray(q.mealOptions),
      totals: {
        breakfast: Number(q.breakfastTotal || 0),
        lunch: Number(q.lunchTotal || 0),
        dinner: Number(q.dinnerTotal || 0),
        totalFoodPrice: Number(q.totalFoodPrice || 0)
      }
    },
    // Optional activities block echoed to FE
    activities: q.activities || undefined,
    package: {
      packagePrice: Number(q.packagePrice || 0),
      discountPercent: Number(q.discountPercent || 0),
      additionalCost: Number(q.additionalCost || 0)
    },
    lists: {
      includedItems: toArray(q.includedItems),
      excludedItems: toArray(q.excludedItems)
    },
    // Top-level aliases for convenience (in addition to lists)
    includedItems: toArray(q.includedItems),
    excludedItems: toArray(q.excludedItems),
    additional: q.additional || undefined,
    calculated: {
      travelerTotal: Number(q.travelerTotal || 0),
      roomTotal: Number(q.roomTotal || 0),
      flightTotal: Number(q.flightTotal || 0),
      foodTotal: Number(q.totalFoodPrice || 0),
  activityTotal: Number(q.activityTotal || 0),
      subtotal: Number(q.subtotal || 0),
      discountPercent: Number(q.discountPercent || 0),
      discountAmount: Number(q.discountAmount || 0),
      additionalCost: Number(q.additionalCost || 0),
      grandTotal: Number(q.finalPrice || 0)
    },
    currency: q.currency || 'THB',
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
    createdBy: q.createdBy || undefined,
    updatedBy: q.updatedBy || undefined,
    revision: q.revision || undefined,
    deletedAt: q.deletedAt || null
  };
}

async function create(req, res) {
  try {
    const payload = { ...req.body };
    payload.countryCode = normalizeCountryCode(payload.countryCode || payload.country);

    // Defaults & coercion
    payload.adults = Number(payload.adults || 0);
    payload.children = Number(payload.children || 0);
    payload.infants = Number(payload.infants || 0);
    payload.mealOptions = Array.isArray(payload.mealOptions) ? payload.mealOptions : (payload.mealOptions ? [payload.mealOptions] : []);
    // Accept array or JSON string for included/excluded items
    if (typeof payload.includedItems === 'string') {
      try { payload.includedItems = JSON.parse(payload.includedItems); } catch (_) { payload.includedItems = []; }
    }
    if (typeof payload.excludedItems === 'string') {
      try { payload.excludedItems = JSON.parse(payload.excludedItems); } catch (_) { payload.excludedItems = []; }
    }
    payload.includedItems = Array.isArray(payload.includedItems) ? payload.includedItems : [];
    payload.excludedItems = Array.isArray(payload.excludedItems) ? payload.excludedItems : [];
    payload.attractions = Array.isArray(payload.attractions) ? payload.attractions : [];
    // Activities: allow object or JSON string, and fold total into activityTotal for totals
    if (typeof payload.activities === 'string') {
      try { payload.activities = JSON.parse(payload.activities); } catch(_) { payload.activities = null; }
    }
    if (payload.activities && typeof payload.activities === 'object') {
      const maybeTotal = Number(payload.activities.total);
      if (Number.isFinite(maybeTotal)) payload.activityTotal = maybeTotal;
    }

    // Map nested fields from FE to flat columns
    if (payload.customer && typeof payload.customer === 'object') {
      payload.customerName = payload.customerName || payload.customer.name;
      payload.customerEmail = payload.customerEmail || payload.customer.email;
      payload.customerPhone = payload.customerPhone || payload.customer.phone;
      payload.customerCallTime = payload.customerCallTime || payload.customer.callTime || null;
    }
    if (payload.travelers && typeof payload.travelers === 'object') {
      payload.adults = Number(payload.travelers.adults ?? payload.adults ?? 0);
      payload.children = Number(payload.travelers.children ?? payload.children ?? 0);
      payload.infants = Number(payload.travelers.infants ?? payload.infants ?? 0);
    }
    if (payload.unitPrices && typeof payload.unitPrices === 'object') {
      payload.pricePerAdult = Number(payload.unitPrices.pricePerAdult ?? payload.pricePerAdult ?? 0);
      payload.pricePerChild = Number(payload.unitPrices.pricePerChild ?? payload.pricePerChild ?? 0);
      payload.pricePerInfant = Number(payload.unitPrices.pricePerInfant ?? payload.pricePerInfant ?? 0);
    }
    if (payload.accommodation && typeof payload.accommodation === 'object') {
      const acc = payload.accommodation;
      payload.accommodation = acc.name ?? payload.accommodation;
      payload.roomType = payload.roomType ?? acc.roomType;
      payload.childRoomType = payload.childRoomType ?? acc.childRoomType;
    }
    if (payload.rooms && typeof payload.rooms === 'object') {
      payload.adultRooms = Number(payload.rooms.adultRooms ?? payload.adultRooms ?? 0);
      payload.childRooms = Number(payload.rooms.childRooms ?? payload.childRooms ?? 0);
      payload.adultRoomPrice = Number(payload.rooms.adultRoomPrice ?? payload.adultRoomPrice ?? 0);
      payload.childRoomPrice = Number(payload.rooms.childRoomPrice ?? payload.childRoomPrice ?? 0);
    }
    if (payload.flight && typeof payload.flight === 'object') {
      payload.flightIncluded = !!(payload.flight.included ?? payload.flightIncluded);
      payload.flightAdultPrice = Number(payload.flight.adultPrice ?? payload.flightAdultPrice ?? 0);
      payload.flightChildPrice = Number(payload.flight.childPrice ?? payload.flightChildPrice ?? 0);
      payload.flightInfantType = payload.flight.infantType ?? payload.flightInfantType ?? '';
      payload.flightInfantSeatPrice = Number(payload.flight.infantSeatPrice ?? payload.flightInfantSeatPrice ?? 0);
      payload.flightInfantLapPrice = Number(payload.flight.infantLapPrice ?? payload.flightInfantLapPrice ?? 0);
    }
    if (payload.food && typeof payload.food === 'object') {
      const mo = Array.isArray(payload.food.mealOptions) ? payload.food.mealOptions : payload.mealOptions;
      payload.mealOptions = Array.isArray(mo) ? mo : [];
      if (payload.food.totals) {
        payload.breakfastTotal = Number(payload.food.totals.breakfast ?? payload.breakfastTotal ?? 0);
        payload.lunchTotal = Number(payload.food.totals.lunch ?? payload.lunchTotal ?? 0);
        payload.dinnerTotal = Number(payload.food.totals.dinner ?? payload.dinnerTotal ?? 0);
        payload.totalFoodPrice = Number(payload.food.totals.totalFoodPrice ?? payload.totalFoodPrice ?? 0);
      }
    }
    if (payload.package && typeof payload.package === 'object') {
      payload.packagePrice = Number(payload.package.packagePrice ?? payload.packagePrice ?? 0);
      payload.discountPercent = Number(payload.package.discountPercent ?? payload.discountPercent ?? 0);
      payload.additionalCost = Number(payload.package.additionalCost ?? payload.additionalCost ?? 0);
    }
    if (payload.lists && typeof payload.lists === 'object') {
      let li = payload.lists.includedItems;
      let le = payload.lists.excludedItems;
      if (typeof li === 'string') { try { li = JSON.parse(li); } catch(_) { li = undefined; } }
      if (typeof le === 'string') { try { le = JSON.parse(le); } catch(_) { le = undefined; } }
      payload.includedItems = Array.isArray(li) ? li : (payload.includedItems || []);
      payload.excludedItems = Array.isArray(le) ? le : (payload.excludedItems || []);
    }

    const errors = validateBody({
      ...payload,
      customerName: payload.customerName || payload.customer?.name || payload.name,
      customerEmail: payload.customerEmail || payload.customer?.email || payload.email,
      customerPhone: payload.customerPhone || payload.customer?.phone || payload.phone,
    });
    if (errors.length) return res.status(400).json({ errors });

    // Compute totals
    const totals = computeTotals(payload);

    const created = await Quotation.create({
      ...payload,
      ...totals,
    });

    // Generate unique access code
    let accessCode = generateAccessCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await Quotation.findOne({ where: { accessCode } });
      if (!existing) break;
      accessCode = generateAccessCode();
      attempts++;
    }
    created.accessCode = accessCode;

    // Simple quotation number if empty
    if (!created.quotationNumber) {
      const qNum = `QT-${new Date().getFullYear()}-${String(created.id).padStart(6, '0')}`;
      created.quotationNumber = qNum;
    }
    await created.save();

    return res.status(201).json(toDoc(created));
  } catch (err) {
    console.error('create quotation error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function getById(req, res) {
  try {
    const q = await Quotation.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });
  return res.json(toDoc(q));
  } catch (err) {
    console.error('get quotation error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function list(req, res) {
  try {
    const { status, country, email, phone, dateStart, dateEnd, q } = req.query;
    const where = {};
    if (status) where.status = status;
    if (country) where.countryCode = normalizeCountryCode(country);
    if (email) where.customerEmail = { [Op.like]: `%${email}%` };
    if (phone) where.customerPhone = { [Op.like]: `%${phone}%` };
    if (dateStart && dateEnd) where.createdAt = { [Op.between]: [new Date(dateStart), new Date(dateEnd)] };
    if (q) where[Op.or] = [
      { quotationNumber: { [Op.like]: `%${q}%` } },
      { customerName: { [Op.like]: `%${q}%` } },
      { customerEmail: { [Op.like]: `%${q}%` } },
    ];

  const items = await Quotation.findAll({ where, order: [['createdAt','DESC']] });
  const docs = items.map(toDoc);
  return res.json({ items: docs, total: docs.length });
  } catch (err) {
    console.error('list quotation error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function update(req, res) {
  try {
    const q = await Quotation.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });

    const payload = { ...req.body };
    if (payload.countryCode || payload.country) {
      payload.countryCode = normalizeCountryCode(payload.countryCode || payload.country);
    }
    // Map nested updates to flat columns (same mapping as create)
    if (payload.customer && typeof payload.customer === 'object') {
      payload.customerName = payload.customerName ?? payload.customer.name;
      payload.customerEmail = payload.customerEmail ?? payload.customer.email;
      payload.customerPhone = payload.customerPhone ?? payload.customer.phone;
      payload.customerCallTime = payload.customerCallTime ?? payload.customer.callTime ?? null;
    }
    if (payload.travelers && typeof payload.travelers === 'object') {
      payload.adults = Number(payload.travelers.adults ?? q.adults);
      payload.children = Number(payload.travelers.children ?? q.children);
      payload.infants = Number(payload.travelers.infants ?? q.infants);
    }
    if (payload.unitPrices && typeof payload.unitPrices === 'object') {
      payload.pricePerAdult = Number(payload.unitPrices.pricePerAdult ?? q.pricePerAdult);
      payload.pricePerChild = Number(payload.unitPrices.pricePerChild ?? q.pricePerChild);
      payload.pricePerInfant = Number(payload.unitPrices.pricePerInfant ?? q.pricePerInfant);
    }
    if (payload.accommodation && typeof payload.accommodation === 'object') {
      const acc2 = payload.accommodation;
      payload.accommodation = acc2.name ?? q.accommodation;
      payload.roomType = payload.roomType ?? acc2.roomType ?? q.roomType;
      payload.childRoomType = payload.childRoomType ?? acc2.childRoomType ?? q.childRoomType;
    }
    if (payload.rooms && typeof payload.rooms === 'object') {
      payload.adultRooms = Number(payload.rooms.adultRooms ?? q.adultRooms);
      payload.childRooms = Number(payload.rooms.childRooms ?? q.childRooms);
      payload.adultRoomPrice = Number(payload.rooms.adultRoomPrice ?? q.adultRoomPrice);
      payload.childRoomPrice = Number(payload.rooms.childRoomPrice ?? q.childRoomPrice);
    }
    if (payload.flight && typeof payload.flight === 'object') {
      payload.flightIncluded = !!(payload.flight.included ?? q.flightIncluded);
      payload.flightAdultPrice = Number(payload.flight.adultPrice ?? q.flightAdultPrice);
      payload.flightChildPrice = Number(payload.flight.childPrice ?? q.flightChildPrice);
      payload.flightInfantType = payload.flight.infantType ?? q.flightInfantType;
      payload.flightInfantSeatPrice = Number(payload.flight.infantSeatPrice ?? q.flightInfantSeatPrice);
      payload.flightInfantLapPrice = Number(payload.flight.infantLapPrice ?? q.flightInfantLapPrice);
    }
    if (payload.food && typeof payload.food === 'object') {
      const mo2 = Array.isArray(payload.food.mealOptions) ? payload.food.mealOptions : undefined;
      if (mo2) payload.mealOptions = mo2;
      if (payload.food.totals) {
        payload.breakfastTotal = Number(payload.food.totals.breakfast ?? q.breakfastTotal);
        payload.lunchTotal = Number(payload.food.totals.lunch ?? q.lunchTotal);
        payload.dinnerTotal = Number(payload.food.totals.dinner ?? q.dinnerTotal);
        payload.totalFoodPrice = Number(payload.food.totals.totalFoodPrice ?? q.totalFoodPrice);
      }
    }
    if (typeof payload.activities === 'string') {
      try { payload.activities = JSON.parse(payload.activities); } catch(_) { payload.activities = q.activities; }
    }
    if (payload.activities && typeof payload.activities === 'object' && 'total' in payload.activities) {
      const maybeTotal2 = Number(payload.activities.total);
      if (Number.isFinite(maybeTotal2)) payload.activityTotal = maybeTotal2;
    }
    if (payload.package && typeof payload.package === 'object') {
      payload.packagePrice = Number(payload.package.packagePrice ?? q.packagePrice);
      payload.discountPercent = Number(payload.package.discountPercent ?? q.discountPercent);
      payload.additionalCost = Number(payload.package.additionalCost ?? q.additionalCost);
    }
    if (payload.lists && typeof payload.lists === 'object') {
      let li2 = payload.lists.includedItems;
      let le2 = payload.lists.excludedItems;
      if (typeof li2 === 'string') { try { li2 = JSON.parse(li2); } catch(_) { li2 = undefined; } }
      if (typeof le2 === 'string') { try { le2 = JSON.parse(le2); } catch(_) { le2 = undefined; } }
      payload.includedItems = Array.isArray(li2) ? li2 : q.includedItems;
      payload.excludedItems = Array.isArray(le2) ? le2 : q.excludedItems;
    }
    // Also accept top-level arrays for included/excluded items
    if (Array.isArray(payload.includedItems)) {
      // keep as provided
    } else if (typeof payload.includedItems === 'string') {
      try { const arr = JSON.parse(payload.includedItems); if (Array.isArray(arr)) payload.includedItems = arr; else payload.includedItems = q.includedItems; } catch(_) { payload.includedItems = q.includedItems; }
    } else if ('includedItems' in payload && payload.includedItems == null) {
      payload.includedItems = q.includedItems;
    }
    if (Array.isArray(payload.excludedItems)) {
      // keep as provided
    } else if (typeof payload.excludedItems === 'string') {
      try { const arr = JSON.parse(payload.excludedItems); if (Array.isArray(arr)) payload.excludedItems = arr; else payload.excludedItems = q.excludedItems; } catch(_) { payload.excludedItems = q.excludedItems; }
    } else if ('excludedItems' in payload && payload.excludedItems == null) {
      payload.excludedItems = q.excludedItems;
    }
    // If any pricing fields changed, recompute totals
    const pricingKeys = ['adults','children','infants','pricePerAdult','pricePerChild','pricePerInfant','adultRooms','childRooms','adultRoomPrice','childRoomPrice','flightIncluded','flightAdultPrice','flightChildPrice','flightInfantType','flightInfantSeatPrice','flightInfantLapPrice','totalFoodPrice','packagePrice','discountPercent','additionalCost'];
    const shouldRecompute = pricingKeys.some(k => k in payload);
    if (shouldRecompute) {
      const totals = computeTotals({ ...q.toJSON(), ...payload });
      Object.assign(payload, totals);
    }

  await q.update(payload);
  return res.json(toDoc(q));
  } catch (err) {
    console.error('update quotation error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function remove(req, res) {
  try {
    const q = await Quotation.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });
    await q.destroy();
    return res.status(204).end();
  } catch (err) {
    console.error('delete quotation error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * POST /api/quotations/verify
 * Verify access code and return token
 */
async function verify(req, res) {
  try {
    const { quotationId, accessCode } = req.body;
    
    if (!quotationId || !accessCode) {
      return res.status(400).json({ 
        valid: false, 
        error: 'quotationId and accessCode are required' 
      });
    }

    const q = await Quotation.findByPk(quotationId);
    
    if (!q || q.accessCode !== accessCode) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid quotation ID or access code' 
      });
    }

    const token = generateQuotationToken(q.id, accessCode);
    
    return res.json({ 
      valid: true, 
      token,
      quotation: {
        id: q.id,
        quotationNumber: q.quotationNumber,
        customerName: q.customerName
      }
    });
  } catch (err) {
    console.error('verify quotation error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/quotations/:id/public
 * Get quotation with token authentication (for public access)
 */
async function getByIdPublic(req, res) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyQuotationToken(token);
    
    if (!decoded || decoded.quotationId !== parseInt(req.params.id)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const q = await Quotation.findByPk(req.params.id);
    
    if (!q) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Verify access code matches
    if (q.accessCode !== decoded.accessCode) {
      return res.status(401).json({ error: 'Invalid access credentials' });
    }

    return res.json(toDoc(q));
  } catch (err) {
    console.error('get quotation public error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * POST /api/quotations/:id/generate-access-code
 * Generate or get existing access code (for Admin)
 */
async function generateAccessCodeForQuotation(req, res) {
  try {
    const q = await Quotation.findByPk(req.params.id);
    
    if (!q) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // If already has access code, return existing one
    if (q.accessCode) {
      q.shareCount = (q.shareCount || 0) + 1;
      q.lastSharedAt = new Date();
      await q.save();

      const baseUrl = process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:8080';
      const shareUrl = `${baseUrl}/public/quotation/${q.quotationNumber}`;

      return res.json({
        quotationId: q.id,
        quotationNumber: q.quotationNumber,
        accessCode: q.accessCode,
        shareUrl,
        createdAt: q.accessCodeCreatedAt,
        shareCount: q.shareCount,
        lastSharedAt: q.lastSharedAt,
        expiresAt: null
      });
    }

    // Generate new unique access code
    let accessCode = generateAccessCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await Quotation.findOne({ where: { accessCode } });
      if (!existing) break;
      accessCode = generateAccessCode();
      attempts++;
    }

    if (attempts >= 10) {
      return res.status(500).json({ error: 'Failed to generate unique access code' });
    }

    q.accessCode = accessCode;
    q.accessCodeCreatedAt = new Date();
    q.shareCount = 1;
    q.lastSharedAt = new Date();
    await q.save();

    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:8080';
    const shareUrl = `${baseUrl}/public/quotation/${q.quotationNumber}`;

    return res.json({
      quotationId: q.id,
      quotationNumber: q.quotationNumber,
      accessCode: q.accessCode,
      shareUrl,
      createdAt: q.accessCodeCreatedAt,
      shareCount: q.shareCount,
      lastSharedAt: q.lastSharedAt,
      expiresAt: null
    });
  } catch (err) {
    console.error('generate access code error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { create, getById, list, update, remove, verify, getByIdPublic, generateAccessCodeForQuotation };
