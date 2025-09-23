const { Sequelize } = require('sequelize');
const config = require('./config');

// Use fast, in-memory SQLite during tests to avoid external DB dependency
let sequelize;
if (process.env.NODE_ENV === 'test') {
  sequelize = new Sequelize('sqlite::memory:', { logging: false });
} else {
  sequelize = new Sequelize(
    config.db.database,
    config.db.username,
    config.db.password,
    {
      host: config.db.host,
      dialect: config.db.dialect,
      logging: false,
    }
  );
}

module.exports = sequelize;
