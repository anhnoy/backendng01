const Accommodation = require('../models/accommodation');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Helpers to normalize images array
function toImageString(img) {
  if (typeof img === 'string') return img;
  if (img && typeof img === 'object') {
    const o = img;
    const cands = [o.url, o.src, o.path, o.preview, o.dataUrl, o.dataURI];
    const first = cands.find((v) => typeof v === 'string');
    if (first) return first;
  }
  return '';
}

async function persistDataUrl(dataUrl) {
  try {
    // data:[mime];base64,<data>
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
    // Write only if not exist
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
    } catch {
      await fs.promises.writeFile(filePath, buffer);
    }
    // Store extensionless path to match legacy style, server resolves extension
    return `/uploads/${hash}`;
  } catch (e) {
    return '';
  }
}

async function normalizeAndPersistImages(images) {
  if (!Array.isArray(images)) return [];
  const out = [];
  for (const raw of images) {
    if (out.length >= 5) break;
    const s = toImageString(raw);
    if (!s) continue;
    if (s.startsWith('data:image')) {
      const saved = await persistDataUrl(s);
      if (saved) out.push(saved);
      continue;
    }
    if (s.startsWith('/uploads/')) {
      // If has extension, strip it to be extensionless
      const id = path.basename(s).split('.')[0];
      out.push(`/uploads/${id}`);
      continue;
    }
    if (s.startsWith('uploads/')) {
      const id = path.basename(s).split('.')[0];
      out.push(`/uploads/${id}`);
      continue;
    }
    // Allow external URLs as-is
    out.push(s);
  }
  return out;
}

exports.list = async (req, res) => {
  try {
    const where = {};
    if (req.query.country) where.country = req.query.country;
    const rows = await Accommodation.findAll({ where, order: [['id', 'DESC']] });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch accommodations' });
  }
};

exports.get = async (req, res) => {
  try {
    const row = await Accommodation.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch accommodation' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, country, type, latitude, longitude, images } = req.body || {};
    if (!name || !country || !type) {
      return res.status(400).json({ message: 'name, country, and type are required' });
    }
    const imgs = await normalizeAndPersistImages(images);
    const created = await Accommodation.create({ name, country, type, latitude, longitude, images: imgs });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ message: 'Failed to create accommodation' });
  }
};

exports.update = async (req, res) => {
  try {
    const row = await Accommodation.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
  const { name, country, type, latitude, longitude, images } = req.body || {};
  if (images) row.images = await normalizeAndPersistImages(images);
    if (name !== undefined) row.name = name;
    if (country !== undefined) row.country = country;
    if (type !== undefined) row.type = type;
    if (latitude !== undefined) row.latitude = latitude;
    if (longitude !== undefined) row.longitude = longitude;
    await row.save();
    res.json(row);
  } catch (e) {
    res.status(500).json({ message: 'Failed to update accommodation' });
  }
};

exports.remove = async (req, res) => {
  try {
    const row = await Accommodation.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    await row.destroy();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete accommodation' });
  }
};
