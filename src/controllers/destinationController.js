const { Op } = require('sequelize');
const Destination = require('../models/destination');
const DestinationImage = require('../models/destinationImage');
const { toAbsoluteUrl } = require('../utils/url');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function errorEnvelope(code, message, details) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

function validateDestination(body, isCreate = true) {
  const errors = [];
  const { name, countryCode, description, article, countryName, highlights } = body;

  if (isCreate) {
    if (!name || !name.trim()) errors.push({ field: 'name', message: 'Required' });
    if (!countryCode || !countryCode.trim()) errors.push({ field: 'countryCode', message: 'Required' });
  }

  if (name && (name.length < 2 || name.length > 100))
    errors.push({ field: 'name', message: '2-100 chars' });

  if (countryCode && (countryCode.length < 2 || countryCode.length > 3))
    errors.push({ field: 'countryCode', message: '2-3 chars' });

  if (description && description.length > 2000)
    errors.push({ field: 'description', message: 'max 2000' });

  if (article && article.length > 20000)
    errors.push({ field: 'article', message: 'max 20000' });

  if (countryName && (countryName.length < 2 || countryName.length > 100))
    errors.push({ field: 'countryName', message: '2-100 chars' });

  if (highlights && Array.isArray(highlights) && highlights.length > 10)
    errors.push({ field: 'highlights', message: 'max 10 items' });

  if (errors.length) return errorEnvelope('VALIDATION_ERROR', 'Validation failed', errors);
  return null;
}

// Sanitize sort parameter
function sanitizeSort(raw) {
  const def = { field: 'createdAt', dir: 'DESC' };
  if (!raw) return def;

  const [f, d] = String(raw).split(':');
  const allowed = ['createdAt', 'updatedAt', 'name', 'countryCode'];
  const field = allowed.includes(f) ? f : def.field;
  const dir = (d || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  return { field, dir };
}

function normalizeHighlightsInput(raw) {
  if (!raw) return [];
  let arr = [];

  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {}
  }

  return arr
    .filter(v => typeof v === 'string')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map(s => s.slice(0, 120));
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

    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
    } catch {
      await fs.promises.writeFile(filePath, buffer);
    }

    return `/uploads/${hash}`;
  } catch {
    return '';
  }
}

async function normalizeIncomingImages(images) {
  if (!Array.isArray(images)) return [];

  const out = [];

  for (let i = 0; i < images.length && out.length < 5; i++) {
    const img = images[i];
    const url = typeof img === 'string' ? img : (img && (img.url || img.src));
    if (!url) continue;

    let finalUrl = url;

    if (url.startsWith('data:image')) {
      const saved = await persistDataUrl(url);
      if (!saved) continue;
      finalUrl = saved;
    } else if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
      const id = path.basename(url).split('.')[0];
      finalUrl = `/uploads/${id}`;
    }

    out.push({
      ...(typeof img === 'object' && !Array.isArray(img) ? img : {}),
      url: finalUrl,
      sortOrder: img.sortOrder ?? i,
    });
  }

  return out;
}

//
// ------------------ CREATE ------------------
//
exports.createDestination = async (req, res) => {
  const err = validateDestination(req.body, true);
  if (err) return res.status(400).json(err);

  const t = await Destination.sequelize.transaction();

  try {
    const { name, description, article, countryCode, countryName, highlights = [], images = [] } = req.body;

    const dup = await Destination.findOne({
      where: { name, countryCode },
      transaction: t
    });

    if (dup) {
      await t.rollback();
      return res.status(409).json(errorEnvelope('DUPLICATE', 'Destination name already exists in this country'));
    }

    const normHighlights = normalizeHighlightsInput(highlights);

    const dest = await Destination.create(
      { name, description, article, countryCode, countryName, highlights: normHighlights },
      { transaction: t }
    );

    if (Array.isArray(images) && images.length) {
      const normalized = await normalizeIncomingImages(images);

      const imgs = normalized.slice(0, 5).map((img, i) => ({
        destinationId: dest.id,
        url: img.url,
        alt: img.alt || '',
        sortOrder: img.sortOrder ?? i
      }));

      if (imgs.length) {
        await DestinationImage.bulkCreate(imgs, { transaction: t });
      }
    }

    await t.commit();

    let withImages = await Destination.findByPk(dest.id, {
      include: [{ model: DestinationImage, as: 'images' }],
      order: [[{ model: DestinationImage, as: 'images' }, 'sortOrder', 'ASC']]
    });

    withImages = transformDestination(withImages, req);
    return res.status(201).json({ destination: withImages });
  } catch (e) {
    if (t.finished !== 'commit') await t.rollback();

    if (e && e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(errorEnvelope('DUPLICATE', 'Destination name already exists in this country'));
    }

    return res.status(500).json(errorEnvelope('SERVER_ERROR', 'Failed to create destination'));
  }
};

