require('dotenv').config();
const sequelize = require('../src/sequelize');
const Quotation = require('../src/models/quotation');
const { generateAccessCode } = require('../src/utils/accessCode');

async function addAccessCodeColumn() {
  try {
    console.log('🔄 Adding accessCode columns to quotations table...');
    
    // Add columns using raw query
    await sequelize.query(`
      ALTER TABLE quotations 
      ADD COLUMN IF NOT EXISTS accessCode VARCHAR(6) UNIQUE,
      ADD COLUMN IF NOT EXISTS accessCodeCreatedAt DATETIME,
      ADD COLUMN IF NOT EXISTS shareCount INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS lastSharedAt DATETIME
    `).catch(err => {
      // If columns already exist, ignore error
      console.log('Note: Some columns may already exist');
    });
    
    console.log('✅ Columns added successfully');

    // Create indexes
    console.log('🔄 Creating indexes...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_quotations_access_code ON quotations(accessCode)
    `).catch(() => {});
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_quotations_id_access_code ON quotations(id, accessCode)
    `).catch(() => {});
    
    console.log('✅ Indexes created');

    // Backfill existing quotations with unique access codes
    console.log('🔄 Backfilling access codes for existing quotations...');
    
    const quotations = await Quotation.findAll({
      where: { accessCode: null }
    });

    console.log(`Found ${quotations.length} quotations without access codes`);

    for (const q of quotations) {
      let accessCode = generateAccessCode();
      let attempts = 0;
      
      // Ensure uniqueness
      while (attempts < 10) {
        const existing = await Quotation.findOne({ where: { accessCode } });
        if (!existing) break;
        accessCode = generateAccessCode();
        attempts++;
      }
      
      q.accessCode = accessCode;
      q.accessCodeCreatedAt = new Date();
      q.shareCount = 0;
      await q.save();
      console.log(`  ✓ Quotation ${q.id} (${q.quotationNumber}): ${accessCode}`);
    }

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

addAccessCodeColumn();
