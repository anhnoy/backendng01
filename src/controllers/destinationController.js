const { Op } = require('sequelize');
const Destination = require('../models/destination');
const DestinationImage = require('../models/destinationImage');
const { toAbsoluteUrl } = require('../utils/url');

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
  if (name && (name.length < 2 || name.length > 100)) errors.push({ field: 'name', message: '2-100 chars' });
  if (countryCode && (countryCode.length < 2 || countryCode.length > 3)) errors.push({ field: 'countryCode', message: '2-3 chars' });
  if (description && description.length > 2000) errors.push({ field: 'description', message: 'max 2000' });
  if (article && article.length > 20000) errors.push({ field: 'article', message: 'max 20000' });
  if (countryName && (countryName.length < 2 || countryName.length > 100)) errors.push({ field: 'countryName', message: '2-100 chars' });
  if (highlights && Array.isArray(highlights) && highlights.length > 10) errors.push({ field: 'highlights', message: 'max 10 items' });
  if (errors.length) return errorEnvelope('VALIDATION_ERROR', 'Validation failed', errors);
  return null;
}

exports.createDestination = async (req, res) => {
  const err = validateDestination(req.body, true);
  if (err) return res.status(400).json(err);
  const t = await Destination.sequelize.transaction();
  try {
    const { name, description, article, countryCode, countryName, highlights = [], images = [] } = req.body;
    // unique per name+countryCode on active records
    const dup = await Destination.findOne({ where: { name, countryCode }, transaction: t });
    if (dup) {
      await t.rollback();
      return res.status(409).json(errorEnvelope('DUPLICATE', 'Destination name already exists in this country'));
    }

    const dest = await Destination.create({ name, description, article, countryCode, countryName, highlights }, { transaction: t });
    if (Array.isArray(images) && images.length) {
      const imgs = images.slice(0, 5).map((img, i) => ({ destinationId: dest.id, url: img.url, alt: img.alt || '', sortOrder: img.sortOrder ?? i }));
      await DestinationImage.bulkCreate(imgs, { transaction: t });
    }
    await t.commit();
  let withImages = await Destination.findByPk(dest.id, { include: [{ model: DestinationImage, as: 'images' }], order: [[{ model: DestinationImage, as: 'images' }, 'sortOrder', 'ASC']] });
  withImages = transformDestination(withImages, req);
  return res.status(201).json({ destination: withImages });
  } catch (e) {
    if (t.finished !== 'commit') await t.rollback();
    // Handle unique constraint errors gracefully
    if (e && e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(errorEnvelope('DUPLICATE', 'Destination name already exists in this country'));
    }
    return res.status(500).json(errorEnvelope('SERVER_ERROR', 'Failed to create destination'));
  }
};

exports.listDestinations = async (req, res) => {
  const { page = '1', pageSize = '12', q, country, status = 'active', sort = 'createdAt:desc' } = req.query;
  const where = {};
  if (q) {
    where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { description: { [Op.like]: `%${q}%` } }
    ];
  }
  if (country) where.countryCode = country;
  const paranoid = status !== 'deleted';
  const [sortField, sortDir] = String(sort).split(':');
  const limit = Math.min(parseInt(pageSize, 10) || 12, 100);
  const offset = ((parseInt(page, 10) || 1) - 1) * limit;
  const { rows, count } = await Destination.findAndCountAll({ where, include: [{ model: DestinationImage, as: 'images' }], limit, offset, paranoid, order: [[sortField || 'createdAt', (sortDir || 'desc').toUpperCase()]] });
  const data = rows.map(r => transformDestination(r, req));
  res.json({ data, meta: { page: Number(page), pageSize: limit, total: count, totalPages: Math.ceil(count / limit), sort } });
};

exports.getDestination = async (req, res) => {
  let dest = await Destination.findByPk(req.params.id, { include: [{ model: DestinationImage, as: 'images' }], paranoid: false, order: [[{ model: DestinationImage, as: 'images' }, 'sortOrder', 'ASC']] });
  if (!dest) return res.status(404).json(errorEnvelope('NOT_FOUND', 'Destination not found'));
  dest = transformDestination(dest, req);
  res.json({ destination: dest });
};

