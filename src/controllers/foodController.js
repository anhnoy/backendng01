const Food = require('../models/food');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Op } = require('sequelize');
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
  return { ...row.toJSON(), images, imagesAbsolute, coverImage };
}

exports.list = async (req, res) => {
  try {
    const { country, search, popular } = req.query;
    const where = {};
    if (country) where.country = country;
    if (popular === 'true') where.isPopular = true;
    if (search) where.name = { [Op.like]: `%${search}%` };
    const rows = await Food.findAll({ where, order: [['id','DESC']] });
    res.json(rows.map(r => transformFood(r, req)));
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
