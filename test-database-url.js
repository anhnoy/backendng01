require('dotenv').config();
const { Sequelize } = require('sequelize');

const databaseUrl = process.env.DATABASE_URL;

console.log('Testing with DATABASE_URL...');
console.log('URL (masked):', databaseUrl.replace(/:[^:@]+@/, ':****@'));

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ Connected successfully to Supabase PostgreSQL');
    return sequelize.query('SELECT version()');
  })
  .then(([results]) => {
    console.log('PostgreSQL version:', results[0].version);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    console.error('Error code:', err.code);
    process.exit(1);
  });
