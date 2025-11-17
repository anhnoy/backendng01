require('dotenv').config();
const Quotation = require('./src/models/quotation');

async function checkQuotation() {
  try {
    const q = await Quotation.findByPk(18);
    
    if (!q) {
      console.log('❌ Quotation ID 18 not found');
      process.exit(1);
    }
    
    console.log('✅ Found Quotation:');
    console.log('ID:', q.id);
    console.log('Quotation Number:', q.quotationNumber);
    console.log('Access Code:', q.accessCode);
    console.log('Access Code Created At:', q.accessCodeCreatedAt);
    console.log('Share Count:', q.shareCount);
    console.log('Customer Name:', q.customerName);
    
    // Test verification manually
    const testCode = '824574';
    console.log('\n🔍 Testing verification:');
    console.log('Expected Code:', q.accessCode);
    console.log('Provided Code:', testCode);
    console.log('Match:', q.accessCode === testCode);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkQuotation();
