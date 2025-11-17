require('dotenv').config();
const sequelize = require('./src/sequelize');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Successfully connected to Supabase PostgreSQL');
    console.log('Database:', process.env.DB_NAME);
    console.log('Host:', process.env.DB_HOST);
    console.log('Port:', process.env.DB_PORT);
    process.exit(0);
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    process.exit(1);
  }
}

testConnection();
