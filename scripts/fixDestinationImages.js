#!/usr/bin/env node
/**
 * Migration Script: Convert destination_images.url data URLs -> /uploads/<hash>
 * Safe to re-run (idempotent) because it skips rows already normalized (/uploads/<hash>)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sequelize = require('../src/sequelize');
const DestinationImage = require('../src/models/destinationImage');

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
    try { await fs.promises.access(filePath, fs.constants.F_OK); }
    catch { await fs.promises.writeFile(filePath, buffer); }
    return `/uploads/${hash}`;
  } catch (e) {
    return '';
  }
}

(async () => {
  try {
    console.log('[fixDestinationImages] Starting migration');
    await sequelize.authenticate();
    const rows = await DestinationImage.findAll();
    let converted = 0;
    for (const row of rows) {
      const url = row.url || '';
      if (!url.startsWith('data:image')) continue; // skip non data URL
      const newPath = await persistDataUrl(url);
      if (!newPath) {
        console.warn('[skip] could not persist data url for id=', row.id);
        continue;
      }
      row.url = newPath;
      await row.save();
      converted++;
      console.log(`[updated] id=${row.id} -> ${newPath}`);
    }
    console.log(`[fixDestinationImages] Done. Converted ${converted} record(s).`);
    process.exit(0);
  } catch (e) {
    console.error('[fixDestinationImages] Error', e);
    process.exit(1);
  }
})();
