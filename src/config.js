const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: '.env.test' });
} else {
  require('dotenv').config();
}
console.log('LOOKING FOR CA AT:', path.join(__dirname, '..', 'ca.pem'));
console.log('FILE EXISTS:', fs.existsSync(path.join(__dirname, '..', 'ca.pem')));

module.exports = {
  db: {
    database: process.env.DB_NAME || 'nguide2',
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
 dialectOptions: {
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, '..', 'ca.pem')),
    rejectUnauthorized: false
  }
}


  },
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
};