exports.updateDestination = async (req, res) => {
  const id = req.params.id;
  const err = validateDestination(req.body, false);
  if (err) return res.status(400).json(err);
  const dest = await Destination.findByPk(id, { include: [{ model: DestinationImage, as: 'images' }] });
  if (!dest) return res.status(404).json(errorEnvelope('NOT_FOUND', 'Destination not found'));
  const { name, description, article, countryCode, countryName, highlights, images } = req.body;
  await dest.update({ name, description, article, countryCode, countryName, highlights });
  if (Array.isArray(images)) {
    const toKeepIds = images.filter(i => i.id).map(i => i.id);
    await DestinationImage.destroy({ where: { destinationId: id, ...(toKeepIds.length ? { id: { [Op.notIn]: toKeepIds } } : {}) } });
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.id) {
        await DestinationImage.update({ url: img.url, alt: img.alt || '', sortOrder: img.sortOrder ?? i }, { where: { id: img.id, destinationId: id } });
      } else {
        await DestinationImage.create({ destinationId: Number(id), url: img.url, alt: img.alt || '', sortOrder: img.sortOrder ?? i });
      }
    }
  }
  let withImages = await Destination.findByPk(id, { include: [{ model: DestinationImage, as: 'images' }], order: [[{ model: DestinationImage, as: 'images' }, 'sortOrder', 'ASC']] });
  withImages = transformDestination(withImages, req);
  res.json({ destination: withImages });
};

exports.deleteDestination = async (req, res) => {
  const hard = String(req.query.hard || 'false') === 'true';
  const dest = await Destination.findByPk(req.params.id, { paranoid: !hard });
  if (!dest) return res.status(200).json({ id: Number(req.params.id), status: 'deleted' });
  if (hard) await dest.destroy({ force: true }); else await dest.destroy();
  res.json({ id: dest.id, status: 'deleted' });
};

exports.restoreDestination = async (req, res) => {
  const id = req.params.id;
  const dest = await Destination.findByPk(id, { paranoid: false });
  if (!dest || !dest.deletedAt) return res.status(404).json(errorEnvelope('NOT_FOUND', 'Destination is not deleted or not found'));
  await dest.restore();
  res.json({ id: dest.id, status: 'active' });
};

exports.addImages = async (req, res) => {
  const id = Number(req.params.id);
  const dest = await Destination.findByPk(id);
  if (!dest) return res.status(404).json(errorEnvelope('NOT_FOUND', 'Destination not found'));
  const files = req.files || [];
  let jsonImages = [];
  // Support images sent either as an array via JSON part or as a JSON string in multipart form
  if (Array.isArray(req.body.images)) {
    jsonImages = req.body.images;
  } else if (typeof req.body.images === 'string' && req.body.images.trim()) {
    try {
      const parsed = JSON.parse(req.body.images);
      if (Array.isArray(parsed)) jsonImages = parsed; // only accept array
    } catch (e) {
      // ignore parse error and treat as no extra JSON images
    }
  }
  const newImages = [];
  for (let i = 0; i < files.length; i++) newImages.push({ url: `/uploads/${files[i].filename}`, sortOrder: i });
  for (let i = 0; i < jsonImages.length; i++) newImages.push({ url: jsonImages[i].url, alt: jsonImages[i].alt, sortOrder: jsonImages[i].sortOrder ?? i });
  const existingCount = await DestinationImage.count({ where: { destinationId: id } });
  const remaining = Math.max(0, 5 - existingCount);
  const toCreate = newImages.slice(0, remaining).map((img, i) => ({ destinationId: id, url: img.url, alt: img.alt || '', sortOrder: img.sortOrder ?? (existingCount + i) }));
  const created = await DestinationImage.bulkCreate(toCreate);
  const abs = created.map(img => ({ ...img.toJSON(), url: toAbsoluteUrl(img.url, req) }));
  res.status(201).json({ images: abs });
};

exports.deleteImage = async (req, res) => {
  const { id, imageId } = req.params;
  const img = await DestinationImage.findOne({ where: { id: imageId, destinationId: id } });
  if (!img) return res.status(200).json({ ok: true });
  await img.destroy();
  res.json({ ok: true });
};

// Helper to normalize and enrich destination object
function transformDestination(modelInstance, req) {
  if (!modelInstance) return modelInstance;
  const json = modelInstance.toJSON ? modelInstance.toJSON() : modelInstance;
  // normalize highlights if stored as string accidentally
  if (json.highlights && typeof json.highlights === 'string') {
    try { json.highlights = JSON.parse(json.highlights); } catch { /* leave as-is */ }
  }
  if (!Array.isArray(json.highlights)) json.highlights = [];
  json.images = (json.images || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(img => ({ ...img, url: toAbsoluteUrl(img.url, req) }));
  json.coverImage = json.images[0] ? json.images[0].url : null;
  return json;
}
