require('dotenv').config();
const { Sequelize } = require('sequelize');

const password = encodeURIComponent(process.env.DB_PASS);
console.log('Original password:', process.env.DB_PASS);
console.log('Encoded password:', password);

const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: console.log
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ Connected successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection error:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  });
