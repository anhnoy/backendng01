require('dotenv').config();

module.exports = {
  db: {
    database: process.env.DB_NAME || 'nguide2',
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    dialect: 'mysql',
  },
  jwtSecret: process.env.JWT_SECRET,
};
