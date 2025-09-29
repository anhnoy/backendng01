const Food = require('../models/food');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Op, fn, col } = require('sequelize');
const { toAbsoluteUrl } = require('../utils/url');
const { sendError } = require('../utils/errors');

function validateFood({ name, country }) {
  if (!name) return 'name is required';
  if (!country) return 'country is required';
  return null;
}

function toImageString(img) {
  if (typeof img === 'string') return img;
  if (img && typeof img === 'object') {
    const cands = [img.url, img.src, img.path, img.preview, img.dataUrl, img.dataURI];
    return cands.find(v => typeof v === 'string');
  }
  return '';
}

async function persistDataUrl(dataUrl) {
  try {
    const match = dataUrl.match(/^data:(image\/(png|jpe?g|gif|webp));base64,(.+)$/i);
    if (!match) return '';
    const mime = match[1];
    const ext = mime.endsWith('jpeg') || mime.endsWith('jpg') ? 'jpg' : mime.split('/')[1];
    const base64 = match[3];
    const buffer = Buffer.from(base64, 'base64');
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, `${hash}.${ext}`);
    try { await fs.promises.access(filePath, fs.constants.F_OK); } catch { await fs.promises.writeFile(filePath, buffer); }
    return `/uploads/${hash}`; // extensionless
  } catch { return ''; }
}

async function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  const out = [];
  for (const raw of images) {
    if (out.length >= 5) break;
    const s = toImageString(raw);
    if (!s) continue;
    if (s.startsWith('data:image')) { const saved = await persistDataUrl(s); if (saved) out.push(saved); continue; }
    if (s.startsWith('/uploads/')) { const id = path.basename(s).split('.')[0]; out.push(`/uploads/${id}`); continue; }
    if (s.startsWith('uploads/')) { const id = path.basename(s).split('.')[0]; out.push(`/uploads/${id}`); continue; }
    out.push(s); // external
  }
  return out;
}

function transformFood(row, req) {
  if (!row) return row;
  const images = Array.isArray(row.images) ? row.images : [];
  const imagesAbsolute = images.map(i => toAbsoluteUrl(i, req));
  const coverImage = imagesAbsolute[0] || null;
  // add convenient alias `image` for FE (same as coverImage)
  return { ...row.toJSON(), images, imagesAbsolute, coverImage, image: coverImage };
}

exports.list = async (req, res) => {
  try {
    const { country, category, search, popular } = req.query;
    // Optional pagination and sorting
    let { page, pageSize, sort, order } = req.query;

    const where = {};
    const isAll = (v) => {
      if (v == null) return false;
      const s = String(v).trim().toLowerCase();
      return s === 'all' || s === 'ทั้งหมด';
    };
    if (country && !isAll(country)) where.country = country;
    if (category && !isAll(category)) where.category = category;
    if (popular === 'true') where.isPopular = true;
    if (search) where.name = { [Op.like]: `%${search}%` };

    // Sorting: whitelist columns; default to id DESC (existing behavior)
    const allowedSort = new Set(['id', 'name', 'price', 'createdAt']);
    const sortKey = allowedSort.has(String(sort)) ? String(sort) : 'id';
    const sortDir = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Pagination: only apply when page or pageSize is provided to keep backward compatibility
    const usePagination = page !== undefined || pageSize !== undefined;
    let limit, offset;
    if (usePagination) {
      const p = Math.max(1, parseInt(page || '1', 10) || 1);
      const ps = Math.min(100, Math.max(1, parseInt(pageSize || '20', 10) || 20));
      limit = ps; offset = (p - 1) * ps;
      const { rows, count } = await Food.findAndCountAll({ where, order: [[sortKey, sortDir]], limit, offset });
      const transformed = rows.map(r => transformFood(r, req));
      const totalPages = Math.max(1, Math.ceil(count / ps));
      res.set({
        'X-Total-Count': String(count),
        'X-Page': String(p),
        'X-Page-Size': String(ps),
        'X-Total-Pages': String(totalPages)
      });
      return res.json(transformed);
    }

    // No pagination: return all (previous behavior), with default ordering id DESC (or chosen sort if provided)
    const rows = await Food.findAll({ where, order: [[sortKey, sortDir]] });
    return res.json(rows.map(r => transformFood(r, req)));
  } catch (e) {
    sendError(res, 500, 'Failed to list foods');
  }
};