//
// ------------------ FIXED LIST (IMPORTANT) ------------------
//
exports.listDestinations = async (req, res) => {
  const { page = '1', pageSize = '8', q, country, status = 'active', sort = 'createdAt:desc' } = req.query;

  const where = {};

  if (q) {
    where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { description: { [Op.like]: `%${q}%` } }
    ];
  }

  if (country) where.countryCode = country;

  const paranoid = status !== 'deleted';
  const { field: sortField, dir: sortDir } = sanitizeSort(sort);

  const limit = Math.min(parseInt(pageSize, 10) || 8, 100);
  const pageNum = parseInt(page, 10) || 1;
  const offset = (pageNum - 1) * limit;

  const { rows, count } = await Destination.findAndCountAll({
    where,
    include: [{ model: DestinationImage, as: 'images' }],
    limit,
    offset,
    paranoid,
    order: [[sortField, sortDir]],
    distinct: true
    // ❌ subQuery: false  → เอาออก ไม่งั้น count เพี้ยน
  });

  console.log("rows:", rows.length, "count:", count);

  const data = rows.map(r => transformDestination(r, req));

  res.json({
    data,
    meta: {
      page: pageNum,
      pageSize: limit,
      total: count,
      totalPages: Math.ceil(count / limit),
      sort: `${sortField}:${sortDir.toLowerCase()}`
    }
  });
};

//
// ------------------ GET ONE ------------------
//
exports.getDestination = async (req, res) => {
  let dest = await Destination.findByPk(req.params.id, {
    include: [{ model: DestinationImage, as: 'images' }],
    paranoid: false,
    order: [[{ model: DestinationImage, as: 'images' }, 'sortOrder', 'ASC']]
  });

  if (!dest)
    return res.status(404).json(errorEnvelope('NOT_FOUND', 'Destination not found'));

  dest = transformDestination(dest, req);
  res.json({ destination: dest });
};

//
// ------------------ UPDATE ------------------
//
exports.updateDestination = async (req, res) => {
  const id = req.params.id;

  const err = validateDestination(req.body, false);
  if (err) return res.status(400).json(err);

  const existing = await Destination.findByPk(id, {
    include: [{ model: DestinationImage, as: 'images' }]
  });

  if (!existing)
    return res.status(404).json(errorEnvelope('NOT_FOUND', 'Destination not found'));

  const t = await Destination.sequelize.transaction();

  try {
    const { name, description, article, countryCode, countryName, highlights, images } = req.body;

    const patch = {};

    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description;
    if (article !== undefined) patch.article = article;
    if (countryCode !== undefined) patch.countryCode = countryCode;
    if (countryName !== undefined) patch.countryName = countryName;
    if (highlights !== undefined) patch.highlights = normalizeHighlightsInput(highlights);

    if (Object.keys(patch).length)
      await existing.update(patch, { transaction: t });

    if (Array.isArray(images)) {
      const normalized = await normalizeIncomingImages(images);

      const keepIds = normalized.filter(i => i.id).map(i => i.id);

      await DestinationImage.destroy({
        where: {
          destinationId: id,
          ...(keepIds.length ? { id: { [Op.notIn]: keepIds } } : {})
        },
        transaction: t
      });

      for (let i = 0; i < normalized.length; i++) {
        const img = normalized[i];

        if (img.id) {
          await DestinationImage.update(
            { url: img.url, alt: img.alt || '', sortOrder: img.sortOrder ?? i },
            { where: { id: img.id, destinationId: id }, transaction: t }
          );
        } else {
          await DestinationImage.create(
            { destinationId: Number(id), url: img.url, alt: img.alt || '', sortOrder: img.sortOrder ?? i },
            { transaction: t }
          );
        }
      }
    }

    await t.commit();

    let withImages = await Destination.findByPk(id, {
      include: [{ model: DestinationImage, as: 'images' }],
      order: [[{ model: DestinationImage, as: 'images' }, 'sortOrder', 'ASC']]
    });

    withImages = transformDestination(withImages, req);
    return res.json({ destination: withImages });
  } catch (e) {
    if (t.finished !== 'commit') await t.rollback();
    return res.status(500).json(errorEnvelope('SERVER_ERROR', 'Failed to update destination'));
  }
};

