require('dotenv').config();
const { Sequelize } = require('sequelize');

// Try direct connection string format - URL encode @ symbol as %40
const connectionString = `postgresql://postgres:Supabase2024@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`;

console.log('Testing with connection string...');

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ Connected successfully to Supabase PostgreSQL');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