exports.get = async (req, res) => {
  try {
    const row = await Food.findByPk(req.params.id);
    if (!row) return sendError(res, 404, 'Not found');
    res.json(transformFood(row, req));
  } catch (e) { sendError(res, 500, 'Failed to fetch food'); }
};

exports.create = async (req, res) => {
  try {
    const { name, country, description, category, images, tags, isPopular, price, currency, unit } = req.body || {};
    const error = validateFood({ name, country });
    if (error) return sendError(res, 400, error);
    const imgs = await normalizeImages(images);
    const created = await Food.create({ 
      name, country, description, category, 
      images: imgs, tags, isPopular: !!isPopular,
      price: price ? parseFloat(price) : null,
      currency: currency || 'THB',
      unit: unit || 'ต่อจาน'
    });
    res.status(201).json(transformFood(created, req));
  } catch (e) { sendError(res, 500, 'Failed to create food'); }
};

exports.update = async (req, res) => {
  try {
    const row = await Food.findByPk(req.params.id);
    if (!row) return sendError(res, 404, 'Not found');
    const { name, country, description, category, images, tags, isPopular, price, currency, unit } = req.body || {};
    if (name !== undefined) row.name = name;
    if (country !== undefined) row.country = country;
    if (description !== undefined) row.description = description;
    if (category !== undefined) row.category = category;
    if (tags !== undefined) row.tags = Array.isArray(tags) ? tags : [];
    if (isPopular !== undefined) row.isPopular = !!isPopular;
    if (price !== undefined) row.price = price ? parseFloat(price) : null;
    if (currency !== undefined) row.currency = currency || 'THB';
    if (unit !== undefined) row.unit = unit || 'ต่อจาน';
    if (images) row.images = await normalizeImages(images);
    await row.save();
    res.json(transformFood(row, req));
  } catch (e) { sendError(res, 500, 'Failed to update food'); }
};

exports.remove = async (req, res) => {
  try {
    const row = await Food.findByPk(req.params.id);
    if (!row) return sendError(res, 404, 'Not found');
    await row.destroy();
    res.json({ message: 'Food deleted' });
  } catch (e) { sendError(res, 500, 'Failed to delete food'); }
};

// List distinct categories (optionally filtered by country)
exports.listCategories = async (req, res) => {
  try {
    const { country } = req.query;
    const where = {};
    const isAll = (v) => {
      if (v == null) return false;
      const s = String(v).trim().toLowerCase();
      return s === 'all' || s === 'ทั้งหมด';
    };
    if (country && !isAll(country)) where.country = country;
    // exclude null/empty categories
    where.category = { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] };
    const rows = await Food.findAll({
      where,
      attributes: ['category', [fn('COUNT', col('id')), 'count']],
      group: ['category'],
      order: [['category', 'ASC']]
    });
    const data = rows.map(r => ({ category: r.get('category'), count: Number(r.get('count')) }));
    return res.json(data);
  } catch (e) {
    return sendError(res, 500, 'Failed to list categories');
  }
};

// List distinct countries (optionally filtered by category)
exports.listCountries = async (req, res) => {
  try {
    const { category, includeNames } = req.query;
    const where = {};
    // exclude null/empty countries
    where.country = { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] };
    const isAll = (v) => {
      if (v == null) return false;
      const s = String(v).trim().toLowerCase();
      return s === 'all' || s === 'ทั้งหมด';
    };
    if (category && !isAll(category)) where.category = category;
    const rows = await Food.findAll({
      where,
      attributes: ['country', [fn('COUNT', col('id')), 'count']],
      group: ['country'],
      order: [['country', 'ASC']]
    });
    let data = rows.map(r => ({ country: r.get('country'), count: Number(r.get('count')) }));
    // Optionally include display names by joining countries table
    if (String(includeNames).toLowerCase() === 'true') {
      try {
        const Country = require('../models/country');
        const codes = data.map(d => d.country);
        const countryRows = await Country.findAll({ where: { code: codes } });
        const nameMap = new Map(countryRows.map(c => [c.code, c.name]));
        data = data.map(d => ({ ...d, name: nameMap.get(d.country) || d.country }));
      } catch (e) {
        // fallback silently if countries model not available
      }
    }
    return res.json(data);
  } catch (e) {
    return sendError(res, 500, 'Failed to list countries');
  }
};