//
// ------------------ DELETE ------------------
//
exports.deleteDestination = async (req, res) => {
  const hard = String(req.query.hard || 'false') === 'true';

  const dest = await Destination.findByPk(req.params.id, {
    paranoid: !hard
  });

  if (!dest)
    return res.status(200).json({ id: Number(req.params.id), status: 'deleted' });

  if (hard)
    await dest.destroy({ force: true });
  else
    await dest.destroy();

  res.json({ id: dest.id, status: 'deleted' });
};

//
// ------------------ RESTORE ------------------
//
exports.restoreDestination = async (req, res) => {
  const id = req.params.id;

  const dest = await Destination.findByPk(id, { paranoid: false });

  if (!dest || !dest.deletedAt)
    return res.status(404).json(errorEnvelope('NOT_FOUND', 'Destination is not deleted or not found'));

  await dest.restore();
  res.json({ id: dest.id, status: 'active' });
};

//
// ------------------ ADD IMAGE ------------------
//
exports.addImages = async (req, res) => {
  const id = Number(req.params.id);

  const dest = await Destination.findByPk(id);
  if (!dest) return res.status(404).json(errorEnvelope('NOT_FOUND', 'Destination not found'));

  const files = req.files || [];
  let jsonImages = [];

  if (Array.isArray(req.body.images)) {
    jsonImages = req.body.images;
  } else if (typeof req.body.images === 'string' && req.body.images.trim()) {
    try {
      const parsed = JSON.parse(req.body.images);
      if (Array.isArray(parsed)) jsonImages = parsed;
    } catch {}
  }

  const combined = [];
  for (let i = 0; i < files.length; i++)
    combined.push({ url: `/uploads/${files[i].filename}`, sortOrder: i });

  for (let i = 0; i < jsonImages.length; i++)
    combined.push({ url: jsonImages[i].url, alt: jsonImages[i].alt, sortOrder: jsonImages[i].sortOrder ?? (files.length + i) });

  const normalized = await normalizeIncomingImages(combined);

  const existingCount = await DestinationImage.count({
    where: { destinationId: id }
  });

  const remaining = Math.max(0, 5 - existingCount);

  const toCreate = normalized.slice(0, remaining).map((img, i) => ({
    destinationId: id,
    url: img.url,
    alt: img.alt || '',
    sortOrder: img.sortOrder ?? (existingCount + i)
  }));

  const created = await DestinationImage.bulkCreate(toCreate);
  const abs = created.map(img => ({
    ...img.toJSON(),
    url: toAbsoluteUrl(img.url, req)
  }));

  return res.status(201).json({ images: abs });
};

//
// ------------------ DELETE IMAGE ------------------
//
exports.deleteImage = async (req, res) => {
  const { id, imageId } = req.params;

  const img = await DestinationImage.findOne({
    where: { id: imageId, destinationId: id }
  });

  if (!img)
    return res.status(200).json({ ok: true });

  await img.destroy();
  res.json({ ok: true });
};

//
// ------------------ TRANSFORM ------------------
//
function transformDestination(modelInstance, req) {
  if (!modelInstance) return modelInstance;

  const json = modelInstance.toJSON ? modelInstance.toJSON() : modelInstance;

  if (json.highlights && typeof json.highlights === 'string') {
    try {
      json.highlights = JSON.parse(json.highlights);
    } catch {}
  }

  if (!Array.isArray(json.highlights))
    json.highlights = [];

  json.images = (json.images || [])
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(img => ({ ...img, url: toAbsoluteUrl(img.url, req) }));

  json.coverImage = json.images[0] ? json.images[0].url : null;

  return json;
}
