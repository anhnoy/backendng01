// Run with: node scripts/migrateGalleryToObjects.js
const sequelize = require('../src/sequelize');
const Tour = require('../src/models/tour');

function generateImageId(url) {
  try {
    if (!url) return Math.random().toString(36).slice(2, 10);
    const base = String(url).split('/').pop().split('.')[0];
    if (base) return base;
    return require('crypto').createHash('md5').update(String(url)).digest('hex').slice(0,16);
  } catch (e) {
    return Math.random().toString(36).slice(2,10);
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

(async function main() {
  await sequelize.authenticate();
  console.log('DB connected');
  const tours = await Tour.findAll({ attributes: ['id','gallery'] });
  console.log('Found', tours.length, 'tours');
  let updated = 0;
  for (const t of tours) {
    const g = t.gallery;
    const normalized = normalizeGallery(g);
    // if normalized is same as current objects, skip
    const needUpdate = JSON.stringify(normalized) !== JSON.stringify(g);
    if (needUpdate) {
      t.gallery = normalized;
      await t.save();
      updated++;
      console.log('Updated tour', t.id);
    }
  }
  console.log('Done. Updated', updated, 'tours.');
  process.exit(0);
})();
