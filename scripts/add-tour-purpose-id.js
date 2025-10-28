// node scripts/add-tour-purpose-id.js
const sequelize = require('../src/sequelize');
const Tour = require('../src/models/tour');
const TravelPurpose = require('../src/models/travelPurpose');

async function columnExists() {
  const [rows] = await sequelize.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tours' AND COLUMN_NAME = 'purposeId'"
  );
  return rows.length > 0;
}

async function addColumnIfNeeded() {
  const exists = await columnExists();
  if (exists) {
    console.log('⚠️ purposeId column already exists on tours table');
    return false;
  }
  await sequelize.query('ALTER TABLE `tours` ADD COLUMN `purposeId` INT NULL AFTER `attractions`');
  console.log('✅ Added purposeId column to tours table');
  return true;
}

async function backfillPurposeId() {
  const purposes = await TravelPurpose.findAll({ attributes: ['id', 'name'] });
  const map = new Map(purposes.map((p) => [p.name, p.id]));
  const tours = await Tour.findAll({ attributes: ['id', 'purpose', 'purposeId'] });
  let updated = 0;
  for (const tour of tours) {
    if (tour.purposeId) continue;
    const name = tour.purpose ? tour.purpose.trim() : '';
    if (!name) continue;
    const purposeId = map.get(name);
    if (!purposeId) continue;
    tour.purposeId = purposeId;
    await tour.save({ fields: ['purposeId'] });
    updated += 1;
    console.log(`↻ Updated tour ${tour.id} -> purposeId ${purposeId}`);
  }
  console.log(`🎯 Backfill completed. Updated ${updated} tours.`);
}

(async function main() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    await addColumnIfNeeded();
    await backfillPurposeId();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  }
})();
